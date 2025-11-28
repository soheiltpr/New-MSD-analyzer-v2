/**
 * Example: How to use MSD Validation System
 * 
 * This demonstrates how to:
 * 1. Load validation data
 * 2. Get 4PL parameters from training data
 * 3. Validate that parameters reproduce original MSD calculations
 * 4. Handle validation failures by triggering re-fitting
 */

import { MSD_VALIDATION_DATA } from './msd-validation-data.js';
import { MSD_TRAINING_DATA } from './msd-training-data.js';
import { 
  validateMsdModel, 
  getParamsFromTrainingData,
  validateAllAssays,
  fourPLInverse
} from './msd-validation.js';

/**
 * Example 1: Validate a single assay
 */
function example1_validateSingleAssay() {
  console.log('=== Example 1: Validate Single Assay ===');
  
  // Get parameters for E3_P4 GM-CSF
  const trainingData = MSD_TRAINING_DATA.E3_P4["GM-CSF"];
  const params = getParamsFromTrainingData(trainingData);
  
  if (!params) {
    console.error('Could not extract parameters');
    return;
  }
  
  // Validate
  const result = validateMsdModel(
    MSD_VALIDATION_DATA,
    "E3_P4",
    "GM-CSF",
    params
  );
  
  console.log(`Validation result: ${result.passed ? '✓ PASSED' : '✗ FAILED'}`);
  console.log(`Max difference: ${result.maxDiffPct.toFixed(2)}%`);
  console.log(`Details: ${result.details.length} comparisons`);
  
  if (!result.passed) {
    console.log('⚠️ Model needs re-fitting!');
    // TODO: Call re-fit function here
  }
}

/**
 * Example 2: Validate all assays for a sheet
 */
function example2_validateAllAssays() {
  console.log('\n=== Example 2: Validate All Assays ===');
  
  const sheetKey = "E3_P4";
  const sheetData = MSD_TRAINING_DATA[sheetKey];
  
  // Build params map
  const paramsMap = {};
  for (const [assayName, trainingData] of Object.entries(sheetData)) {
    const params = getParamsFromTrainingData(trainingData);
    if (params) {
      paramsMap[assayName] = params;
    }
  }
  
  // Validate all
  const results = validateAllAssays(
    MSD_VALIDATION_DATA,
    sheetKey,
    paramsMap
  );
  
  console.log('\nValidation Results:');
  console.log('Assay    | Status | Max Diff %');
  console.log('-'.repeat(30));
  
  for (const [assayName, result] of Object.entries(results)) {
    const status = result.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`${assayName.padEnd(8)} | ${status.padEnd(6)} | ${result.maxDiffPct.toFixed(2)}%`);
    
    if (!result.passed) {
      console.log(`  ⚠️ ${assayName} needs re-fitting (max diff: ${result.maxDiffPct.toFixed(2)}%)`);
    }
  }
}

/**
 * Example 3: Calculate concentration and validate
 */
function example3_calculateAndValidate() {
  console.log('\n=== Example 3: Calculate and Validate ===');
  
  const sheetKey = "E3_P4";
  const assayName = "GM-CSF";
  const signal = 1658; // Example signal value
  
  // Get parameters
  const trainingData = MSD_TRAINING_DATA[sheetKey][assayName];
  const params = getParamsFromTrainingData(trainingData);
  
  if (!params) {
    console.error('Could not extract parameters');
    return;
  }
  
  // Calculate concentration
  const calculatedConc = fourPLInverse(signal, params);
  console.log(`Signal: ${signal}`);
  console.log(`Calculated concentration: ${calculatedConc.toFixed(6)}`);
  
  // Find matching validation example
  const examples = MSD_VALIDATION_DATA[sheetKey][assayName];
  const matchingExample = examples.find(ex => ex.signal === signal);
  
  if (matchingExample && matchingExample.originalCalculatedConcentration) {
    const original = matchingExample.originalCalculatedConcentration;
    const diffPct = Math.abs(calculatedConc - original) / original * 100;
    
    console.log(`Original MSD calculation: ${original.toFixed(6)}`);
    console.log(`Difference: ${diffPct.toFixed(2)}%`);
    console.log(`Status: ${diffPct <= 1 ? '✓ PASS' : '✗ FAIL'}`);
  }
}

/**
 * Example 4: Check validation before using parameters
 */
function example4_validateBeforeUse() {
  console.log('\n=== Example 4: Validate Before Use ===');
  
  const sheetKey = "E3_P4";
  const assayName = "IL-10"; // This one typically fails
  
  const trainingData = MSD_TRAINING_DATA[sheetKey][assayName];
  const params = getParamsFromTrainingData(trainingData);
  
  if (!params) {
    console.error('Could not extract parameters');
    return;
  }
  
  // Validate first
  const validation = validateMsdModel(
    MSD_VALIDATION_DATA,
    sheetKey,
    assayName,
    params
  );
  
  if (validation.passed) {
    console.log(`✓ Parameters validated for ${assayName}`);
    console.log('Safe to use for concentration calculations');
  } else {
    console.log(`✗ Validation failed for ${assayName}`);
    console.log(`Max difference: ${validation.maxDiffPct.toFixed(2)}%`);
    console.log('⚠️ Parameters should be re-fitted before use');
    
    // Show some details
    console.log('\nFirst 3 validation comparisons:');
    validation.details.slice(0, 3).forEach(d => {
      console.log(`  ${d.sample} ${d.well}: ${d.diffPct.toFixed(2)}% diff`);
    });
    
    // TODO: Trigger re-fitting here
    // refit4PLParameters(sheetKey, assayName, MSD_VALIDATION_DATA);
  }
}

// Run examples (uncomment to run)
// example1_validateSingleAssay();
// example2_validateAllAssays();
// example3_calculateAndValidate();
// example4_validateBeforeUse();

export {
  example1_validateSingleAssay,
  example2_validateAllAssays,
  example3_calculateAndValidate,
  example4_validateBeforeUse
};

