/**
 * Analyze original MSD calculations to understand the formula used
 */

const fs = require('fs');
const path = require('path');

// Read data
const validationDataPath = path.join(__dirname, 'js', 'msd-validation-data.js');
let validationDataContent = fs.readFileSync(validationDataPath, 'utf8');
const validationMatch = validationDataContent.match(/export const MSD_VALIDATION_DATA = ({[\s\S]*});/);
const MSD_VALIDATION_DATA = eval('(' + validationMatch[1] + ')');

const trainingDataPath = path.join(__dirname, 'js', 'msd-training-data.js');
let trainingDataContent = fs.readFileSync(trainingDataPath, 'utf8');
const trainingMatch = trainingDataContent.match(/export const MSD_TRAINING_DATA = ({[\s\S]*});/);
const MSD_TRAINING_DATA = eval('(' + trainingMatch[1] + ')');

// Test different inverse formulas
function testInverse1(y, { top, bottom, midPoint, hillSlope }) {
  if (y <= bottom || y >= top) return null;
  const ratio = (top - bottom) / (y - bottom) - 1;
  if (ratio <= 0) return null;
  return midPoint / Math.pow(ratio, 1 / hillSlope);
}

function testInverse2(y, { top, bottom, midPoint, hillSlope }) {
  if (y <= bottom || y >= top) return null;
  const ratio = (top - bottom) / (y - bottom) - 1;
  if (ratio <= 0) return null;
  return midPoint * Math.pow(ratio, 1 / hillSlope);
}

function testInverse3(y, { top, bottom, midPoint, hillSlope }) {
  if (y <= bottom || y >= top) return null;
  const ratio = (y - bottom) / (top - bottom);
  if (ratio <= 0 || ratio >= 1) return null;
  return midPoint * Math.pow((1 / ratio - 1), 1 / hillSlope);
}

function testInverse4(y, { top, bottom, midPoint, hillSlope }) {
  if (y <= bottom || y >= top) return null;
  const ratio = (y - bottom) / (top - bottom);
  if (ratio <= 0 || ratio >= 1) return null;
  return midPoint / Math.pow((1 / ratio - 1), 1 / hillSlope);
}

console.log('='.repeat(80));
console.log('ANALYZING ORIGINAL MSD CALCULATIONS');
console.log('='.repeat(80));

// Test E3_P4 GM-CSF (which passed with 0% error originally)
const testSheet = "E3_P4";
const testAssay = "GM-CSF";

const params = {
  top: MSD_TRAINING_DATA[testSheet][testAssay].params["Algorithm Parameter: Calc. Top"],
  bottom: MSD_TRAINING_DATA[testSheet][testAssay].params["Algorithm Parameter: Calc. Bottom"],
  midPoint: MSD_TRAINING_DATA[testSheet][testAssay].params["Algorithm Parameter: Calc. MidPoint"],
  hillSlope: MSD_TRAINING_DATA[testSheet][testAssay].params["Algorithm Parameter: Calc. HillSlope"]
};

console.log(`\nTesting ${testSheet} - ${testAssay}`);
console.log(`Parameters: Top=${params.top.toFixed(2)}, Bottom=${params.bottom.toFixed(2)}, MidPoint=${params.midPoint.toFixed(2)}, HillSlope=${params.hillSlope.toFixed(4)}`);

const examples = MSD_VALIDATION_DATA[testSheet][testAssay].filter(ex =>
  ex.signal != null &&
  ex.originalCalculatedConcentration != null &&
  ex.originalCalculatedConcentration !== 0
).slice(0, 5);

console.log('\nTesting different inverse formulas:');
console.log('Signal | Original | Formula 1 | Formula 2 | Formula 3 | Formula 4');
console.log('-'.repeat(80));

for (const ex of examples) {
  const calc1 = testInverse1(ex.signal, params);
  const calc2 = testInverse2(ex.signal, params);
  const calc3 = testInverse3(ex.signal, params);
  const calc4 = testInverse4(ex.signal, params);
  
  const err1 = calc1 ? Math.abs(calc1 - ex.originalCalculatedConcentration) / ex.originalCalculatedConcentration * 100 : Infinity;
  const err2 = calc2 ? Math.abs(calc2 - ex.originalCalculatedConcentration) / ex.originalCalculatedConcentration * 100 : Infinity;
  const err3 = calc3 ? Math.abs(calc3 - ex.originalCalculatedConcentration) / ex.originalCalculatedConcentration * 100 : Infinity;
  const err4 = calc4 ? Math.abs(calc4 - ex.originalCalculatedConcentration) / ex.originalCalculatedConcentration * 100 : Infinity;
  
  console.log(
    `${ex.signal.toFixed(0).padEnd(6)} | ` +
    `${ex.originalCalculatedConcentration.toFixed(4).padEnd(8)} | ` +
    `${calc1 ? calc1.toFixed(4) + ` (${err1.toFixed(2)}%)` : 'N/A'.padEnd(15)} | ` +
    `${calc2 ? calc2.toFixed(4) + ` (${err2.toFixed(2)}%)` : 'N/A'.padEnd(15)} | ` +
    `${calc3 ? calc3.toFixed(4) + ` (${err3.toFixed(2)}%)` : 'N/A'.padEnd(15)} | ` +
    `${calc4 ? calc4.toFixed(4) + ` (${err4.toFixed(2)}%)` : 'N/A'.padEnd(15)}`
  );
}

// Now try to find parameters that work for all
console.log('\n' + '='.repeat(80));
console.log('ATTEMPTING TO FIND PARAMETERS THAT MATCH ALL EXAMPLES');
console.log('='.repeat(80));

// For GM-CSF E3_P4, we know it worked with original params, so let's verify
const allExamples = MSD_VALIDATION_DATA[testSheet][testAssay].filter(ex =>
  ex.signal != null &&
  ex.originalCalculatedConcentration != null &&
  ex.originalCalculatedConcentration !== 0
);

console.log(`\nTesting original parameters on all ${allExamples.length} examples:`);
let matchCount = 0;
for (const ex of allExamples) {
  const calc = testInverse1(ex.signal, params);
  if (calc !== null) {
    const err = Math.abs(calc - ex.originalCalculatedConcentration) / ex.originalCalculatedConcentration * 100;
    if (err <= 1.0) {
      matchCount++;
    }
  }
}
console.log(`Matches (≤1%): ${matchCount}/${allExamples.length}`);

// The issue might be that the original parameters DO work, but my validation is wrong
// Let me check if the issue is with the parameters that already exist

