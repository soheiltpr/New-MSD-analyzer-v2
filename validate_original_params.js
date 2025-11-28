/**
 * Validate original "Calc." parameters from MSD_TRAINING_DATA
 * Check if they give 0% error
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

function fourPLInverse(y, { top, bottom, midPoint, hillSlope }) {
  if (!isFinite(y) || !isFinite(top) || !isFinite(bottom) ||
      !isFinite(midPoint) || !isFinite(hillSlope)) return NaN;
  if (y <= bottom || y >= top) return 0;
  const ratio = (top - bottom) / (y - bottom) - 1;
  if (ratio <= 0) return 0;
  return midPoint / Math.pow(ratio, 1 / hillSlope);
}

function calculateMaxError(params, validationExamples) {
  let maxDiffPct = 0;
  let maxDiffExample = null;
  let allErrors = [];
  
  for (const ex of validationExamples) {
    if (ex.signal == null || ex.originalCalculatedConcentration == null || 
        ex.originalCalculatedConcentration === 0) continue;
    const calcConc = fourPLInverse(ex.signal, params);
    if (!isFinite(calcConc)) continue;
    const diffPct = Math.abs(calcConc - ex.originalCalculatedConcentration) /
                    ex.originalCalculatedConcentration * 100;
    allErrors.push({ ex, diffPct, calcConc });
    if (diffPct > maxDiffPct) {
      maxDiffPct = diffPct;
      maxDiffExample = { ex, diffPct, calcConc };
    }
  }
  
  return { maxDiffPct, maxDiffExample, allErrors };
}

function validateAssay(sheetKey, assayName) {
  const validationExamples = MSD_VALIDATION_DATA[sheetKey][assayName] || [];
  if (validationExamples.length === 0) {
    return null;
  }
  
  // Get original "Calc." parameters
  const params = {
    top: MSD_TRAINING_DATA[sheetKey][assayName].params["Algorithm Parameter: Calc. Top"],
    bottom: MSD_TRAINING_DATA[sheetKey][assayName].params["Algorithm Parameter: Calc. Bottom"],
    midPoint: MSD_TRAINING_DATA[sheetKey][assayName].params["Algorithm Parameter: Calc. MidPoint"],
    hillSlope: MSD_TRAINING_DATA[sheetKey][assayName].params["Algorithm Parameter: Calc. HillSlope"]
  };
  
  const result = calculateMaxError(params, validationExamples);
  
  return {
    sheetKey,
    assayName,
    params,
    maxDiffPct: result.maxDiffPct,
    maxDiffExample: result.maxDiffExample,
    allErrors: result.allErrors,
    count: result.allErrors.length
  };
}

console.log('='.repeat(120));
console.log('VALIDATING ORIGINAL "CALC." PARAMETERS FROM MSD_TRAINING_DATA');
console.log('Checking if they give 0% error');
console.log('='.repeat(120));

const assays = ["GM-CSF", "IFN-γ", "IL-10", "IL-1β", "IL-2", "IL-4", "IL-5", "IL-6", "MCP-1", "TNF-α"];
const sheets = ["E3_P4", "E3_P6"];

let results = [];

for (const sheetKey of sheets) {
  for (const assay of assays) {
    const result = validateAssay(sheetKey, assay);
    if (result) {
      results.push(result);
    }
  }
}

// Sort by error
results.sort((a, b) => a.maxDiffPct - b.maxDiffPct);

console.log('\nSheet  | Assay    | Max Diff % | Status | Details');
console.log('-'.repeat(120));

let totalPassed = 0;
let totalFailed = 0;

for (const result of results) {
  const status = result.maxDiffPct <= 1.0 ? '✓ PASS' : '✗ FAIL';
  if (result.maxDiffPct <= 1.0) totalPassed++;
  else totalFailed++;
  
  let details = '';
  if (result.maxDiffPct === 0) {
    details = 'PERFECT MATCH (0.00% error)';
  } else if (result.maxDiffPct <= 0.01) {
    details = 'Near perfect (<0.01%)';
  } else if (result.maxDiffPct <= 1.0) {
    details = `Passes (≤1%)`;
  } else {
    details = `Worst: ${result.maxDiffExample.ex.sample} ${result.maxDiffExample.ex.well} - Signal: ${result.maxDiffExample.ex.signal}, Expected: ${result.maxDiffExample.ex.originalCalculatedConcentration.toFixed(6)}, Got: ${result.maxDiffExample.calcConc.toFixed(6)}`;
  }
  
  console.log(
    `${result.sheetKey.padEnd(6)} | ${result.assayName.padEnd(8)} | ${result.maxDiffPct.toFixed(6).padEnd(10)}% | ${status.padEnd(6)} | ${details}`
  );
}

console.log(`\n${'='.repeat(120)}`);
console.log(`SUMMARY: ${totalPassed}/${results.length} assays pass validation (≤1% error)`);
console.log(`Perfect matches (0% error): ${results.filter(r => r.maxDiffPct === 0).length}`);
console.log('='.repeat(120));

// Detailed report for passing assays
console.log('\n' + '='.repeat(120));
console.log('DETAILED VALIDATION FOR PASSING ASSAYS (≤1% error)');
console.log('='.repeat(120));

for (const result of results.filter(r => r.maxDiffPct <= 1.0)) {
  console.log(`\n${result.sheetKey} - ${result.assayName}:`);
  console.log(`  Parameters:`);
  console.log(`    Top: ${result.params.top}`);
  console.log(`    Bottom: ${result.params.bottom}`);
  console.log(`    MidPoint: ${result.params.midPoint}`);
  console.log(`    HillSlope: ${result.params.hillSlope}`);
  console.log(`  Max Error: ${result.maxDiffPct.toFixed(6)}%`);
  console.log(`  Validation Examples: ${result.count}`);
  
  if (result.maxDiffPct === 0) {
    console.log(`  ✓ PERFECT MATCH - All ${result.count} examples match exactly!`);
  } else {
    // Show worst example
    if (result.maxDiffExample) {
      console.log(`  Worst example:`);
      console.log(`    Sample: ${result.maxDiffExample.ex.sample} ${result.maxDiffExample.ex.well}`);
      console.log(`    Signal: ${result.maxDiffExample.ex.signal}`);
      console.log(`    Expected: ${result.maxDiffExample.ex.originalCalculatedConcentration.toFixed(6)}`);
      console.log(`    Calculated: ${result.maxDiffExample.calcConc.toFixed(6)}`);
      console.log(`    Difference: ${result.maxDiffExample.diffPct.toFixed(6)}%`);
    }
  }
}

// Show first few failing examples
console.log('\n' + '='.repeat(120));
console.log('SAMPLE FAILING EXAMPLES (for reference)');
console.log('='.repeat(120));

const failingResults = results.filter(r => r.maxDiffPct > 1.0).slice(0, 3);
for (const result of failingResults) {
  console.log(`\n${result.sheetKey} - ${result.assayName} (Max Error: ${result.maxDiffPct.toFixed(2)}%):`);
  if (result.maxDiffExample) {
    console.log(`  Worst example: ${result.maxDiffExample.ex.sample} ${result.maxDiffExample.ex.well}`);
    console.log(`    Signal: ${result.maxDiffExample.ex.signal}`);
    console.log(`    Expected: ${result.maxDiffExample.ex.originalCalculatedConcentration.toFixed(6)}`);
    console.log(`    Calculated: ${result.maxDiffExample.calcConc.toFixed(6)}`);
    console.log(`    Difference: ${result.maxDiffExample.diffPct.toFixed(2)}%`);
  }
}

console.log('\n✅ Validation complete!');

