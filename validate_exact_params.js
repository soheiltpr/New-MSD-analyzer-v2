/**
 * Validate the exact parameters found
 */

const fs = require('fs');
const path = require('path');

// Read validation data
const validationDataPath = path.join(__dirname, 'js', 'msd-validation-data.js');
let validationDataContent = fs.readFileSync(validationDataPath, 'utf8');
const validationMatch = validationDataContent.match(/export const MSD_VALIDATION_DATA = ({[\s\S]*});/);
const MSD_VALIDATION_DATA = eval('(' + validationMatch[1] + ')');

// Read training data to get exact values
const trainingDataPath = path.join(__dirname, 'js', 'msd-training-data.js');
let trainingDataContent = fs.readFileSync(trainingDataPath, 'utf8');
const trainingMatch = trainingDataContent.match(/export const MSD_TRAINING_DATA = ({[\s\S]*});/);
const MSD_TRAINING_DATA = eval('(' + trainingMatch[1] + ')');

function fourPLInverse(y, { top, bottom, midPoint, hillSlope }) {
  if (!isFinite(y) || !isFinite(top) || !isFinite(bottom) ||
      !isFinite(midPoint) || !isFinite(hillSlope)) return NaN;
  if (y >= top) return null;
  // Allow calculation even if y <= bottom
  const ratio = (top - bottom) / (y - bottom) - 1;
  if (ratio <= 0) return 0;
  return midPoint / Math.pow(ratio, 1 / hillSlope);
}

// Parameters from image (might be rounded)
const imageParams = {
  top: 5371094,
  bottom: 161.4381,
  midPoint: 10834.29,
  hillSlope: 0.988987
};

// Exact parameters from training data (after update)
const exactParams = {
  top: MSD_TRAINING_DATA.E3_P4["IL-5"].params["Algorithm Parameter: Calc. Top"],
  bottom: MSD_TRAINING_DATA.E3_P4["IL-5"].params["Algorithm Parameter: Calc. Bottom"],
  midPoint: MSD_TRAINING_DATA.E3_P4["IL-5"].params["Algorithm Parameter: Calc. MidPoint"],
  hillSlope: MSD_TRAINING_DATA.E3_P4["IL-5"].params["Algorithm Parameter: Calc. HillSlope"]
};

// Found parameters from optimization
const foundParams = {
  top: 1037692.1499999999,
  bottom: 80.0800000000,
  midPoint: 1996.0401716085,
  hillSlope: 0.9395376500
};

console.log('='.repeat(120));
console.log('VALIDATING PARAMETERS FOR E3P4 IL-5');
console.log('='.repeat(120));

const validationExamples = MSD_VALIDATION_DATA.E3_P4["IL-5"] || [];

console.log('\nTesting with Image Parameters:');
console.log(`  Top: ${imageParams.top}, Bottom: ${imageParams.bottom}, MidPoint: ${imageParams.midPoint}, HillSlope: ${imageParams.hillSlope}`);

console.log('\nTesting with Exact Parameters from Training Data:');
console.log(`  Top: ${exactParams.top}, Bottom: ${exactParams.bottom}, MidPoint: ${exactParams.midPoint}, HillSlope: ${exactParams.hillSlope}`);

console.log('\nTesting with Found Parameters:');
console.log(`  Top: ${foundParams.top.toFixed(6)}, Bottom: ${foundParams.bottom.toFixed(6)}, MidPoint: ${foundParams.midPoint.toFixed(6)}, HillSlope: ${foundParams.hillSlope.toFixed(6)}`);

console.log('\n' + '='.repeat(120));
console.log('DETAILED COMPARISON');
console.log('='.repeat(120));

console.log('\nSignal  | Original MSD | Image Params | Exact Params | Found Params | Image Diff | Exact Diff | Found Diff');
console.log('-'.repeat(140));

