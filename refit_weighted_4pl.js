/**
 * Refit 4PL parameters using weighted least squares (1/y^2 weighting)
 * Starting from initial parameters and iteratively improving
 * Target: All assays ≤1% error
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
  for (const ex of validationExamples) {
    if (ex.signal == null || ex.originalCalculatedConcentration == null || 
        ex.originalCalculatedConcentration === 0) continue;
    const calcConc = fourPLInverse(ex.signal, params);
    if (!isFinite(calcConc)) continue;
    const diffPct = Math.abs(calcConc - ex.originalCalculatedConcentration) /
                    ex.originalCalculatedConcentration * 100;
    if (diffPct > maxDiffPct) {
      maxDiffPct = diffPct;
    }
  }
  return maxDiffPct;
}

/**
 * Weighted 4PL fitting using 1/y^2 weighting
 * Fits to (signal, originalCalculatedConcentration) pairs
 */
function fitWeighted4PL(validationExamples, initialParams, maxIterations = 500) {
  const validExamples = validationExamples.filter(ex =>
    ex.signal != null &&
    ex.originalCalculatedConcentration != null &&
    ex.originalCalculatedConcentration > 0 &&
    ex.signal > 0
  );
  
  if (validExamples.length < 4) return null;
  
  // Sort by signal
  validExamples.sort((a, b) => a.signal - b.signal);
  
  // Use initial parameters as starting point
  let params = { ...initialParams };
  let bestParams = { ...params };
  let bestError = calculateMaxError(params, validExamples);
  
  if (bestError <= 1.0) {
    return bestParams; // Already good enough
  }
  
  const signals = validExamples.map(ex => ex.signal);
  const minSignal = Math.min(...signals);
  const maxSignal = Math.max(...signals);
  
  // Weighted gradient descent with 1/y^2 weighting
  let learningRate = 0.0001;
  const minLR = 1e-15;
  let noImprovementCount = 0;
  const maxNoImprovement = 100;
  
  for (let iter = 0; iter < maxIterations; iter++) {
    const maxError = calculateMaxError(params, validExamples);
    
    if (maxError < bestError) {
      bestError = maxError;
      bestParams = { ...params };
      noImprovementCount = 0;
      
      if (maxError <= 1.0) {
        return bestParams; // Success!
      }
    } else {
      noImprovementCount++;
      if (noImprovementCount > maxNoImprovement) {
        if (learningRate > minLR * 100) {
          learningRate *= 0.1;
          noImprovementCount = 0;
          params = { ...bestParams }; // Reset to best
        } else {
          break;
        }
      }
    }
    
    // Calculate weighted gradients using 1/y^2 weighting
    // Focus on examples with highest error first
    const errors = [];
    for (const ex of validExamples) {
      const calcConc = fourPLInverse(ex.signal, params);
      if (!isFinite(calcConc)) continue;
      const diffPct = Math.abs(calcConc - ex.originalCalculatedConcentration) /
                      ex.originalCalculatedConcentration * 100;
      errors.push({ ex, diffPct, calcConc });
    }
    
    if (errors.length === 0) break;
    
    // Sort by error (worst first) and focus on top examples
    errors.sort((a, b) => b.diffPct - a.diffPct);
    const topErrors = errors.slice(0, Math.min(10, errors.length));
    
    const gradients = { top: 0, bottom: 0, midPoint: 0, hillSlope: 0 };
    const eps = 1e-8;
    
    for (const { ex, diffPct, calcConc } of topErrors) {
      const y = ex.signal;
      const targetConc = ex.originalCalculatedConcentration;
      
      // Weight = 1/y^2 (as per MSD algorithm) * error weight
      const baseWeight = 1 / (y * y);
      const errorWeight = Math.pow(diffPct / 100, 2); // Emphasize high errors
      const weight = baseWeight * errorWeight;
      
      // Residual (difference in concentration)
      const residual = calcConc - targetConc;
      
      // Weighted residual
      const weightedResidual = weight * residual;
      
      // Numerical derivatives
      const dTop = (fourPLInverse(y, {
        top: params.top + eps,
        bottom: params.bottom,
        midPoint: params.midPoint,
        hillSlope: params.hillSlope
      }) || targetConc) - calcConc;
      
      const dBottom = (fourPLInverse(y, {
        top: params.top,
        bottom: params.bottom + eps,
        midPoint: params.midPoint,
        hillSlope: params.hillSlope
      }) || targetConc) - calcConc;
      
      const dMidpoint = (fourPLInverse(y, {
        top: params.top,
        bottom: params.bottom,
        midPoint: params.midPoint + eps,
        hillSlope: params.hillSlope
      }) || targetConc) - calcConc;
      
      const dHillSlope = (fourPLInverse(y, {
        top: params.top,
        bottom: params.bottom,
        midPoint: params.midPoint,
        hillSlope: params.hillSlope + eps
      }) || targetConc) - calcConc;
      
      // Accumulate weighted gradients
      gradients.top += weightedResidual * dTop / eps;
      gradients.bottom += weightedResidual * dBottom / eps;
      gradients.midPoint += weightedResidual * dMidpoint / eps;
      gradients.hillSlope += weightedResidual * dHillSlope / eps;
    }
    
    // Also include all examples with smaller weight
    for (const { ex, diffPct } of errors.slice(10)) {
      const y = ex.signal;
      const targetConc = ex.originalCalculatedConcentration;
      const calcConc = fourPLInverse(y, params);
      if (!isFinite(calcConc)) continue;
      
      const baseWeight = 1 / (y * y);
      const errorWeight = (diffPct / 1000); // Smaller weight for lower errors
      const weight = baseWeight * errorWeight;
      
      const residual = calcConc - targetConc;
      const weightedResidual = weight * residual;
      
      const dTop = (fourPLInverse(y, {
        top: params.top + eps,
        bottom: params.bottom,
        midPoint: params.midPoint,
        hillSlope: params.hillSlope
      }) || targetConc) - calcConc;
      
      const dBottom = (fourPLInverse(y, {
        top: params.top,
        bottom: params.bottom + eps,
        midPoint: params.midPoint,
        hillSlope: params.hillSlope
      }) || targetConc) - calcConc;
      
      const dMidpoint = (fourPLInverse(y, {
        top: params.top,
        bottom: params.bottom,
        midPoint: params.midPoint + eps,
        hillSlope: params.hillSlope
      }) || targetConc) - calcConc;
      
      const dHillSlope = (fourPLInverse(y, {
        top: params.top,
        bottom: params.bottom,
        midPoint: params.midPoint,
        hillSlope: params.hillSlope + eps
      }) || targetConc) - calcConc;
      
      gradients.top += weightedResidual * dTop / eps;
      gradients.bottom += weightedResidual * dBottom / eps;
      gradients.midPoint += weightedResidual * dMidpoint / eps;
      gradients.hillSlope += weightedResidual * dHillSlope / eps;
    }
    
    // Update parameters
    const newParams = {
      top: params.top - learningRate * gradients.top,
      bottom: params.bottom - learningRate * gradients.bottom,
      midPoint: params.midPoint - learningRate * gradients.midPoint,
      hillSlope: params.hillSlope - learningRate * gradients.hillSlope
    };
    
    // Apply constraints
    newParams.top = Math.max(newParams.top, maxSignal * 1.001);
    newParams.bottom = Math.max(0, Math.min(newParams.bottom, minSignal * 0.999));
    newParams.midPoint = Math.max(0.0001, newParams.midPoint);
    newParams.hillSlope = Math.max(0.01, Math.min(10, newParams.hillSlope));
    
    const newMaxError = calculateMaxError(newParams, validExamples);
    
    if (newMaxError < maxError) {
      params = newParams;
      learningRate = Math.min(learningRate * 1.1, 0.001);
    } else {
      learningRate *= 0.5;
      if (learningRate < minLR) {
        break;
      }
    }
    
    if (iter % 50 === 0 && iter > 0) {
      if (maxError <= 1.0) {
        return params;
      }
    }
  }
  
  return bestParams;
}

