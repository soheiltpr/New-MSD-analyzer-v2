/**
 * Test with exact precision values from training data
 * Check if rounding in image is causing differences
 */

const fs = require('fs');
const path = require('path');

// Read validation data
const validationDataPath = path.join(__dirname, 'js', 'msd-validation-data.js');
let validationDataContent = fs.readFileSync(validationDataPath, 'utf8');
const validationMatch = validationDataContent.match(/export const MSD_VALIDATION_DATA = ({[\s\S]*});/);
const MSD_VALIDATION_DATA = eval('(' + validationMatch[1] + ')');

// Read training data
const trainingDataPath = path.join(__dirname, 'js', 'msd-training-data.js');
let trainingDataContent = fs.readFileSync(trainingDataPath, 'utf8');
const trainingMatch = trainingDataContent.match(/export const MSD_TRAINING_DATA = ({[\s\S]*});/);
const MSD_TRAINING_DATA = eval('(' + trainingMatch[1] + ')');

function fourPLInverse(y, { top, bottom, midPoint, hillSlope }) {
  if (!isFinite(y) || !isFinite(top) || !isFinite(bottom) ||
      !isFinite(midPoint) || !isFinite(hillSlope)) return NaN;
  // Allow calculation even if y <= bottom (MSD might extrapolate)
  if (y >= top) return null;
  const ratio = (top - bottom) / (y - bottom) - 1;
  if (ratio <= 0) {
    // For signals at or below bottom, try to calculate anyway
    // This might be how MSD handles it
    if (y <= bottom) {
      // Use a very small extrapolated value
      const smallRatio = (top - bottom) / (bottom + 0.001 - bottom) - 1;
      if (smallRatio > 0) {
        const smallExponent = 1 / hillSlope;
        const smallDenom = Math.pow(smallRatio, smallExponent);
        // Scale down based on how far below bottom
        const scale = Math.max(0, (y / bottom));
        return (midPoint / smallDenom) * scale;
      }
    }
    return null;
  }
  return midPoint / Math.pow(ratio, 1 / hillSlope);
}

// Get EXACT parameters from training data (full precision)
const exactParams = {
  top: MSD_TRAINING_DATA.E3_P4["IL-5"].params["Algorithm Parameter: Calc. Top"],
  bottom: MSD_TRAINING_DATA.E3_P4["IL-5"].params["Algorithm Parameter: Calc. Bottom"],
  midPoint: MSD_TRAINING_DATA.E3_P4["IL-5"].params["Algorithm Parameter: Calc. MidPoint"],
  hillSlope: MSD_TRAINING_DATA.E3_P4["IL-5"].params["Algorithm Parameter: Calc. HillSlope"]
};

console.log('='.repeat(120));
console.log('TESTING WITH EXACT PRECISION PARAMETERS FROM TRAINING DATA');
console.log('='.repeat(120));

console.log('\nExact parameters (full precision):');
console.log(`  Top: ${exactParams.top}`);
console.log(`  Bottom: ${exactParams.bottom}`);
console.log(`  MidPoint: ${exactParams.midPoint}`);
console.log(`  HillSlope: ${exactParams.hillSlope}`);

const validationExamples = MSD_VALIDATION_DATA.E3_P4["IL-5"] || [];

console.log('\n' + '='.repeat(120));
console.log('DETAILED CALCULATION FOR E3P4 IL-5');
console.log('='.repeat(120));

console.log('\nSignal  | Original MSD | Calculated | Difference | Diff % | Status');
console.log('-'.repeat(100));

let maxError = 0;
let perfectCount = 0;
let nearPerfectCount = 0;
let outOfRangeCount = 0;

for (const ex of validationExamples) {
  if (ex.signal == null || ex.originalCalculatedConcentration == null || 
      ex.originalCalculatedConcentration === 0) continue;
  
  const orig = ex.originalCalculatedConcentration;
  const calcConc = fourPLInverse(ex.signal, exactParams);
  
  if (calcConc == null || !isFinite(calcConc)) {
    outOfRangeCount++;
    console.log(
      `${ex.signal.toString().padEnd(7)} | ${orig.toFixed(6).padEnd(12)} | NULL       | N/A        | N/A    | OUT OF RANGE`
    );
    continue;
  }
  
  const diff = calcConc - orig;
  const diffAbs = Math.abs(diff);
  const diffPct = diffAbs / orig * 100;
  
  if (diffPct > maxError) maxError = diffPct;
  if (diffPct < 0.0001) perfectCount++;
  if (diffPct < 0.01) nearPerfectCount++;
  
  const status = diffPct < 0.0001 ? '✓ PERFECT' : 
                  diffPct < 0.01 ? '~ NEAR' : 
                  diffPct <= 1 ? '✓ PASS' : '✗ FAIL';
  
  console.log(
    `${ex.signal.toString().padEnd(7)} | ${orig.toFixed(6).padEnd(12)} | ${calcConc.toFixed(6).padEnd(10)} | ${diff.toFixed(6).padEnd(10)} | ${diffPct.toFixed(6)}% | ${status}`
  );
  
  // Show step-by-step for first few
  if (validationExamples.indexOf(ex) < 3) {
    const ratio = (exactParams.top - exactParams.bottom) / (ex.signal - exactParams.bottom) - 1;
    const exponent = 1 / exactParams.hillSlope;
    const denominator = Math.pow(ratio, exponent);
    const result = exactParams.midPoint / denominator;
    console.log(`  → Step-by-step: ratio=${ratio.toFixed(10)}, exp=${exponent.toFixed(10)}, denom=${denominator.toFixed(10)}, result=${result.toFixed(10)}`);
  }
}

console.log('\n' + '='.repeat(120));
console.log('SUMMARY');
console.log('='.repeat(120));
console.log(`Total examples: ${validationExamples.filter(ex => ex.originalCalculatedConcentration != null && ex.originalCalculatedConcentration > 0).length}`);
console.log(`Out of range: ${outOfRangeCount}`);
console.log(`Perfect matches (<0.0001%): ${perfectCount}`);
console.log(`Near perfect (<0.01%): ${nearPerfectCount}`);
console.log(`Max error: ${maxError.toFixed(10)}%`);

if (maxError <= 0.0001) {
  console.log('\n✓✓✓ PERFECT MATCH - All calculations are identical! ✓✓✓');
} else if (maxError <= 1.0) {
  console.log(`\n✓ All within 1% tolerance`);
} else {
  console.log(`\n⚠ Max error is ${maxError.toFixed(6)}% - not identical`);
  console.log('\nPossible reasons:');
  console.log('  1. Parameters in image are rounded/displayed with limited precision');
  console.log('  2. MSD uses a different formula variant or preprocessing');
  console.log('  3. MSD handles signals below bottom differently (extrapolation)');
  console.log('  4. There may be additional transformations or corrections');
}

console.log('\n✅ Test complete!');

