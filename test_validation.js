/**
 * Test MSD model validation
 */

// Note: This would normally use ES6 imports, but for Node.js testing we'll use require
// In the browser/actual app, use: import { validateMsdModel, getParamsFromTrainingData } from './js/msd-validation.js';
// import { MSD_TRAINING_DATA } from './js/msd-training-data.js';

// For Node.js, we need to use a different approach
const fs = require('fs');
const path = require('path');

// Read the validation data
const validationDataPath = path.join(__dirname, 'js', 'msd-validation-data.js');
const validationDataContent = fs.readFileSync(validationDataPath, 'utf8');
eval(validationDataContent.replace(/export /g, ''));

// Read training data
const trainingDataPath = path.join(__dirname, 'js', 'msd-training-data.js');
const trainingDataContent = fs.readFileSync(trainingDataPath, 'utf8');
eval(trainingDataContent.replace(/export /g, ''));

// Simple inverse 4PL implementation
function fourPLInverse(y, { top, bottom, midPoint, hillSlope }) {
  if (y <= bottom || y >= top) {
    return 0;
  }
  const ratio = (top - bottom) / (y - bottom) - 1;
  if (ratio <= 0) {
    return 0;
  }
  return midPoint / Math.pow(ratio, 1 / hillSlope);
}

// Validation function
function validateMsdModel(sheetKey, assayName, params) {
  const sheet = MSD_VALIDATION_DATA[sheetKey];
  if (!sheet) {
    return { passed: false, maxDiffPct: Infinity, details: [], error: `Sheet ${sheetKey} not found` };
  }

  const examples = sheet[assayName] || [];
  if (examples.length === 0) {
    return { passed: false, maxDiffPct: Infinity, details: [], error: `No data for ${assayName}` };
  }

  let maxDiffPct = 0;
  const details = [];
  let validCount = 0;

  for (const ex of examples) {
    if (
      ex.signal == null ||
      ex.originalCalculatedConcentration == null ||
      ex.originalCalculatedConcentration === 0 ||
      isNaN(ex.signal) ||
      isNaN(ex.originalCalculatedConcentration)
    ) {
      continue;
    }

    const calcConc = fourPLInverse(ex.signal, params);
    if (calcConc === 0 || isNaN(calcConc)) {
      continue;
    }

    const diffPct = Math.abs(calcConc - ex.originalCalculatedConcentration) /
                    ex.originalCalculatedConcentration * 100;

    details.push({
      sample: ex.sample,
      well: ex.well,
      signal: ex.signal,
      originalCalcConc: ex.originalCalculatedConcentration,
      ourCalcConc: calcConc,
      diffPct: diffPct,
      passed: diffPct <= 1
    });

    if (diffPct > maxDiffPct) {
      maxDiffPct = diffPct;
    }
    validCount++;
  }

  const passed = maxDiffPct <= 1;
  return { passed, maxDiffPct, validCount, totalCount: examples.length, details };
}

// Get params from training data
function getParamsFromTrainingData(trainingData) {
  if (!trainingData || !trainingData.params) {
    return null;
  }
  return {
    top: trainingData.params["Algorithm Parameter: Calc. Top"],
    bottom: trainingData.params["Algorithm Parameter: Calc. Bottom"],
    midPoint: trainingData.params["Algorithm Parameter: Calc. MidPoint"],
    hillSlope: trainingData.params["Algorithm Parameter: Calc. HillSlope"]
  };
}

console.log('='.repeat(80));
console.log('MSD MODEL VALIDATION TEST');
console.log('='.repeat(80));