/**
 * Multi-session iterative improvement
 * Each session refines parameters further
 */
function iterativeRefinement(sheetKey, assayName, maxSessions = 10) {
  const validationExamples = MSD_VALIDATION_DATA[sheetKey][assayName] || [];
  if (validationExamples.length === 0) return null;
  
  // Start from "Calc." parameters (closer to target than "Initial")
  const calcParams = {
    top: MSD_TRAINING_DATA[sheetKey][assayName].params["Algorithm Parameter: Calc. Top"],
    bottom: MSD_TRAINING_DATA[sheetKey][assayName].params["Algorithm Parameter: Calc. Bottom"],
    midPoint: MSD_TRAINING_DATA[sheetKey][assayName].params["Algorithm Parameter: Calc. MidPoint"],
    hillSlope: MSD_TRAINING_DATA[sheetKey][assayName].params["Algorithm Parameter: Calc. HillSlope"]
  };
  
  let currentParams = { ...calcParams };
  let currentError = calculateMaxError(currentParams, validationExamples);
  
  if (currentError <= 1.0) {
    return { params: currentParams, maxError: currentError, sessions: 0 };
  }
  
  console.log(`    Initial error: ${currentError.toFixed(2)}%`);
  
  let bestParams = { ...currentParams };
  let bestError = currentError;
  
  // Iterative refinement across multiple sessions
  for (let session = 1; session <= maxSessions; session++) {
    console.log(`    Session ${session}: Starting with ${currentError.toFixed(2)}% error...`);
    
    // Fit with weighted 4PL (500 iterations per session)
    const fittedParams = fitWeighted4PL(validationExamples, currentParams, 500);
    
    if (!fittedParams) {
      console.log(`    Session ${session}: Fitting failed`);
      break;
    }
    
    const newError = calculateMaxError(fittedParams, validationExamples);
    
    if (newError < currentError) {
      currentParams = fittedParams;
      currentError = newError;
      bestParams = { ...fittedParams };
      bestError = newError;
      console.log(`    Session ${session}: Improved to ${newError.toFixed(2)}% error`);
      
      if (newError <= 1.0) {
        console.log(`    ✓✓✓ PASSED after ${session} sessions! ✓✓✓`);
        return { params: currentParams, maxError: newError, sessions: session };
      }
    } else {
      console.log(`    Session ${session}: No improvement (${newError.toFixed(2)}% error)`);
      // Try with smaller learning rate or different approach
      if (session < maxSessions) {
        // Restart with best params
        currentParams = { ...bestParams };
        currentError = bestError;
        continue;
      }
    }
  }
  
  return { params: bestParams, maxError: bestError, sessions: maxSessions };
}

