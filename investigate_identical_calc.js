/**
 * Investigate why calculations aren't identical to MSD
 * Check exact parameters, formula, and edge cases
 */

const fs = require('fs');
const path = require('path');

// Read validation data
const validationDataPath = path.join(__dirname, 'js', 'msd-validation-data.js');
let validationDataContent = fs.readFileSync(validationDataPath, 'utf8');
const validationMatch = validationDataContent.match(/export const MSD_VALIDATION_DATA = ({[\s\S]*});/);
const MSD_VALIDATION_DATA = eval('(' + validationMatch[1] + ')');

// Read training data to get exact parameters
const trainingDataPath = path.join(__dirname, 'js', 'msd-training-data.js');
let trainingDataContent = fs.readFileSync(trainingDataPath, 'utf8');
const trainingMatch = trainingDataContent.match(/export const MSD_TRAINING_DATA = ({[\s\S]*});/);
const MSD_TRAINING_DATA = eval('(' + trainingMatch[1] + ')');

/**
 * Test different inverse 4PL formulas
 */
function fourPLInverse1(y, { top, bottom, midPoint, hillSlope }) {
  // Standard formula: x = EC50 / ((top - bottom) / (y - bottom) - 1)^(1 / hillSlope)
  if (y <= bottom || y >= top) return null;
  const ratio = (top - bottom) / (y - bottom) - 1;
  if (ratio <= 0) return null;
  return midPoint / Math.pow(ratio, 1 / hillSlope);
}

function fourPLInverse2(y, { top, bottom, midPoint, hillSlope }) {
  // Alternative: allow y <= bottom but return small value
  if (y >= top) return null;
  if (y <= bottom) {
    // For signals below bottom, try to calculate anyway
    const ratio = (top - bottom) / (y - bottom) - 1;
    if (ratio <= 0) return 0;
    return midPoint / Math.pow(ratio, 1 / hillSlope);
  }
  const ratio = (top - bottom) / (y - bottom) - 1;
  if (ratio <= 0) return null;
  return midPoint / Math.pow(ratio, 1 / hillSlope);
}

function fourPLInverse3(y, { top, bottom, midPoint, hillSlope }) {
  // Try with exact precision from image
  if (y <= bottom || y >= top) return null;
  const numerator = (top - bottom) / (y - bottom);
  const ratio = numerator - 1;
  if (ratio <= 0) return null;
  const exponent = 1 / hillSlope;
  const denominator = Math.pow(ratio, exponent);
  return midPoint / denominator;
}

// Get E3P4 IL-5 parameters - check both from image and from training data
const imageParams = {
  top: 5371094,
  bottom: 161.4381,
  midPoint: 10834.29,
  hillSlope: 0.988987
};

const trainingParams = {
  top: MSD_TRAINING_DATA.E3_P4["IL-5"].params["Algorithm Parameter: Calc. Top"],
  bottom: MSD_TRAINING_DATA.E3_P4["IL-5"].params["Algorithm Parameter: Calc. Bottom"],
  midPoint: MSD_TRAINING_DATA.E3_P4["IL-5"].params["Algorithm Parameter: Calc. MidPoint"],
  hillSlope: MSD_TRAINING_DATA.E3_P4["IL-5"].params["Algorithm Parameter: Calc. HillSlope"]
};

console.log('='.repeat(120));
console.log('INVESTIGATING IDENTICAL CALCULATIONS');
console.log('='.repeat(120));

console.log('\nParameters from image:');
console.log(`  Top: ${imageParams.top}`);
console.log(`  Bottom: ${imageParams.bottom}`);
console.log(`  MidPoint: ${imageParams.midPoint}`);
console.log(`  HillSlope: ${imageParams.hillSlope}`);

console.log('\nParameters from training data:');
console.log(`  Top: ${trainingParams.top}`);
console.log(`  Bottom: ${trainingParams.bottom}`);
console.log(`  MidPoint: ${trainingParams.midPoint}`);
console.log(`  HillSlope: ${trainingParams.hillSlope}`);

console.log('\nParameter differences:');
console.log(`  Top diff: ${Math.abs(imageParams.top - trainingParams.top)}`);
console.log(`  Bottom diff: ${Math.abs(imageParams.bottom - trainingParams.bottom)}`);
console.log(`  MidPoint diff: ${Math.abs(imageParams.midPoint - trainingParams.midPoint)}`);
console.log(`  HillSlope diff: ${Math.abs(imageParams.hillSlope - trainingParams.hillSlope)}`);

// Test with E3P4 IL-5 validation examples
const validationExamples = MSD_VALIDATION_DATA.E3_P4["IL-5"] || [];

console.log('\n' + '='.repeat(120));
console.log('DETAILED COMPARISON FOR E3P4 IL-5');
console.log('='.repeat(120));

console.log('\nSignal  | Original MSD | Image Params | Training Params | Formula 1 | Formula 2 | Formula 3');
console.log('-'.repeat(120));

let perfectMatches = 0;
let nearMatches = 0;
let failures = 0;

