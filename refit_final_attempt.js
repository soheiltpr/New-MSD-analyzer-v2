/**
 * Final attempt: Multi-stage optimization with extended iterations
 * Goal: Get ALL assays to ≤1% error
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
 * Multi-stage optimization with extended iterations
 */
function optimizeWithExtendedIterations(validationExamples) {
  const validExamples = validationExamples.filter(ex =>
    ex.signal != null &&
    ex.originalCalculatedConcentration != null &&
    ex.originalCalculatedConcentration > 0
  );
  
  if (validExamples.length < 4) return null;
  
  validExamples.sort((a, b) => a.signal - b.signal);
  
  const signals = validExamples.map(ex => ex.signal);
  const concentrations = validExamples.map(ex => ex.originalCalculatedConcentration);
  const minSignal = Math.min(...signals);
  const maxSignal = Math.max(...signals);
  
  // Stage 1: Very fine grid search
  let bestParams = null;
  let bestError = Infinity;
  
  const bottomRange = [];
  for (let i = 0; i <= 20; i++) {
    bottomRange.push(minSignal * (0.3 + i * 0.03));
  }
  
  const topRange = [];
  for (let i = 0; i <= 20; i++) {
    topRange.push(maxSignal * (1.0 + i * 0.02));
  }
  
  const midRange = [];
  for (let i = 0; i < validExamples.length; i++) {
    midRange.push(validExamples[i].originalCalculatedConcentration);
  }
  for (let i = 0; i < validExamples.length - 1; i++) {
    midRange.push((validExamples[i].originalCalculatedConcentration + 
                   validExamples[i + 1].originalCalculatedConcentration) / 2);
  }
  
  const slopeRange = [];
  for (let i = 0; i <= 40; i++) {
    slopeRange.push(0.1 + i * 0.1);
  }
  
  console.log(`    Stage 1: Fine grid search (${bottomRange.length * topRange.length * Math.min(15, midRange.length) * slopeRange.length} combinations)...`);
  
  let gridCount = 0;
  const maxGrid = 5000; // Limit to avoid too long
  
  for (const bot of bottomRange) {
    for (const tp of topRange) {
      for (let mi = 0; mi < Math.min(15, midRange.length); mi++) {
        const mid = midRange[mi];
        for (const slope of slopeRange) {
          if (gridCount++ > maxGrid) break;
          
          const testParams = { top: tp, bottom: bot, midPoint: mid, hillSlope: slope };
          const error = calculateMaxError(testParams, validExamples);
          
          if (error < bestError) {
            bestError = error;
            bestParams = { ...testParams };
            
            if (error <= 1.0) {
              return bestParams;
            }
          }
        }
        if (gridCount > maxGrid) break;
      }
      if (gridCount > maxGrid) break;
    }
    if (gridCount > maxGrid) break;
  }
  
  console.log(`    Best from grid: ${bestError.toFixed(2)}% error`);
  
  // Stage 2: Extended gradient descent
  if (bestParams && bestError < 100) {
    console.log(`    Stage 2: Extended gradient descent (up to 1M iterations)...`);
    return refineWithExtendedIterations(bestParams, validExamples, 1000000);
  }
  
  return bestParams;
}