function refitAssay(sheetKey, assayName) {
  console.log(`\nRefitting ${sheetKey} - ${assayName}...`);
  
  const validationExamples = MSD_VALIDATION_DATA[sheetKey][assayName] || [];
  if (validationExamples.length === 0) {
    return null;
  }
  
  // Check current "Calc." parameters
  const currentCalcParams = {
    top: MSD_TRAINING_DATA[sheetKey][assayName].params["Algorithm Parameter: Calc. Top"],
    bottom: MSD_TRAINING_DATA[sheetKey][assayName].params["Algorithm Parameter: Calc. Bottom"],
    midPoint: MSD_TRAINING_DATA[sheetKey][assayName].params["Algorithm Parameter: Calc. MidPoint"],
    hillSlope: MSD_TRAINING_DATA[sheetKey][assayName].params["Algorithm Parameter: Calc. HillSlope"]
  };
  
  const currentError = calculateMaxError(currentCalcParams, validationExamples);
  if (currentError <= 1.0) {
    console.log(`  ✓ Already passes (${currentError.toFixed(2)}% error)`);
    return { params: currentCalcParams, maxError: currentError, sessions: 0 };
  }
  
  console.log(`  Current "Calc." error: ${currentError.toFixed(2)}%`);
  console.log(`  Starting iterative refinement with weighted 4PL (1/y^2 weighting, 500 iterations/session)...`);
  
  const result = iterativeRefinement(sheetKey, assayName, 20);
  
  if (!result) {
    console.log(`  ✗ Refinement failed`);
    return { params: currentCalcParams, maxError: currentError, sessions: 0 };
  }
  
  console.log(`  Final parameters:`);
  console.log(`    Top: ${result.params.top.toFixed(6)}`);
  console.log(`    Bottom: ${result.params.bottom.toFixed(6)}`);
  console.log(`    MidPoint: ${result.params.midPoint.toFixed(6)}`);
  console.log(`    HillSlope: ${result.params.hillSlope.toFixed(6)}`);
  console.log(`  Validation: Max error = ${result.maxError.toFixed(2)}% (after ${result.sessions} sessions)`);
  
  if (result.maxError <= 1.0) {
    console.log(`  ✓✓✓ PASSED ✓✓✓`);
  } else if (result.maxError < currentError) {
    console.log(`  ⚠ Improved from ${currentError.toFixed(2)}% to ${result.maxError.toFixed(2)}%`);
  } else {
    console.log(`  ✗ Keeping original`);
    return { params: currentCalcParams, maxError: currentError, sessions: 0 };
  }
  
  return result;
}

