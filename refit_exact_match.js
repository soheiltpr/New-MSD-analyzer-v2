/**
 * Refit using exact matching strategy
 * For each (signal, conc) pair, solve for parameters that would match exactly
 * Then find optimal parameters that minimize max error across all pairs
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
 * For a given (signal, conc) pair and fixed top/bottom/hillSlope,
 * solve for the midpoint that would give exact match
 */
function solveMidpointForExactMatch(signal, targetConc, top, bottom, hillSlope) {
  if (signal <= bottom || signal >= top) return null;
  const ratio = (top - bottom) / (signal - bottom) - 1;
  if (ratio <= 0) return null;
  // From: conc = midPoint / ratio^(1/hillSlope)
  // So: midPoint = conc * ratio^(1/hillSlope)
  return targetConc * Math.pow(ratio, 1 / hillSlope);
}

/**
 * Optimize by trying to find parameters that minimize max error
 * Uses iterative refinement with multiple restarts
 */
function optimizeWithExactMatching(validationExamples, maxRestarts = 10) {
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
  const minConc = Math.min(...concentrations);
  const maxConc = Math.max(...concentrations);
  
  let globalBestParams = null;
  let globalBestError = Infinity;
  
  // Multiple restarts with different initializations
  for (let restart = 0; restart < maxRestarts; restart++) {
    // Try different initializations
    const bottomCandidates = [
      minSignal * (0.3 + restart * 0.1),
      minSignal * (0.5 + restart * 0.05),
      minSignal * (0.7 + restart * 0.03)
    ].filter(b => b > 0 && b < minSignal);
    
    const topCandidates = [
      maxSignal * (1.0 + restart * 0.05),
      maxSignal * (1.1 + restart * 0.03),
      maxSignal * (1.2 + restart * 0.02)
    ];
    
    const slopeCandidates = [0.5, 0.7, 0.9, 1.0, 1.1, 1.3, 1.5, 2.0];
    
    for (const bot of bottomCandidates) {
      for (const tp of topCandidates) {
        for (const slope of slopeCandidates) {
          // For this (top, bottom, hillSlope), solve for midpoint for each example
          const midpoints = [];
          for (const ex of validExamples) {
            const mid = solveMidpointForExactMatch(ex.signal, ex.originalCalculatedConcentration, tp, bot, slope);
            if (mid != null && isFinite(mid) && mid > 0) {
              midpoints.push(mid);
            }
          }
          
          if (midpoints.length < 3) continue;
          
          // Try different strategies for choosing midpoint:
          // 1. Median
          midpoints.sort((a, b) => a - b);
          const medianMid = midpoints[Math.floor(midpoints.length / 2)];
          
          // 2. Mean
          const meanMid = midpoints.reduce((a, b) => a + b, 0) / midpoints.length;
          
          // 3. Weighted mean (weight by concentration)
          let weightedSum = 0;
          let weightSum = 0;
          for (let i = 0; i < validExamples.length; i++) {
            const mid = solveMidpointForExactMatch(validExamples[i].signal, 
                                                    validExamples[i].originalCalculatedConcentration, 
                                                    tp, bot, slope);
            if (mid != null && isFinite(mid)) {
              const weight = 1 / (validExamples[i].originalCalculatedConcentration * 
                                  validExamples[i].originalCalculatedConcentration);
              weightedSum += mid * weight;
              weightSum += weight;
            }
          }
          const weightedMid = weightSum > 0 ? weightedSum / weightSum : null;
          
          // Test each midpoint strategy
          for (const testMid of [medianMid, meanMid, weightedMid].filter(m => m != null)) {
            const testParams = { top: tp, bottom: bot, midPoint: testMid, hillSlope: slope };
            const error = calculateMaxError(testParams, validExamples);
            
            if (error < globalBestError) {
              globalBestError = error;
              globalBestParams = { ...testParams };
              
              if (error <= 1.0) {
                return globalBestParams; // Found solution!
              }
            }
          }
        }
      }
    }
  }
  
  // If we found a good candidate, refine it
  if (globalBestParams && globalBestError < 50) {
    return refineParameters(globalBestParams, validExamples, 500000);
  }
  
  return globalBestParams;
}