// Test E3_P4 GM-CSF
console.log('\nTesting E3_P4 GM-CSF...');
const e3p4_gmcsf_params = getParamsFromTrainingData(MSD_TRAINING_DATA.E3_P4["GM-CSF"]);
if (e3p4_gmcsf_params) {
  const result = validateMsdModel("E3_P4", "GM-CSF", e3p4_gmcsf_params);
  console.log(`\nResult: ${result.passed ? '✓ PASSED' : '✗ FAILED'}`);
  console.log(`Max difference: ${result.maxDiffPct.toFixed(2)}%`);
  console.log(`Valid comparisons: ${result.validCount}/${result.totalCount}`);
  
  if (result.details.length > 0) {
    console.log('\nFirst 5 comparisons:');
    console.log('Sample | Well | Signal | Original | Our Calc | Diff % | Status');
    console.log('-'.repeat(70));
    result.details.slice(0, 5).forEach(d => {
      const status = d.passed ? '✓' : '✗';
      console.log(
        `${d.sample.padEnd(6)} | ${d.well.padEnd(4)} | ${d.signal.toFixed(0).padEnd(6)} | ` +
        `${d.originalCalcConc.toFixed(4).padEnd(8)} | ${d.ourCalcConc.toFixed(4).padEnd(8)} | ` +
        `${d.diffPct.toFixed(2).padEnd(6)}% | ${status}`
      );
    });
  }
}

// Test E3_P6 IFN-γ
console.log('\n' + '='.repeat(80));
console.log('Testing E3_P6 IFN-γ...');
const e3p6_ifng_params = getParamsFromTrainingData(MSD_TRAINING_DATA.E3_P6["IFN-γ"]);
if (e3p6_ifng_params) {
  const result = validateMsdModel("E3_P6", "IFN-γ", e3p6_ifng_params);
  console.log(`\nResult: ${result.passed ? '✓ PASSED' : '✗ FAILED'}`);
  console.log(`Max difference: ${result.maxDiffPct.toFixed(2)}%`);
  console.log(`Valid comparisons: ${result.validCount}/${result.totalCount}`);
  
  if (result.details.length > 0) {
    console.log('\nFirst 5 comparisons:');
    console.log('Sample | Well | Signal | Original | Our Calc | Diff % | Status');
    console.log('-'.repeat(70));
    result.details.slice(0, 5).forEach(d => {
      const status = d.passed ? '✓' : '✗';
      console.log(
        `${d.sample.padEnd(6)} | ${d.well.padEnd(4)} | ${d.signal.toFixed(0).padEnd(6)} | ` +
        `${d.originalCalcConc.toFixed(4).padEnd(8)} | ${d.ourCalcConc.toFixed(4).padEnd(8)} | ` +
        `${d.diffPct.toFixed(2).padEnd(6)}% | ${status}`
      );
    });
  }
}

// Test all assays for E3_P4
console.log('\n' + '='.repeat(80));
console.log('VALIDATION SUMMARY - E3_P4 (All Assays)');
console.log('='.repeat(80));
console.log('\nAssay    | Max Diff % | Status | Valid/Total');
console.log('-'.repeat(50));

const assays = ["GM-CSF", "IFN-γ", "IL-10", "IL-1β", "IL-2", "IL-4", "IL-5", "IL-6", "MCP-1", "TNF-α"];
for (const assay of assays) {
  const params = getParamsFromTrainingData(MSD_TRAINING_DATA.E3_P4[assay]);
  if (params) {
    const result = validateMsdModel("E3_P4", assay, params);
    const status = result.passed ? '✓ PASS' : '✗ FAIL';
    console.log(
      `${assay.padEnd(8)} | ${result.maxDiffPct.toFixed(2).padEnd(9)}% | ${status.padEnd(6)} | ${result.validCount}/${result.totalCount}`
    );
  }
}

console.log('\n' + '='.repeat(80));
console.log('VALIDATION SUMMARY - E3_P6 (All Assays)');
console.log('='.repeat(80));
console.log('\nAssay    | Max Diff % | Status | Valid/Total');
console.log('-'.repeat(50));

for (const assay of assays) {
  const params = getParamsFromTrainingData(MSD_TRAINING_DATA.E3_P6[assay]);
  if (params) {
    const result = validateMsdModel("E3_P6", assay, params);
    const status = result.passed ? '✓ PASS' : '✗ FAIL';
    console.log(
      `${assay.padEnd(8)} | ${result.maxDiffPct.toFixed(2).padEnd(9)}% | ${status.padEnd(6)} | ${result.validCount}/${result.totalCount}`
    );
  }
}