for (const ex of validationExamples) {
  if (ex.signal == null || ex.originalCalculatedConcentration == null || 
      ex.originalCalculatedConcentration === 0) continue;
  
  const orig = ex.originalCalculatedConcentration;
  
  // Try all formulas with image params
  const calc1 = fourPLInverse1(ex.signal, imageParams);
  const calc2 = fourPLInverse2(ex.signal, imageParams);
  const calc3 = fourPLInverse3(ex.signal, imageParams);
  
  // Also try with training params
  const calcTrain = fourPLInverse1(ex.signal, trainingParams);
  
  const diff1 = calc1 != null ? Math.abs(calc1 - orig) / orig * 100 : null;
  const diff2 = calc2 != null ? Math.abs(calc2 - orig) / orig * 100 : null;
  const diff3 = calc3 != null ? Math.abs(calc3 - orig) / orig * 100 : null;
  const diffTrain = calcTrain != null ? Math.abs(calcTrain - orig) / orig * 100 : null;
  
  const isPerfect1 = calc1 != null && Math.abs(calc1 - orig) < 1e-10;
  const isPerfect2 = calc2 != null && Math.abs(calc2 - orig) < 1e-10;
  const isPerfect3 = calc3 != null && Math.abs(calc3 - orig) < 1e-10;
  const isPerfectTrain = calcTrain != null && Math.abs(calcTrain - orig) < 1e-10;
  
  if (isPerfect1 || isPerfect2 || isPerfect3 || isPerfectTrain) perfectMatches++;
  else if (diff1 != null && diff1 < 0.01) nearMatches++;
  else failures++;
  
  console.log(
    `${ex.signal.toString().padEnd(7)} | ${orig.toFixed(6).padEnd(12)} | ` +
    `${calc1 != null ? calc1.toFixed(6).padEnd(12) : 'NULL'.padEnd(12)} | ` +
    `${calcTrain != null ? calcTrain.toFixed(6).padEnd(14) : 'NULL'.padEnd(14)} | ` +
    `${diff1 != null ? diff1.toFixed(6) + '%' : 'N/A'.padEnd(8)} | ` +
    `${diff2 != null ? diff2.toFixed(6) + '%' : 'N/A'.padEnd(8)} | ` +
    `${diff3 != null ? diff3.toFixed(6) + '%' : 'N/A'}`
  );
  
  // If not perfect, show detailed calculation
  if (!isPerfect1 && !isPerfect2 && !isPerfect3 && !isPerfectTrain) {
    console.log(`  → Details for signal ${ex.signal}:`);
    console.log(`     Original: ${orig}`);
    if (calc1 != null) console.log(`     Formula 1: ${calc1} (diff: ${diff1}%)`);
    if (calc2 != null) console.log(`     Formula 2: ${calc2} (diff: ${diff2}%)`);
    if (calc3 != null) console.log(`     Formula 3: ${calc3} (diff: ${diff3}%)`);
    if (calcTrain != null) console.log(`     Training params: ${calcTrain} (diff: ${diffTrain}%)`);
    
    // Show intermediate calculations
    if (ex.signal > imageParams.bottom && ex.signal < imageParams.top) {
      const ratio = (imageParams.top - imageParams.bottom) / (ex.signal - imageParams.bottom) - 1;
      const exponent = 1 / imageParams.hillSlope;
      const denominator = Math.pow(ratio, exponent);
      const result = imageParams.midPoint / denominator;
      console.log(`     Step-by-step: ratio=${ratio.toFixed(10)}, exp=${exponent.toFixed(10)}, denom=${denominator.toFixed(10)}, result=${result.toFixed(10)}`);
    }
  }
}

console.log('\n' + '='.repeat(120));
console.log('SUMMARY');
console.log('='.repeat(120));
console.log(`Perfect matches: ${perfectMatches}`);
console.log(`Near matches (<0.01%): ${nearMatches}`);
console.log(`Failures: ${failures}`);

// Check if parameters need more precision
console.log('\n' + '='.repeat(120));
console.log('CHECKING PARAMETER PRECISION');
console.log('='.repeat(120));

// Try to find exact parameters that give perfect match
console.log('\nTesting if we can find exact parameters that match perfectly...');

// For signals that don't match, try adjusting parameters slightly
const testSignals = validationExamples
  .filter(ex => ex.signal != null && ex.originalCalculatedConcentration != null && ex.originalCalculatedConcentration > 0)
  .slice(0, 5);

console.log('\nTesting parameter sensitivity for first 5 examples:');
for (const ex of testSignals) {
  const orig = ex.originalCalculatedConcentration;
  const calc = fourPLInverse1(ex.signal, imageParams);
  
  if (calc == null) {
    console.log(`Signal ${ex.signal}: OUT OF RANGE`);
    continue;
  }
  
  const diff = Math.abs(calc - orig) / orig * 100;
  console.log(`\nSignal ${ex.signal}:`);
  console.log(`  Original: ${orig}`);
  console.log(`  Calculated: ${calc}`);
  console.log(`  Difference: ${diff}%`);
  
  // Try to solve for what parameter would give exact match
  // From: orig = midPoint / ((top - bottom) / (signal - bottom) - 1)^(1/hillSlope)
  // Rearranging: midPoint = orig * ((top - bottom) / (signal - bottom) - 1)^(1/hillSlope)
  if (ex.signal > imageParams.bottom && ex.signal < imageParams.top) {
    const ratio = (imageParams.top - imageParams.bottom) / (ex.signal - imageParams.bottom) - 1;
    const exponent = 1 / imageParams.hillSlope;
    const denominator = Math.pow(ratio, exponent);
    const requiredMidPoint = orig * denominator;
    console.log(`  Required MidPoint for exact match: ${requiredMidPoint.toFixed(10)}`);
    console.log(`  Current MidPoint: ${imageParams.midPoint}`);
    console.log(`  MidPoint difference: ${Math.abs(requiredMidPoint - imageParams.midPoint)}`);
  }
}

console.log('\n✅ Investigation complete!');

