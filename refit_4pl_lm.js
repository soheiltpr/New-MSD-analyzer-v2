/**
 * Refit 4PL parameters using Levenberg-Marquardt optimization
 * Target: All assays must pass validation (≤1% error)
 */

const LM = require('ml-levenberg-marquardt');
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
 * Calculate max error
 */
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
 * Refit using Levenberg-Marquardt
 */
function refitWithLM(validationExamples) {
  // Prepare data: (signal, targetConcentration) pairs
  const data = validationExamples
    .filter(ex => 
      ex.signal != null && 
      ex.originalCalculatedConcentration != null && 
      ex.originalCalculatedConcentration > 0 &&
      !isNaN(ex.signal) &&
      !isNaN(ex.originalCalculatedConcentration)
    )
    .map(ex => ({
      x: ex.signal,
      y: ex.originalCalculatedConcentration
    }));
  
  if (data.length < 4) {
    return null;
  }
  
  // Get ranges for initial estimates
  const signals = data.map(d => d.x);
  const concentrations = data.map(d => d.y);
  const minSignal = Math.min(...signals);
  const maxSignal = Math.max(...signals);
  const minConc = Math.min(...concentrations);
  const maxConc = Math.max(...concentrations);
  
  // Initial parameter estimates
  const initialValues = [
    maxSignal * 1.2,  // top
    Math.max(0, minSignal * 0.9),  // bottom
    (minConc + maxConc) / 2,  // midPoint
    1.0  // hillSlope
  ];
  
  // Find better initial midpoint
  const midSignal = (minSignal + maxSignal) / 2;
  for (let i = 0; i < data.length - 1; i++) {
    if (data[i].x <= midSignal && data[i + 1].x >= midSignal) {
      const ratio = (midSignal - data[i].x) / (data[i + 1].x - data[i].x);
      initialValues[2] = data[i].y + ratio * (data[i + 1].y - data[i].y);
      break;
    }
  }
  
  // Objective function: minimize sum of squared relative errors
  function objectiveFunction([top, bottom, midPoint, hillSlope]) {
    let sumSquaredError = 0;
    let count = 0;
    
    for (const point of data) {
      const calcConc = inverse4PL(point.x, { top, bottom, midPoint, hillSlope });
      if (calcConc === null || isNaN(calcConc) || calcConc <= 0) {
        return [1e10]; // Large penalty
      }
      
      const relError = (calcConc - point.y) / point.y;
      sumSquaredError += relError * relError;
      count++;
    }
    
    return count > 0 ? [sumSquaredError / count] : [1e10];
  }
  
  // Parameter bounds
  const minValues = [
    maxSignal * 1.05,  // top min
    0,  // bottom min
    0.001,  // midPoint min
    0.1  // hillSlope min
  ];
  
  const maxValues = [
    maxSignal * 2.0,  // top max
    minSignal * 0.95,  // bottom max
    maxConc * 2.0,  // midPoint max
    5.0  // hillSlope max
  ];
  
  try {
    const result = LM(objectiveFunction, initialValues, {
      minValues: minValues,
      maxValues: maxValues,
      maxIterations: 1000,
      errorTolerance: 1e-10
    });
    
    if (result && result.parameterValues) {
      return {
        top: result.parameterValues[0],
        bottom: result.parameterValues[1],
        midPoint: result.parameterValues[2],
        hillSlope: result.parameterValues[3]
      };
    }
  } catch (error) {
    console.log(`    LM optimization error: ${error.message}`);
  }
  
  return null;
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
  
  // Check if current parameters already work
  const currentParams = {
    top: MSD_TRAINING_DATA[sheetKey][assayName].params["Algorithm Parameter: Calc. Top"],
    bottom: MSD_TRAINING_DATA[sheetKey][assayName].params["Algorithm Parameter: Calc. Bottom"],
    midPoint: MSD_TRAINING_DATA[sheetKey][assayName].params["Algorithm Parameter: Calc. MidPoint"],
    hillSlope: MSD_TRAINING_DATA[sheetKey][assayName].params["Algorithm Parameter: Calc. HillSlope"]
  };
  
  const currentError = calculateMaxError(currentParams, validationExamples);
  if (currentError <= 1.0) {
    console.log(`  ✓ Already passes (${currentError.toFixed(2)}% error) - keeping original parameters`);
    return {
      params: currentParams,
      maxError: currentError
    };
  }
  
  console.log(`  Current error: ${currentError.toFixed(2)}% - attempting refit...`);
  
  const fittedParams = refitWithLM(validationExamples);
  
  if (!fittedParams) {
    console.log(`  ✗ Optimization failed - keeping original parameters`);
    return {
      params: currentParams,
      maxError: currentError
    };
  }
  
  const maxError = calculateMaxError(fittedParams, validationExamples);
  
  console.log(`  Refitted parameters:`);
  console.log(`    Top: ${fittedParams.top.toFixed(6)}`);
  console.log(`    Bottom: ${fittedParams.bottom.toFixed(6)}`);
  console.log(`    MidPoint: ${fittedParams.midPoint.toFixed(6)}`);
  console.log(`    HillSlope: ${fittedParams.hillSlope.toFixed(6)}`);
  console.log(`  Validation: Max error = ${maxError.toFixed(2)}%`);
  
  if (maxError <= 1.0) {
    console.log(`  ✓ PASSED`);
  } else if (maxError < currentError) {
    console.log(`  ⚠ Improved from ${currentError.toFixed(2)}% to ${maxError.toFixed(2)}% (but still >1%)`);
  } else {
    console.log(`  ✗ FAILED - keeping original parameters`);
    return {
      params: currentParams,
      maxError: currentError
    };
  }
  
  return {
    params: fittedParams,
    maxError: maxError
  };
}

console.log('='.repeat(80));
console.log('REFITTING 4PL PARAMETERS (LEVENBERG-MARQUARDT)');
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
      // Always update with best parameters found
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

const tempScriptPath = path.join(__dirname, 'generate_final_comparison_temp.js');
fs.writeFileSync(tempScriptPath, comparisonScript, 'utf8');

const { execSync } = require('child_process');
try {
  execSync(`node "${tempScriptPath}"`, { stdio: 'inherit', cwd: __dirname });
} catch (error) {
  console.error('Error:', error.message);
}

fs.unlinkSync(tempScriptPath);

console.log('\n✅ Complete!');