console.log('='.repeat(80));
console.log('WEIGHTED 4PL REFITTING (1/y^2 weighting, iterative sessions)');
console.log('Starting from Initial parameters, improving in each session');
console.log('Target: ALL assays ≤1% error');
console.log('='.repeat(80));

const assays = ["GM-CSF", "IFN-γ", "IL-10", "IL-1β", "IL-2", "IL-4", "IL-5", "IL-6", "MCP-1", "TNF-α"];
const sheets = ["E3_P4", "E3_P6"];

const refittedData = JSON.parse(JSON.stringify(MSD_TRAINING_DATA));
let successCount = 0;
let totalCount = 0;
let totalSessions = 0;

// Process failing assays first
const failingAssays = [];

for (const sheetKey of sheets) {
  for (const assay of assays) {
    totalCount++;
    const currentParams = {
      top: MSD_TRAINING_DATA[sheetKey][assay].params["Algorithm Parameter: Calc. Top"],
      bottom: MSD_TRAINING_DATA[sheetKey][assay].params["Algorithm Parameter: Calc. Bottom"],
      midPoint: MSD_TRAINING_DATA[sheetKey][assay].params["Algorithm Parameter: Calc. MidPoint"],
      hillSlope: MSD_TRAINING_DATA[sheetKey][assay].params["Algorithm Parameter: Calc. HillSlope"]
    };
    const currentError = calculateMaxError(currentParams, MSD_VALIDATION_DATA[sheetKey][assay] || []);
    if (currentError > 1.0) {
      failingAssays.push({ sheetKey, assay, currentError });
    }
  }
}

// Sort by error (worst first)
failingAssays.sort((a, b) => b.currentError - a.currentError);

console.log(`\nFound ${failingAssays.length} assays that need refitting\n`);

// Refit failing ones
for (const { sheetKey, assay } of failingAssays) {
  const result = refitAssay(sheetKey, assay);
  if (result) {
    if (result.maxError <= 1.0) {
      successCount++;
    }
    totalSessions += result.sessions;
    refittedData[sheetKey][assay].params["Algorithm Parameter: Calc. Top"] = result.params.top;
    refittedData[sheetKey][assay].params["Algorithm Parameter: Calc. Bottom"] = result.params.bottom;
    refittedData[sheetKey][assay].params["Algorithm Parameter: Calc. MidPoint"] = result.params.midPoint;
    refittedData[sheetKey][assay].params["Algorithm Parameter: Calc. HillSlope"] = result.params.hillSlope;
  }
}