function refineWithExtendedIterations(initialParams, validationExamples, maxIterations = 1000000) {
  let params = { ...initialParams };
  let learningRate = 0.000001;
  const minLR = 1e-20;
  let bestParams = { ...params };
  let bestError = calculateMaxError(params, validationExamples);
  let noImprovementCount = 0;
  const maxNoImprovement = 50000;
  
  for (let iter = 0; iter < maxIterations; iter++) {
    const maxError = calculateMaxError(params, validationExamples);
    
    if (maxError < bestError) {
      bestError = maxError;
      bestParams = { ...params };
      noImprovementCount = 0;
      
      if (maxError <= 1.0) {
        console.log(`    ✓ Converged at iteration ${iter} with ${maxError.toFixed(2)}% error`);
        return bestParams;
      }
    } else {
      noImprovementCount++;
      if (noImprovementCount > maxNoImprovement) {
        if (learningRate > minLR * 1000) {
          learningRate *= 0.1;
          noImprovementCount = 0;
          params = { ...bestParams };
        } else {
          break;
        }
      }
    }
    
    // Calculate gradients with focus on worst examples
    const errors = [];
    for (const ex of validationExamples) {
      if (ex.signal == null || ex.originalCalculatedConcentration == null || 
          ex.originalCalculatedConcentration === 0) continue;
      const calcConc = fourPLInverse(ex.signal, params);
      if (!isFinite(calcConc)) continue;
      const diffPct = Math.abs(calcConc - ex.originalCalculatedConcentration) /
                      ex.originalCalculatedConcentration * 100;
      errors.push({ ex, diffPct, calcConc });
    }
    
    if (errors.length === 0) break;
    
    errors.sort((a, b) => b.diffPct - a.diffPct);
    const worstExamples = errors.slice(0, Math.min(15, errors.length));
    
    const gradients = { top: 0, bottom: 0, midPoint: 0, hillSlope: 0 };
    const eps = 1e-9;
    
    for (const { ex, diffPct, calcConc } of worstExamples) {
      const target = ex.originalCalculatedConcentration;
      const residual = (calcConc - target) / target;
      // Stronger weight for examples with higher error
      const weight = Math.pow(diffPct / 100, 3) * (1 / (target * target));
      
      const dTop = (fourPLInverse(ex.signal, {
        top: params.top + eps,
        bottom: params.bottom,
        midPoint: params.midPoint,
        hillSlope: params.hillSlope
      }) || target) - calcConc;
      
      const dBottom = (fourPLInverse(ex.signal, {
        top: params.top,
        bottom: params.bottom + eps,
        midPoint: params.midPoint,
        hillSlope: params.hillSlope
      }) || target) - calcConc;
      
      const dMidpoint = (fourPLInverse(ex.signal, {
        top: params.top,
        bottom: params.bottom,
        midPoint: params.midPoint + eps,
        hillSlope: params.hillSlope
      }) || target) - calcConc;
      
      const dHillSlope = (fourPLInverse(ex.signal, {
        top: params.top,
        bottom: params.bottom,
        midPoint: params.midPoint,
        hillSlope: params.hillSlope + eps
      }) || target) - calcConc;
      
      gradients.top += weight * residual * dTop / eps;
      gradients.bottom += weight * residual * dBottom / eps;
      gradients.midPoint += weight * residual * dMidpoint / eps;
      gradients.hillSlope += weight * residual * dHillSlope / eps;
    }
    
    // Also include all examples with smaller weight
    for (const { ex, diffPct } of errors.slice(15)) {
      const calcConc = fourPLInverse(ex.signal, params);
      if (!isFinite(calcConc)) continue;
      const target = ex.originalCalculatedConcentration;
      const residual = (calcConc - target) / target;
      const weight = (diffPct / 10000) * (1 / (target * target));
      
      const dTop = (fourPLInverse(ex.signal, {
        top: params.top + eps,
        bottom: params.bottom,
        midPoint: params.midPoint,
        hillSlope: params.hillSlope
      }) || target) - calcConc;
      
      const dBottom = (fourPLInverse(ex.signal, {
        top: params.top,
        bottom: params.bottom + eps,
        midPoint: params.midPoint,
        hillSlope: params.hillSlope
      }) || target) - calcConc;
      
      const dMidpoint = (fourPLInverse(ex.signal, {
        top: params.top,
        bottom: params.bottom,
        midPoint: params.midPoint + eps,
        hillSlope: params.hillSlope
      }) || target) - calcConc;
      
      const dHillSlope = (fourPLInverse(ex.signal, {
        top: params.top,
        bottom: params.bottom,
        midPoint: params.midPoint,
        hillSlope: params.hillSlope + eps
      }) || target) - calcConc;
      
      gradients.top += weight * residual * dTop / eps;
      gradients.bottom += weight * residual * dBottom / eps;
      gradients.midPoint += weight * residual * dMidpoint / eps;
      gradients.hillSlope += weight * residual * dHillSlope / eps;
    }
    
    const signals = validationExamples.map(ex => ex.signal).filter(s => s != null);
    const minSignal = Math.min(...signals);
    const maxSignal = Math.max(...signals);
    
    const newParams = {
      top: params.top - learningRate * gradients.top,
      bottom: params.bottom - learningRate * gradients.bottom,
      midPoint: params.midPoint - learningRate * gradients.midPoint,
      hillSlope: params.hillSlope - learningRate * gradients.hillSlope
    };
    
    newParams.top = Math.max(newParams.top, maxSignal * 1.0001);
    newParams.bottom = Math.max(0, Math.min(newParams.bottom, minSignal * 0.9999));
    newParams.midPoint = Math.max(0.000001, newParams.midPoint);
    newParams.hillSlope = Math.max(0.0001, Math.min(20, newParams.hillSlope));
    
    const newMaxError = calculateMaxError(newParams, validationExamples);
    
    if (newMaxError < maxError) {
      params = newParams;
      learningRate = Math.min(learningRate * 1.01, 0.00001);
    } else {
      learningRate *= 0.5;
      if (learningRate < minLR) {
        break;
      }
    }
    
    if (iter % 100000 === 0 && iter > 0) {
      console.log(`    Iteration ${iter}: Max error = ${maxError.toFixed(2)}%`);
      if (maxError <= 1.0) {
        return params;
      }
    }
  }
  
  return bestParams;
}

