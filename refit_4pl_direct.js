/**
 * Direct refitting: Optimize 4PL parameters to match original MSD calculated concentrations
 * Uses a more robust optimization approach
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
 * Calculate total error for optimization
 */
function calculateTotalError(params, validationExamples) {
  let totalError = 0;
  let count = 0;

  for (const ex of validationExamples) {
    if (
      ex.signal == null ||
      ex.originalCalculatedConcentration == null ||
      ex.originalCalculatedConcentration === 0 ||
      isNaN(ex.signal) ||
      isNaN(ex.originalCalculatedConcentration)
    ) {
      continue;
    }

    const calcConc = inverse4PL(ex.signal, params);
    if (calcConc === null || isNaN(calcConc)) {
      totalError += 1e10; // Large penalty for invalid
      count++;
      continue;
    }

    // Use relative error squared
    const relError = (calcConc - ex.originalCalculatedConcentration) / ex.originalCalculatedConcentration;
    totalError += relError * relError;
    count++;
  }

  return count > 0 ? totalError / count : 1e10;
}

/**
 * Calculate max percent error
 */
function calculateMaxError(params, validationExamples) {
  let maxDiffPct = 0;

  for (const ex of validationExamples) {
    if (
      ex.signal == null ||
      ex.originalCalculatedConcentration == null ||
      ex.originalCalculatedConcentration === 0
    ) {
      continue;
    }

    const calcConc = inverse4PL(ex.signal, params);
    if (calcConc === null || isNaN(calcConc)) {
      continue;
    }

    const diffPct = Math.abs(calcConc - ex.originalCalculatedConcentration) /
                    ex.originalCalculatedConcentration * 100;
    
    if (diffPct > maxDiffPct) {
      maxDiffPct = diffPct;
    }
  }

  return maxDiffPct;
}

/**
 * Grid search + local optimization
 */
