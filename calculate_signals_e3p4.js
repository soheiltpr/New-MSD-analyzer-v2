/**
 * Calculate concentrations for signals using E3P4 IL-5 parameters from image
 */

const fs = require('fs');
const path = require('path');

// Read validation data to get original calculated concentrations for comparison
const validationDataPath = path.join(__dirname, 'js', 'msd-validation-data.js');
let validationDataContent = fs.readFileSync(validationDataPath, 'utf8');
const validationMatch = validationDataContent.match(/export const MSD_VALIDATION_DATA = ({[\s\S]*});/);
const MSD_VALIDATION_DATA = eval('(' + validationMatch[1] + ')');

function fourPLInverse(y, { top, bottom, midPoint, hillSlope }) {
  if (!isFinite(y) || !isFinite(top) || !isFinite(bottom) ||
      !isFinite(midPoint) || !isFinite(hillSlope)) return NaN;
  if (y <= bottom || y >= top) return 0;
  const ratio = (top - bottom) / (y - bottom) - 1;
  if (ratio <= 0) return 0;
  return midPoint / Math.pow(ratio, 1 / hillSlope);
}

// E3P4 IL-5 parameters from image
const E3P4_IL5_PARAMS = {
  top: 5371094,
  bottom: 161.4381,
  midPoint: 10834.29,
  hillSlope: 0.988987
};

// Signals from the image
const signals = [132, 143, 452, 457, 1299, 1237, 4564, 4486, 18185, 17361, 68551, 67657, 261861, 260724, 902341, 858971];

console.log('='.repeat(120));
console.log('CALCULATING CONCENTRATIONS FOR SIGNALS USING E3P4 IL-5 PARAMETERS');
console.log('Parameters from Plate Analysis Properties image:');
console.log(`  Top: ${E3P4_IL5_PARAMS.top}`);
console.log(`  Bottom: ${E3P4_IL5_PARAMS.bottom}`);
console.log(`  MidPoint: ${E3P4_IL5_PARAMS.midPoint}`);
console.log(`  HillSlope: ${E3P4_IL5_PARAMS.hillSlope}`);
console.log('='.repeat(120));

console.log('\nSignal    | Calculated Concentration | Original MSD (if available) | Difference');
console.log('-'.repeat(120));

// Get original calculated concentrations from validation data for comparison
const validationExamples = MSD_VALIDATION_DATA.E3_P4["IL-5"] || [];
const signalMap = new Map();
for (const ex of validationExamples) {
  if (ex.signal != null && ex.originalCalculatedConcentration != null) {
    signalMap.set(ex.signal, ex.originalCalculatedConcentration);
  }
}

let results = [];

for (const signal of signals) {
  const calculatedConc = fourPLInverse(signal, E3P4_IL5_PARAMS);
  const originalConc = signalMap.get(signal);
  
  let diffInfo = '';
  if (originalConc != null && originalConc > 0) {
    const diffPct = Math.abs(calculatedConc - originalConc) / originalConc * 100;
    diffInfo = `${originalConc.toFixed(6).padEnd(25)} | ${diffPct.toFixed(6)}%`;
  } else {
    diffInfo = 'N/A'.padEnd(25) + ' | N/A';
  }
  
  results.push({
    signal,
    calculatedConc,
    originalConc,
    diffPct: originalConc != null && originalConc > 0 ? 
      Math.abs(calculatedConc - originalConc) / originalConc * 100 : null
  });
  
  console.log(
    `${signal.toString().padEnd(9)} | ${calculatedConc !== null && isFinite(calculatedConc) ? calculatedConc.toFixed(6).padEnd(25) : 'OUT OF RANGE'.padEnd(25)} | ${diffInfo}`
  );
}

console.log('\n' + '='.repeat(120));
console.log('SUMMARY');
console.log('='.repeat(120));

const validResults = results.filter(r => r.calculatedConc !== null && isFinite(r.calculatedConc));
const withOriginal = results.filter(r => r.originalConc != null && r.originalConc > 0);

console.log(`Total signals: ${signals.length}`);
console.log(`Valid calculations: ${validResults.length}`);
console.log(`Signals with original MSD values: ${withOriginal.length}`);

if (withOriginal.length > 0) {
  const maxDiff = Math.max(...withOriginal.map(r => r.diffPct));
  const avgDiff = withOriginal.reduce((sum, r) => sum + r.diffPct, 0) / withOriginal.length;
  console.log(`Max difference: ${maxDiff.toFixed(6)}%`);
  console.log(`Avg difference: ${avgDiff.toFixed(6)}%`);
  console.log(`All within 1%: ${withOriginal.every(r => r.diffPct <= 1) ? '✓ YES' : '✗ NO'}`);
}

// Also check if these match IL-5 standards
console.log('\n' + '='.repeat(120));
console.log('COMPARISON WITH IL-5 STANDARDS');
console.log('='.repeat(120));

const trainingDataPath = path.join(__dirname, 'js', 'msd-training-data.js');
let trainingDataContent = fs.readFileSync(trainingDataPath, 'utf8');
const trainingMatch = trainingDataContent.match(/export const MSD_TRAINING_DATA = ({[\s\S]*});/);
const MSD_TRAINING_DATA = eval('(' + trainingMatch[1] + ')');

const il5Standards = MSD_TRAINING_DATA.E3_P4["IL-5"].standards;
console.log('\nStandard | Expected Conc | Signal Range | Our Calculated');
console.log('-'.repeat(80));

for (const std of il5Standards) {
  if (std.concentration === 0) continue;
  
  const minSignal = Math.min(...std.signals);
  const maxSignal = Math.max(...std.signals);
  
  // Find matching signals from our list
  const matchingSignals = signals.filter(s => s >= minSignal && s <= maxSignal);
  
  if (matchingSignals.length > 0) {
    for (const sig of matchingSignals) {
      const calcConc = fourPLInverse(sig, E3P4_IL5_PARAMS);
      console.log(
        `S${il5Standards.indexOf(std) + 1}      | ${std.concentration.toFixed(4).padEnd(13)} | ${sig.toString().padEnd(12)} | ${calcConc !== null && isFinite(calcConc) ? calcConc.toFixed(6) : 'OUT OF RANGE'}`
      );
    }
  }
}

console.log('\n✅ Calculation complete!');