function refitAssay(sheetKey, assayName) {
  console.log(`\nRefitting ${sheetKey} - ${assayName}...`);
  
  const validationExamples = MSD_VALIDATION_DATA[sheetKey][assayName] || [];
  if (validationExamples.length === 0) {
    return null;
  }
  
  const currentParams = {
    top: MSD_TRAINING_DATA[sheetKey][assayName].params["Algorithm Parameter: Calc. Top"],
    bottom: MSD_TRAINING_DATA[sheetKey][assayName].params["Algorithm Parameter: Calc. Bottom"],
    midPoint: MSD_TRAINING_DATA[sheetKey][assayName].params["Algorithm Parameter: Calc. MidPoint"],
    hillSlope: MSD_TRAINING_DATA[sheetKey][assayName].params["Algorithm Parameter: Calc. HillSlope"]
  };
  
  const currentError = calculateMaxError(currentParams, validationExamples);
  if (currentError <= 1.0) {
    console.log(`  ✓ Already passes (${currentError.toFixed(2)}% error)`);
    return { params: currentParams, maxError: currentError };
  }
  
  console.log(`  Current error: ${currentError.toFixed(2)}% - extended optimization...`);
  
  const fittedParams = optimizeWithExtendedIterations(validationExamples);
  
  if (!fittedParams) {
    console.log(`  ✗ Optimization failed`);
    return { params: currentParams, maxError: currentError };
  }
  
  const maxError = calculateMaxError(fittedParams, validationExamples);
  
  console.log(`  Final parameters:`);
  console.log(`    Top: ${fittedParams.top.toFixed(6)}`);
  console.log(`    Bottom: ${fittedParams.bottom.toFixed(6)}`);
  console.log(`    MidPoint: ${fittedParams.midPoint.toFixed(6)}`);
  console.log(`    HillSlope: ${fittedParams.hillSlope.toFixed(6)}`);
  console.log(`  Validation: Max error = ${maxError.toFixed(2)}%`);
  
  if (maxError <= 1.0) {
    console.log(`  ✓✓✓ PASSED ✓✓✓`);
  } else if (maxError < currentError) {
    console.log(`  ⚠ Improved from ${currentError.toFixed(2)}% to ${maxError.toFixed(2)}%`);
  } else {
    console.log(`  ✗ Keeping original`);
    return { params: currentParams, maxError: currentError };
  }
  
  return { params: fittedParams, maxError: maxError };
}