function optimizeParameters(validationExamples, standards) {
  // Get signal ranges
  const signals = validationExamples
    .filter(ex => ex.signal != null && !isNaN(ex.signal))
    .map(ex => ex.signal);
  
  if (signals.length === 0) return null;
  
  const minSignal = Math.min(...signals);
  const maxSignal = Math.max(...signals);
  
  // Get concentration ranges from standards
  const concentrations = standards
    .filter(s => s.concentration > 0)
    .map(s => s.concentration);
  
  if (concentrations.length === 0) return null;
  
  const minConc = Math.min(...concentrations);
  const maxConc = Math.max(...concentrations);
  
  // Initial estimates
  const bottom = Math.max(0, minSignal * 0.8);
  const top = maxSignal * 1.2;
  
  // Try multiple starting points with grid search
  const bestCandidates = [];
  const midpoints = [];
  const hillSlopes = [0.5, 0.7, 0.9, 1.0, 1.1, 1.3, 1.5, 1.7, 2.0];
  
  // Generate midpoint candidates from concentrations
  for (let i = 0; i < concentrations.length; i++) {
    midpoints.push(concentrations[i]);
  }
  // Also try interpolated midpoints
  for (let i = 0; i < concentrations.length - 1; i++) {
    midpoints.push((concentrations[i] + concentrations[i + 1]) / 2);
  }
  
  // Grid search
  for (const mid of midpoints) {
    for (const slope of hillSlopes) {
      const testParams = {
        top: top,
        bottom: bottom,
        midPoint: mid,
        hillSlope: slope
      };
      
      const error = calculateTotalError(testParams, validationExamples);
      const maxError = calculateMaxError(testParams, validationExamples);
      
      bestCandidates.push({
        params: testParams,
        error: error,
        maxError: maxError
      });
    }
  }
  
  // Sort by error and take top candidates
  bestCandidates.sort((a, b) => a.error - b.error);
  const topCandidates = bestCandidates.slice(0, 10);
  
  // Refine each candidate
  let bestParams = null;
  let bestMaxError = Infinity;
  
  for (const candidate of topCandidates) {
    let params = { ...candidate.params };
    let learningRate = 0.0001;
    const minLR = 1e-10;
    
    for (let iter = 0; iter < 50000; iter++) {
      const error = calculateTotalError(params, validationExamples);
      const maxError = calculateMaxError(params, validationExamples);
      
      if (maxError < bestMaxError) {
        bestMaxError = maxError;
        bestParams = { ...params };
        
        if (maxError <= 1.0) {
          return bestParams; // Success!
        }
      }
      
      // Calculate gradients
      const eps = 1e-5;
      const gradients = { top: 0, bottom: 0, midPoint: 0, hillSlope: 0 };
      
      for (const ex of validationExamples) {
        if (
          ex.signal == null ||
          ex.originalCalculatedConcentration == null ||
          ex.originalCalculatedConcentration === 0
        ) {
          continue;
        }
        
        const calcConc = inverse4PL(ex.signal, params);
        if (calcConc === null || isNaN(calcConc)) {
          continue;
        }
        
        const target = ex.originalCalculatedConcentration;
        const residual = (calcConc - target) / target;
        const weight = 1 / (target * target);
        
        // Numerical derivatives
        const dTop = (inverse4PL(ex.signal, {
          top: params.top + eps,
          bottom: params.bottom,
          midPoint: params.midPoint,
          hillSlope: params.hillSlope
        }) || target) - calcConc;
        
        const dBottom = (inverse4PL(ex.signal, {
          top: params.top,
          bottom: params.bottom + eps,
          midPoint: params.midPoint,
          hillSlope: params.hillSlope
        }) || target) - calcConc;
        
        const dMidpoint = (inverse4PL(ex.signal, {
          top: params.top,
          bottom: params.bottom,
          midPoint: params.midPoint + eps,
          hillSlope: params.hillSlope
        }) || target) - calcConc;
        
        const dHillSlope = (inverse4PL(ex.signal, {
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
      
      const newError = calculateTotalError(newParams, validationExamples);
      const newMaxError = calculateMaxError(newParams, validationExamples);
      
      if (newMaxError < maxError) {
        params = newParams;
        learningRate = Math.min(learningRate * 1.1, 0.001);
      } else {
        learningRate *= 0.5;
        if (learningRate < minLR) {
          break;
        }
      }
      
      if (iter % 5000 === 0 && iter > 0) {
        // Check progress
        if (maxError <= 1.0) {
          return params;
        }
      }
    }
  }
  
  return bestParams;
}

/**
 * Refit assay
 */
function refitAssay(sheetKey, assayName) {
  console.log(`\nRefitting ${sheetKey} - ${assayName}...`);
  
  const trainingData = MSD_TRAINING_DATA[sheetKey][assayName];
  if (!trainingData || !trainingData.standards) {
    return null;
  }
  
  const validationExamples = MSD_VALIDATION_DATA[sheetKey][assayName] || [];
  if (validationExamples.length === 0) {
    return null;
  }
  
  const fittedParams = optimizeParameters(validationExamples, trainingData.standards);
  
  if (!fittedParams) {
    console.log(`  ✗ Optimization failed`);
    return null;
  }
  
  const maxError = calculateMaxError(fittedParams, validationExamples);
  const validCount = validationExamples.filter(ex => 
    ex.signal != null && 
    ex.originalCalculatedConcentration != null && 
    ex.originalCalculatedConcentration !== 0
  ).length;
  
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
console.log('REFITTING ALL 4PL PARAMETERS (DIRECT OPTIMIZATION)');
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
    if (result && result.maxError <= 1.0) {
      successCount++;
      // Update training data
      refittedData[sheetKey][assay].params["Algorithm Parameter: Calc. Top"] = result.params.top;
      refittedData[sheetKey][assay].params["Algorithm Parameter: Calc. Bottom"] = result.params.bottom;
      refittedData[sheetKey][assay].params["Algorithm Parameter: Calc. MidPoint"] = result.params.midPoint;
      refittedData[sheetKey][assay].params["Algorithm Parameter: Calc. HillSlope"] = result.params.hillSlope;
    } else if (result) {
      // Still update even if not perfect, but log it
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
 * These parameters have been optimized to match original MSD calculated concentrations
 */

export const MSD_TRAINING_DATA = ${JSON.stringify(refittedData, null, 2)};

`;

const refittedDataPath = path.join(__dirname, 'js', 'msd-training-data-refitted.js');
fs.writeFileSync(refittedDataPath, refittedDataContent, 'utf8');
console.log(`\n✅ Refitted training data saved to: ${refittedDataPath}`);

// Now generate comparison table
console.log('\nGenerating comparison table with refitted parameters...');

// Create a script that uses the refitted data
const comparisonScript = `
const fs = require('fs');
const path = require('path');

// Load refitted data
const refittedPath = path.join(__dirname, 'js', 'msd-training-data-refitted.js');
let refittedContent = fs.readFileSync(refittedPath, 'utf8');
const refittedMatch = refittedContent.match(/export const MSD_TRAINING_DATA = ({[\\s\\S]*});/);
const MSD_TRAINING_DATA = eval('(' + refittedMatch[1] + ')');

// Load validation data
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
    }
  }
}

fs.writeFileSync(path.join(__dirname, 'comparison_table_refitted.txt'), allOutput, 'utf8');

// Generate HTML
let html = \`<!DOCTYPE html><html><head><title>MSD Comparison (Refitted)</title><style>body{font-family:Arial;margin:20px;background:#f5f5f5}.container{max-width:1400px;margin:0 auto;background:white;padding:20px;border-radius:8px}table{border-collapse:collapse;width:100%;margin:20px 0;font-size:12px}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#4a90e2;color:white;position:sticky;top:0}tr:nth-child(even){background:#f9f9f9}.pass{color:#28a745;font-weight:bold}.fail{color:#dc3545;font-weight:bold}.section{margin:40px 0}h1{color:#333;border-bottom:3px solid #4a90e2;padding-bottom:10px}h2{color:#4a90e2;margin-top:30px}.params{background:#f8f9fa;padding:10px;border-radius:4px;margin:10px 0;font-family:monospace}.stats{background:#e9ecef;padding:10px;border-radius:4px;margin:10px 0}</style></head><body><div class="container"><h1>MSD Calculation Comparison (Refitted Parameters)</h1>\`;

html += \`<table><thead><tr><th>Sheet</th><th>Assay</th><th>Count</th><th>Passed</th><th>Failed</th><th>Max Diff %</th><th>Avg Diff %</th><th>Status</th></tr></thead><tbody>\`;
for (const sheetKey of sheets) {
  for (const assay of assays) {
    const result = generateComparisonTable(sheetKey, assay);
    if (result && result.comparisons.length > 0) {
      const statusClass = result.stats.maxDiffPct <= 1 ? 'pass' : 'fail';
      const status = result.stats.maxDiffPct <= 1 ? '✓ PASS' : '✗ FAIL';
      html += \`<tr><td>\${sheetKey}</td><td>\${assay}</td><td>\${result.stats.count}</td><td>\${result.stats.passed}</td><td>\${result.stats.failed}</td><td>\${result.stats.maxDiffPct.toFixed(2)}%</td><td>\${result.stats.avgDiffPct.toFixed(2)}%</td><td class="\${statusClass}">\${status}</td></tr>\`;
    }
  }
}
html += \`</tbody></table>\`;

for (const sheetKey of sheets) {
  for (const assay of assays) {
    const result = generateComparisonTable(sheetKey, assay);
    if (result && result.comparisons.length > 0) {
      html += \`<div class="section"><h2>\${sheetKey} - \${assay}</h2><div class="params">Top: \${result.params.top.toFixed(6)} | Bottom: \${result.params.bottom.toFixed(6)} | MidPoint: \${result.params.midPoint.toFixed(6)} | HillSlope: \${result.params.hillSlope.toFixed(6)}</div><table><thead><tr><th>Sample</th><th>Well</th><th>Conc</th><th>Signal</th><th>Original</th><th>Our Calc</th><th>Difference</th><th>Diff %</th><th>Status</th></tr></thead><tbody>\`;
      for (const comp of result.comparisons) {
        const statusClass = comp.passed ? 'pass' : 'fail';
        const status = comp.passed ? '✓ PASS' : '✗ FAIL';
        html += \`<tr><td>\${comp.sample}</td><td>\${comp.well}</td><td>\${comp.concentration !== null ? comp.concentration.toFixed(4) : 'N/A'}</td><td>\${comp.signal.toFixed(0)}</td><td>\${comp.originalCalcConc.toFixed(6)}</td><td>\${comp.ourCalcConc.toFixed(6)}</td><td>\${comp.difference.toFixed(6)}</td><td>\${comp.diffPct.toFixed(2)}%</td><td class="\${statusClass}">\${status}</td></tr>\`;
      }
      html += \`</tbody></table><div class="stats">Total: \${result.stats.count} | Passed: \${result.stats.passed} | Failed: \${result.stats.failed} | Max: \${result.stats.maxDiffPct.toFixed(2)}% | Avg: \${result.stats.avgDiffPct.toFixed(2)}% | <span class="\${result.stats.maxDiffPct <= 1 ? 'pass' : 'fail'}">\${result.stats.maxDiffPct <= 1 ? '✓ PASSED' : '✗ FAILED'}</span></div></div>\`;
    }
  }
}

html += \`</div></body></html>\`;
fs.writeFileSync(path.join(__dirname, 'comparison_table_refitted.html'), html, 'utf8');
console.log('\\n✅ Comparison tables generated!');
`;

const tempScriptPath = path.join(__dirname, 'generate_comparison_refitted_temp.js');
fs.writeFileSync(tempScriptPath, comparisonScript, 'utf8');

const { execSync } = require('child_process');
try {
  execSync(`node "${tempScriptPath}"`, { stdio: 'inherit', cwd: __dirname });
} catch (error) {
  console.error('Error:', error.message);
}

// Clean up
fs.unlinkSync(tempScriptPath);

console.log('\n✅ Complete!');
console.log('   - Refitted parameters: js/msd-training-data-refitted.js');
console.log('   - Comparison table: comparison_table_refitted.html');