let imageMaxError = 0;
let exactMaxError = 0;
let foundMaxError = 0;
let imagePerfect = 0;
let exactPerfect = 0;
let foundPerfect = 0;

for (const ex of validationExamples) {
  if (ex.signal == null || ex.originalCalculatedConcentration == null || 
      ex.originalCalculatedConcentration === 0) continue;
  
  const orig = ex.originalCalculatedConcentration;
  
  const calcImage = fourPLInverse(ex.signal, imageParams);
  const calcExact = fourPLInverse(ex.signal, exactParams);
  const calcFound = fourPLInverse(ex.signal, foundParams);
  
  const diffImage = calcImage != null ? Math.abs(calcImage - orig) / orig * 100 : null;
  const diffExact = calcExact != null ? Math.abs(calcExact - orig) / orig * 100 : null;
  const diffFound = calcFound != null ? Math.abs(calcFound - orig) / orig * 100 : null;
  
  if (diffImage != null && diffImage > imageMaxError) imageMaxError = diffImage;
  if (diffExact != null && diffExact > exactMaxError) exactMaxError = diffExact;
  if (diffFound != null && diffFound > foundMaxError) foundMaxError = diffFound;
  
  if (diffImage != null && diffImage < 0.0001) imagePerfect++;
  if (diffExact != null && diffExact < 0.0001) exactPerfect++;
  if (diffFound != null && diffFound < 0.0001) foundPerfect++;
  
  console.log(
    `${ex.signal.toString().padEnd(7)} | ${orig.toFixed(6).padEnd(12)} | ` +
    `${calcImage != null ? calcImage.toFixed(6).padEnd(12) : 'NULL'.padEnd(12)} | ` +
    `${calcExact != null ? calcExact.toFixed(6).padEnd(12) : 'NULL'.padEnd(12)} | ` +
    `${calcFound != null ? calcFound.toFixed(6).padEnd(12) : 'NULL'.padEnd(12)} | ` +
    `${diffImage != null ? diffImage.toFixed(6) + '%' : 'N/A'.padEnd(9)} | ` +
    `${diffExact != null ? diffExact.toFixed(6) + '%' : 'N/A'.padEnd(9)} | ` +
    `${diffFound != null ? diffFound.toFixed(6) + '%' : 'N/A'}`
  );
}

console.log('\n' + '='.repeat(120));
console.log('SUMMARY');
console.log('='.repeat(120));
console.log(`Image Parameters: Max error = ${imageMaxError.toFixed(6)}%, Perfect matches = ${imagePerfect}`);
console.log(`Exact Parameters: Max error = ${exactMaxError.toFixed(6)}%, Perfect matches = ${exactPerfect}`);
console.log(`Found Parameters: Max error = ${foundMaxError.toFixed(6)}%, Perfect matches = ${foundPerfect}`);

// Check if exact params from training data match image params
console.log('\n' + '='.repeat(120));
console.log('PARAMETER COMPARISON');
console.log('='.repeat(120));
console.log(`Top difference: ${Math.abs(exactParams.top - imageParams.top)}`);
console.log(`Bottom difference: ${Math.abs(exactParams.bottom - imageParams.bottom)}`);
console.log(`MidPoint difference: ${Math.abs(exactParams.midPoint - imageParams.midPoint)}`);
console.log(`HillSlope difference: ${Math.abs(exactParams.hillSlope - imageParams.hillSlope)}`);

if (Math.abs(exactParams.top - imageParams.top) < 0.01 &&
    Math.abs(exactParams.bottom - imageParams.bottom) < 0.01 &&
    Math.abs(exactParams.midPoint - imageParams.midPoint) < 0.01 &&
    Math.abs(exactParams.hillSlope - imageParams.hillSlope) < 0.0001) {
  console.log('\n✓ Parameters match (within rounding tolerance)');
} else {
  console.log('\n⚠ Parameters differ - image may have rounded values');
}

console.log('\n✅ Validation complete!');