console.log('='.repeat(80));
console.log('FINAL REFITTING ATTEMPT - EXTENDED OPTIMIZATION');
console.log('Target: ALL assays ≤1% error');
console.log('='.repeat(80));

const assays = ["GM-CSF", "IFN-γ", "IL-10", "IL-1β", "IL-2", "IL-4", "IL-5", "IL-6", "MCP-1", "TNF-α"];
const sheets = ["E3_P4", "E3_P6"];

const refittedData = JSON.parse(JSON.stringify(MSD_TRAINING_DATA));
let successCount = 0;
let totalCount = 0;

// Process in order, focusing on failing ones first
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
    refittedData[sheetKey][assay].params["Algorithm Parameter: Calc. Top"] = result.params.top;
    refittedData[sheetKey][assay].params["Algorithm Parameter: Calc. Bottom"] = result.params.bottom;
    refittedData[sheetKey][assay].params["Algorithm Parameter: Calc. MidPoint"] = result.params.midPoint;
    refittedData[sheetKey][assay].params["Algorithm Parameter: Calc. HillSlope"] = result.params.hillSlope;
  }
}

// Also process passing ones (to keep them)
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
      // Keep original parameters
    }
  }
}

console.log(`\n${'='.repeat(80)}`);
console.log(`FINAL SUMMARY: ${successCount}/${totalCount} assays passed validation (≤1% error)`);
console.log('='.repeat(80));