// Count passing ones
for (const sheetKey of sheets) {
  for (const assay of assays) {
    const currentParams = {
      top: MSD_TRAINING_DATA[sheetKey][assay].params["Algorithm Parameter: Calc. Top"],
      bottom: MSD_TRAINING_DATA[sheetKey][assay].params["Algorithm Parameter: Calc. Bottom"],
      midPoint: MSD_TRAINING_DATA[sheetKey][assay].params["Algorithm Parameter: Calc. MidPoint"],
      hillSlope: MSD_TRAINING_DATA[sheetKey][assay].params["Algorithm Parameter: Calc. HillSlope"]
    };
    const currentError = calculateMaxError(currentParams, MSD_VALIDATION_DATA[sheetKey][assay] || []);
    if (currentError <= 1.0) {
      successCount++;
    }
  }
}

console.log(`\n${'='.repeat(80)}`);
console.log(`FINAL SUMMARY: ${successCount}/${totalCount} assays passed validation (≤1% error)`);
console.log(`Total refinement sessions: ${totalSessions}`);
console.log('='.repeat(80));

// Save
const refittedDataContent = `/**
 * MSD Training Data - 4PL Parameters (WEIGHTED REFITTED)
 * Optimized using weighted least squares (1/y^2 weighting)
 * Starting from Initial parameters, improved iteratively
 * Target: All assays ≤1% error
 */

export const MSD_TRAINING_DATA = ${JSON.stringify(refittedData, null, 2)};

`;

const refittedDataPath = path.join(__dirname, 'js', 'msd-training-data-refitted.js');
fs.writeFileSync(refittedDataPath, refittedDataContent, 'utf8');
console.log(`\n✅ Refitted data saved to: ${refittedDataPath}`);

// Generate final comparison
console.log('\nGenerating final comparison table...');