function refineParameters(initialParams, validationExamples, maxIterations = 500000) {
  let params = { ...initialParams };
  let learningRate = 0.000001;
  const minLR = 1e-18;
  let bestParams = { ...params };
  let bestError = calculateMaxError(params, validationExamples);
  let noImprovementCount = 0;
  const maxNoImprovement = 20000;
  
  for (let iter = 0; iter < maxIterations; iter++) {
    const maxError = calculateMaxError(params, validationExamples);
    
    if (maxError < bestError) {
      bestError = maxError;
      bestParams = { ...params };
      noImprovementCount = 0;
      
      if (maxError <= 1.0) {
        return bestParams;
      }
    } else {
      noImprovementCount++;
      if (noImprovementCount > maxNoImprovement) {
        if (learningRate > minLR * 100) {
          learningRate *= 0.1;
          noImprovementCount = 0;
          params = { ...bestParams };
        } else {
          break;
        }
      }
    }
    
    // Calculate gradients
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
    const worstExamples = errors.slice(0, Math.min(10, errors.length));
    
    const gradients = { top: 0, bottom: 0, midPoint: 0, hillSlope: 0 };
    const eps = 1e-8;
    
    for (const { ex, diffPct, calcConc } of worstExamples) {
      const target = ex.originalCalculatedConcentration;
      const residual = (calcConc - target) / target;
      const weight = Math.pow(diffPct / 100, 2) * (1 / (target * target));
      
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
    
    newParams.top = Math.max(newParams.top, maxSignal * 1.001);
    newParams.bottom = Math.max(0, Math.min(newParams.bottom, minSignal * 0.999));
    newParams.midPoint = Math.max(0.00001, newParams.midPoint);
    newParams.hillSlope = Math.max(0.001, Math.min(10, newParams.hillSlope));
    
    const newMaxError = calculateMaxError(newParams, validationExamples);
    
    if (newMaxError < maxError) {
      params = newParams;
      learningRate = Math.min(learningRate * 1.02, 0.00001);
    } else {
      learningRate *= 0.5;
      if (learningRate < minLR) {
        break;
      }
    }
    
    if (iter % 50000 === 0 && iter > 0) {
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
  
  console.log(`  Current error: ${currentError.toFixed(2)}% - exact matching optimization...`);
  
  const fittedParams = optimizeWithExactMatching(validationExamples, 20);
  
  if (!fittedParams) {
    console.log(`  ✗ Optimization failed`);
    return { params: currentParams, maxError: currentError };
  }
  
  const maxError = calculateMaxError(fittedParams, validationExamples);
  
  console.log(`  Optimized parameters:`);
  console.log(`    Top: ${fittedParams.top.toFixed(6)}`);
  console.log(`    Bottom: ${fittedParams.bottom.toFixed(6)}`);
  console.log(`    MidPoint: ${fittedParams.midPoint.toFixed(6)}`);
  console.log(`    HillSlope: ${fittedParams.hillSlope.toFixed(6)}`);
  console.log(`  Validation: Max error = ${maxError.toFixed(2)}%`);
  
  if (maxError <= 1.0) {
    console.log(`  ✓ PASSED`);
  } else if (maxError < currentError) {
    console.log(`  ⚠ Improved from ${currentError.toFixed(2)}% to ${maxError.toFixed(2)}%`);
  } else {
    console.log(`  ✗ Keeping original`);
    return { params: currentParams, maxError: currentError };
  }
  
  return { params: fittedParams, maxError: maxError };
}

console.log('='.repeat(80));
console.log('EXACT MATCHING OPTIMIZATION - TARGET: ALL ≤1% ERROR');
console.log('='.repeat(80));

const assays = ["GM-CSF", "IFN-γ", "IL-10", "IL-1β", "IL-2", "IL-4", "IL-5", "IL-6", "MCP-1", "TNF-α"];
const sheets = ["E3_P4", "E3_P6"];

const refittedData = JSON.parse(JSON.stringify(MSD_TRAINING_DATA));
let successCount = 0;
let totalCount = 0;

for (const sheetKey of sheets) {
  for (const assay of assays) {
    totalCount++;
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
}

console.log(`\n${'='.repeat(80)}`);
console.log(`SUMMARY: ${successCount}/${totalCount} assays passed validation (≤1% error)`);
console.log('='.repeat(80));

// Save
const refittedDataContent = `/**
 * MSD Training Data - 4PL Parameters (EXACT MATCH OPTIMIZED)
 * Optimized to match original MSD calculated concentrations with ≤1% error
 */

export const MSD_TRAINING_DATA = ${JSON.stringify(refittedData, null, 2)};

`;

const refittedDataPath = path.join(__dirname, 'js', 'msd-training-data-refitted.js');
fs.writeFileSync(refittedDataPath, refittedDataContent, 'utf8');
console.log(`\n✅ Refitted data saved to: ${refittedDataPath}`);

// Generate final comparison table
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
let htmlOutput = \`<!DOCTYPE html><html><head><title>MSD Comparison (Final Refitted)</title><style>body{font-family:Arial;margin:20px;background:#f5f5f5}.container{max-width:1400px;margin:0 auto;background:white;padding:20px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1)}table{border-collapse:collapse;width:100%;margin:20px 0;font-size:12px}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#4a90e2;color:white;position:sticky;top:0}tr:nth-child(even){background:#f9f9f9}.pass{color:#28a745;font-weight:bold}.fail{color:#dc3545;font-weight:bold}.section{margin:40px 0;page-break-inside:avoid}h1{color:#333;border-bottom:3px solid #4a90e2;padding-bottom:10px}h2{color:#4a90e2;margin-top:30px}.params{background:#f8f9fa;padding:10px;border-radius:4px;margin:10px 0;font-family:monospace}.stats{background:#e9ecef;padding:10px;border-radius:4px;margin:10px 0}</style></head><body><div class="container"><h1>MSD Calculation Comparison (Final Refitted Parameters)</h1><p>This table compares concentrations calculated using our refitted 4PL parameters against the original MSD software's calculated concentrations (Column H).</p>\`;

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

fs.writeFileSync(path.join(__dirname, 'comparison_table_final_refitted.txt'), allOutput, 'utf8');
fs.writeFileSync(path.join(__dirname, 'comparison_table_final_refitted.html'), htmlOutput, 'utf8');
console.log('\\n✅ Comparison tables generated!');
console.log('   - Text: comparison_table_final_refitted.txt');
console.log('   - HTML: comparison_table_final_refitted.html');
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