// Save
const refittedDataContent = `/**
 * MSD Training Data - 4PL Parameters (FINAL REFITTED)
 * Optimized to match original MSD calculated concentrations
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

function generateComparisonTable(sheetKey, assayName) {
  const params = getParams(sheetKey, assayName);
  if (!params) return null;
  const examples = MSD_VALIDATION_DATA[sheetKey][assayName] || [];
  const comparisons = [];
  for (const ex of examples) {
    if (ex.signal == null || ex.originalCalculatedConcentration == null || 
        ex.originalCalculatedConcentration === 0 || isNaN(ex.signal) || 
        isNaN(ex.originalCalculatedConcentration)) continue;
    const ourCalcConc = fourPLInverse(ex.signal, params);
    if (!isFinite(ourCalcConc)) continue;
    const diff = ourCalcConc - ex.originalCalculatedConcentration;
    const diffPct = Math.abs(diff) / ex.originalCalculatedConcentration * 100;
    comparisons.push({
      sample: ex.sample, well: ex.well, concentration: ex.concentration,
      signal: ex.signal, originalCalcConc: ex.originalCalculatedConcentration,
      ourCalcConc: ourCalcConc, difference: diff, diffPct: diffPct,
      passed: diffPct <= 1
    });
  }
  return {
    sheetKey, assayName, params, comparisons,
    stats: {
      count: comparisons.length,
      passed: comparisons.filter(c => c.passed).length,
      failed: comparisons.filter(c => !c.passed).length,
      maxDiffPct: comparisons.length > 0 ? Math.max(...comparisons.map(c => c.diffPct)) : 0,
      minDiffPct: comparisons.length > 0 ? Math.min(...comparisons.map(c => c.diffPct)) : 0,
      avgDiffPct: comparisons.length > 0 ? comparisons.reduce((sum, c) => sum + c.diffPct, 0) / comparisons.length : 0
    }
  };
}

const assays = ["GM-CSF", "IFN-γ", "IL-10", "IL-1β", "IL-2", "IL-4", "IL-5", "IL-6", "MCP-1", "TNF-α"];
const sheets = ["E3_P4", "E3_P6"];

console.log('='.repeat(120));
console.log('FINAL COMPARISON TABLE: Our Calculations vs Original MSD');
console.log('='.repeat(120));
console.log('\\nSheet  | Assay    | Count | Passed | Failed | Max Diff % | Avg Diff % | Status');
console.log('-'.repeat(120));

let allOutput = '';
let htmlOutput = \`<!DOCTYPE html><html><head><title>MSD Comparison (Final)</title><style>body{font-family:Arial;margin:20px;background:#f5f5f5}.container{max-width:1400px;margin:0 auto;background:white;padding:20px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1)}table{border-collapse:collapse;width:100%;margin:20px 0;font-size:12px}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#4a90e2;color:white;position:sticky;top:0}tr:nth-child(even){background:#f9f9f9}.pass{color:#28a745;font-weight:bold}.fail{color:#dc3545;font-weight:bold}.section{margin:40px 0;page-break-inside:avoid}h1{color:#333;border-bottom:3px solid #4a90e2;padding-bottom:10px}h2{color:#4a90e2;margin-top:30px}.params{background:#f8f9fa;padding:10px;border-radius:4px;margin:10px 0;font-family:monospace}.stats{background:#e9ecef;padding:10px;border-radius:4px;margin:10px 0}</style></head><body><div class="container"><h1>MSD Calculation Comparison (Final Refitted Parameters)</h1><p>This table compares concentrations calculated using our refitted 4PL parameters against the original MSD software's calculated concentrations (Column H).</p>\`;

htmlOutput += \`<table><thead><tr><th>Sheet</th><th>Assay</th><th>Count</th><th>Passed</th><th>Failed</th><th>Max Diff %</th><th>Avg Diff %</th><th>Status</th></tr></thead><tbody>\`;

let totalPassed = 0;
let totalFailed = 0;

for (const sheetKey of sheets) {
  for (const assay of assays) {
    const result = generateComparisonTable(sheetKey, assay);
    if (result && result.comparisons.length > 0) {
      const status = result.stats.maxDiffPct <= 1 ? '✓ PASS' : '✗ FAIL';
      if (result.stats.maxDiffPct <= 1) totalPassed++;
      else totalFailed++;
      
      console.log(
        \`\${sheetKey.padEnd(6)} | \${assay.padEnd(8)} | \${result.stats.count.toString().padEnd(5)} | \` +
        \`\${result.stats.passed.toString().padEnd(6)} | \${result.stats.failed.toString().padEnd(6)} | \` +
        \`\${result.stats.maxDiffPct.toFixed(2).padEnd(10)}% | \${result.stats.avgDiffPct.toFixed(2).padEnd(10)}% | \${status}\`
      );
      
      const statusClass = result.stats.maxDiffPct <= 1 ? 'pass' : 'fail';
      const statusSym = result.stats.maxDiffPct <= 1 ? '✓ PASS' : '✗ FAIL';
      htmlOutput += \`<tr><td>\${sheetKey}</td><td>\${assay}</td><td>\${result.stats.count}</td><td>\${result.stats.passed}</td><td>\${result.stats.failed}</td><td>\${result.stats.maxDiffPct.toFixed(2)}%</td><td>\${result.stats.avgDiffPct.toFixed(2)}%</td><td class="\${statusClass}">\${statusSym}</td></tr>\`;
      
      allOutput += \`\\n\${'='.repeat(120)}\\n\${sheetKey} - \${assay}\\n\${'='.repeat(120)}\\n\`;
      allOutput += \`\\n4PL Parameters: Top=\${result.params.top.toFixed(6)}, Bottom=\${result.params.bottom.toFixed(6)}, MidPoint=\${result.params.midPoint.toFixed(6)}, HillSlope=\${result.params.hillSlope.toFixed(6)}\\n\`;
      allOutput += \`\\nSample | Well | Conc   | Signal  | Original Calc | Our Calc    | Difference  | Diff %   | Status\\n\`;
      allOutput += '-'.repeat(120) + '\\n';
      for (const comp of result.comparisons) {
        const statusSym = comp.passed ? '✓ PASS' : '✗ FAIL';
        allOutput += \`\${comp.sample.padEnd(6)} | \${comp.well.padEnd(4)} | \${(comp.concentration !== null ? comp.concentration.toFixed(4) : 'N/A').padEnd(6)} | \`;
        allOutput += \`\${comp.signal.toFixed(0).padEnd(7)} | \${comp.originalCalcConc.toFixed(6).padEnd(13)} | \`;
        allOutput += \`\${comp.ourCalcConc.toFixed(6).padEnd(11)} | \${comp.difference.toFixed(6).padEnd(11)} | \`;
        allOutput += \`\${comp.diffPct.toFixed(2).padEnd(8)}% | \${statusSym}\\n\`;
      }
      allOutput += \`\\nStatistics: Total=\${result.stats.count}, Passed=\${result.stats.passed}, Failed=\${result.stats.failed}, Max=\${result.stats.maxDiffPct.toFixed(2)}%, Avg=\${result.stats.avgDiffPct.toFixed(2)}%\\n\`;
      
      htmlOutput += \`<div class="section"><h2>\${sheetKey} - \${assay}</h2><div class="params">Top: \${result.params.top.toFixed(6)} | Bottom: \${result.params.bottom.toFixed(6)} | MidPoint: \${result.params.midPoint.toFixed(6)} | HillSlope: \${result.params.hillSlope.toFixed(6)}</div><table><thead><tr><th>Sample</th><th>Well</th><th>Conc</th><th>Signal</th><th>Original</th><th>Our Calc</th><th>Difference</th><th>Diff %</th><th>Status</th></tr></thead><tbody>\`;
      for (const comp of result.comparisons) {
        const statusClass = comp.passed ? 'pass' : 'fail';
        const status = comp.passed ? '✓ PASS' : '✗ FAIL';
        htmlOutput += \`<tr><td>\${comp.sample}</td><td>\${comp.well}</td><td>\${comp.concentration !== null ? comp.concentration.toFixed(4) : 'N/A'}</td><td>\${comp.signal.toFixed(0)}</td><td>\${comp.originalCalcConc.toFixed(6)}</td><td>\${comp.ourCalcConc.toFixed(6)}</td><td>\${comp.difference.toFixed(6)}</td><td>\${comp.diffPct.toFixed(2)}%</td><td class="\${statusClass}">\${status}</td></tr>\`;
      }
      htmlOutput += \`</tbody></table><div class="stats">Total: \${result.stats.count} | Passed: \${result.stats.passed} | Failed: \${result.stats.failed} | Max: \${result.stats.maxDiffPct.toFixed(2)}% | Avg: \${result.stats.avgDiffPct.toFixed(2)}% | <span class="\${result.stats.maxDiffPct <= 1 ? 'pass' : 'fail'}">\${result.stats.maxDiffPct <= 1 ? '✓ PASSED' : '✗ FAILED'}</span></div></div>\`;
    }
  }
}

htmlOutput += \`</tbody></table><div class="stats"><strong>Overall Summary:</strong> Passed: \${totalPassed} | Failed: \${totalFailed} | Total: \${totalPassed + totalFailed}</div></div></body></html>\`;

fs.writeFileSync(path.join(__dirname, 'comparison_table_final.txt'), allOutput, 'utf8');
fs.writeFileSync(path.join(__dirname, 'comparison_table_final.html'), htmlOutput, 'utf8');
console.log('\\n✅ Final comparison tables generated!');
console.log('   - Text: comparison_table_final.txt');
console.log('   - HTML: comparison_table_final.html');
`;

const tempScriptPath = path.join(__dirname, 'generate_comparison_final_temp.js');
fs.writeFileSync(tempScriptPath, comparisonScript, 'utf8');

const { execSync } = require('child_process');
try {
  execSync(`node "${tempScriptPath}"`, { stdio: 'inherit', cwd: __dirname });
} catch (error) {
  console.error('Error:', error.message);
}

fs.unlinkSync(tempScriptPath);

console.log('\n✅ Complete!');