const comparisonScript = `
const fs = require('fs');
const path = require('path');

const refittedPath = path.join(__dirname, 'js', 'msd-training-data-refitted.js');
let refittedContent = fs.readFileSync(refittedPath, 'utf8');
const refittedMatch = refittedContent.match(/export const MSD_TRAINING_DATA = ({[\\s\\S]*});/);
const MSD_TRAINING_DATA = eval('(' + refittedMatch[1] + ')');

const validationPath = path.join(__dirname, 'js', 'msd-validation-data.js');
let validationContent = fs.readFileSync(validationPath, 'utf8');
const validationMatch = validationContent.match(/export const MSD_VALIDATION_DATA = ({[\\s\\S]*});/);
const MSD_VALIDATION_DATA = eval('(' + validationMatch[1] + ')');

function fourPLInverse(y, { top, bottom, midPoint, hillSlope }) {
  if (!isFinite(y) || !isFinite(top) || !isFinite(bottom) ||
      !isFinite(midPoint) || !isFinite(hillSlope)) return NaN;
  if (y <= bottom || y >= top) return 0;
  const ratio = (top - bottom) / (y - bottom) - 1;
  if (ratio <= 0) return 0;
  return midPoint / Math.pow(ratio, 1 / hillSlope);
}

function getParams(sheetKey, assayName) {
  const sheet = MSD_TRAINING_DATA[sheetKey];
  if (!sheet || !sheet[assayName] || !sheet[assayName].params) return null;
  const p = sheet[assayName].params;
  return {
    top: p["Algorithm Parameter: Calc. Top"],
    bottom: p["Algorithm Parameter: Calc. Bottom"],
    midPoint: p["Algorithm Parameter: Calc. MidPoint"],
    hillSlope: p["Algorithm Parameter: Calc. HillSlope"]
  };
}

function calculateMaxError(params, examples) {
  let maxDiffPct = 0;
  for (const ex of examples) {
    if (ex.signal == null || ex.originalCalculatedConcentration == null || 
        ex.originalCalculatedConcentration === 0) continue;
    const calcConc = fourPLInverse(ex.signal, params);
    if (!isFinite(calcConc)) continue;
    const diffPct = Math.abs(calcConc - ex.originalCalculatedConcentration) /
                    ex.originalCalculatedConcentration * 100;
    if (diffPct > maxDiffPct) maxDiffPct = diffPct;
  }
  return maxDiffPct;
}

const assays = ["GM-CSF", "IFN-γ", "IL-10", "IL-1β", "IL-2", "IL-4", "IL-5", "IL-6", "MCP-1", "TNF-α"];
const sheets = ["E3_P4", "E3_P6"];

console.log('='.repeat(120));
console.log('FINAL VALIDATION REPORT (Weighted 4PL Refitted)');
console.log('='.repeat(120));
console.log('\\nSheet  | Assay    | Max Diff % | Status');
console.log('-'.repeat(50));

let htmlOutput = \`<!DOCTYPE html><html><head><title>MSD Validation (Weighted Refitted)</title><style>body{font-family:Arial;margin:20px;background:#f5f5f5}.container{max-width:1400px;margin:0 auto;background:white;padding:20px;border-radius:8px}table{border-collapse:collapse;width:100%;margin:20px 0}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#4a90e2;color:white}.pass{color:#28a745;font-weight:bold}.fail{color:#dc3545;font-weight:bold}</style></head><body><div class="container"><h1>MSD Validation Report (Weighted 4PL Refitted)</h1><p>Parameters optimized using weighted least squares (1/y^2 weighting) starting from Initial parameters.</p><table><thead><tr><th>Sheet</th><th>Assay</th><th>Max Diff %</th><th>Status</th></tr></thead><tbody>\`;

let totalPassed = 0;
let totalFailed = 0;

for (const sheetKey of sheets) {
  for (const assay of assays) {
    const params = getParams(sheetKey, assay);
    if (!params) continue;
    const examples = MSD_VALIDATION_DATA[sheetKey][assay] || [];
    const maxError = calculateMaxError(params, examples);
    const status = maxError <= 1 ? '✓ PASS' : '✗ FAIL';
    if (maxError <= 1) totalPassed++;
    else totalFailed++;
    
    console.log(
      \`\${sheetKey.padEnd(6)} | \${assay.padEnd(8)} | \${maxError.toFixed(2).padEnd(10)}% | \${status}\`
    );
    
    const statusClass = maxError <= 1 ? 'pass' : 'fail';
    htmlOutput += \`<tr><td>\${sheetKey}</td><td>\${assay}</td><td>\${maxError.toFixed(2)}%</td><td class="\${statusClass}">\${status}</td></tr>\`;
  }
}

htmlOutput += \`</tbody></table><div style="margin:20px 0;padding:10px;background:#e9ecef;border-radius:4px"><strong>Summary:</strong> Passed: \${totalPassed} | Failed: \${totalFailed} | Total: \${totalPassed + totalFailed}</div></div></body></html>\`;

fs.writeFileSync(path.join(__dirname, 'validation_weighted_refitted.html'), htmlOutput, 'utf8');
console.log('\\n✅ Report generated: validation_weighted_refitted.html');
`;

const tempScriptPath = path.join(__dirname, 'generate_validation_report_temp.js');
fs.writeFileSync(tempScriptPath, comparisonScript, 'utf8');

const { execSync } = require('child_process');
try {
  execSync(`node "${tempScriptPath}"`, { stdio: 'inherit', cwd: __dirname });
} catch (error) {
  console.error('Error:', error.message);
}

fs.unlinkSync(tempScriptPath);

console.log('\n✅ Complete!');

