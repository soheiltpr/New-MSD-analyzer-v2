/**
 * Generate final comparison table using updated parameters from images
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
console.log('Using parameters from Plate Analysis Properties images');
console.log('='.repeat(120));
console.log('\nSheet  | Assay    | Count | Passed | Failed | Max Diff % | Avg Diff % | Status');
console.log('-'.repeat(120));

let allOutput = '';
let htmlOutput = `<!DOCTYPE html><html><head><title>MSD Comparison (Final - Image Parameters)</title><style>body{font-family:Arial;margin:20px;background:#f5f5f5}.container{max-width:1400px;margin:0 auto;background:white;padding:20px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1)}table{border-collapse:collapse;width:100%;margin:20px 0;font-size:12px}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#4a90e2;color:white;position:sticky;top:0}tr:nth-child(even){background:#f9f9f9}.pass{color:#28a745;font-weight:bold}.fail{color:#dc3545;font-weight:bold}.section{margin:40px 0;page-break-inside:avoid}h1{color:#333;border-bottom:3px solid #4a90e2;padding-bottom:10px}h2{color:#4a90e2;margin-top:30px}.params{background:#f8f9fa;padding:10px;border-radius:4px;margin:10px 0;font-family:monospace}.stats{background:#e9ecef;padding:10px;border-radius:4px;margin:10px 0}</style></head><body><div class="container"><h1>MSD Calculation Comparison (Final - Using Image Parameters)</h1><p>This table compares concentrations calculated using parameters from Plate Analysis Properties images against the original MSD software's calculated concentrations (Column H).</p>`;

htmlOutput += `<table><thead><tr><th>Sheet</th><th>Assay</th><th>Count</th><th>Passed</th><th>Failed</th><th>Max Diff %</th><th>Avg Diff %</th><th>Status</th></tr></thead><tbody>`;

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
        `${sheetKey.padEnd(6)} | ${assay.padEnd(8)} | ${result.stats.count.toString().padEnd(5)} | ` +
        `${result.stats.passed.toString().padEnd(6)} | ${result.stats.failed.toString().padEnd(6)} | ` +
        `${result.stats.maxDiffPct.toFixed(6).padEnd(10)}% | ${result.stats.avgDiffPct.toFixed(6).padEnd(10)}% | ${status}`
      );
      
      const statusClass = result.stats.maxDiffPct <= 1 ? 'pass' : 'fail';
      const statusSym = result.stats.maxDiffPct <= 1 ? '✓ PASS' : '✗ FAIL';
      htmlOutput += `<tr><td>${sheetKey}</td><td>${assay}</td><td>${result.stats.count}</td><td>${result.stats.passed}</td><td>${result.stats.failed}</td><td>${result.stats.maxDiffPct.toFixed(6)}%</td><td>${result.stats.avgDiffPct.toFixed(6)}%</td><td class="${statusClass}">${statusSym}</td></tr>`;
      
      allOutput += `\n${'='.repeat(120)}\n${sheetKey} - ${assay}\n${'='.repeat(120)}\n`;
      allOutput += `\n4PL Parameters: Top=${result.params.top.toFixed(6)}, Bottom=${result.params.bottom.toFixed(6)}, MidPoint=${result.params.midPoint.toFixed(6)}, HillSlope=${result.params.hillSlope.toFixed(6)}\n`;
      allOutput += `\nSample | Well | Conc   | Signal  | Original Calc | Our Calc    | Difference  | Diff %   | Status\n`;
      allOutput += '-'.repeat(120) + '\n';
      for (const comp of result.comparisons) {
        const statusSym = comp.passed ? '✓ PASS' : '✗ FAIL';
        allOutput += `${comp.sample.padEnd(6)} | ${comp.well.padEnd(4)} | ${(comp.concentration !== null ? comp.concentration.toFixed(4) : 'N/A').padEnd(6)} | `;
        allOutput += `${comp.signal.toFixed(0).padEnd(7)} | ${comp.originalCalcConc.toFixed(6).padEnd(13)} | `;
        allOutput += `${comp.ourCalcConc.toFixed(6).padEnd(11)} | ${comp.difference.toFixed(6).padEnd(11)} | `;
        allOutput += `${comp.diffPct.toFixed(6).padEnd(8)}% | ${statusSym}\n`;
      }
      allOutput += `\nStatistics: Total=${result.stats.count}, Passed=${result.stats.passed}, Failed=${result.stats.failed}, Max=${result.stats.maxDiffPct.toFixed(6)}%, Avg=${result.stats.avgDiffPct.toFixed(6)}%\n`;
      
      htmlOutput += `<div class="section"><h2>${sheetKey} - ${assay}</h2><div class="params">Top: ${result.params.top.toFixed(6)} | Bottom: ${result.params.bottom.toFixed(6)} | MidPoint: ${result.params.midPoint.toFixed(6)} | HillSlope: ${result.params.hillSlope.toFixed(6)}</div><table><thead><tr><th>Sample</th><th>Well</th><th>Conc</th><th>Signal</th><th>Original</th><th>Our Calc</th><th>Difference</th><th>Diff %</th><th>Status</th></tr></thead><tbody>`;
      for (const comp of result.comparisons) {
        const statusClass = comp.passed ? 'pass' : 'fail';
        const status = comp.passed ? '✓ PASS' : '✗ FAIL';
        htmlOutput += `<tr><td>${comp.sample}</td><td>${comp.well}</td><td>${comp.concentration !== null ? comp.concentration.toFixed(4) : 'N/A'}</td><td>${comp.signal.toFixed(0)}</td><td>${comp.originalCalcConc.toFixed(6)}</td><td>${comp.ourCalcConc.toFixed(6)}</td><td>${comp.difference.toFixed(6)}</td><td>${comp.diffPct.toFixed(6)}%</td><td class="${statusClass}">${status}</td></tr>`;
      }
      htmlOutput += `</tbody></table><div class="stats">Total: ${result.stats.count} | Passed: ${result.stats.passed} | Failed: ${result.stats.failed} | Max: ${result.stats.maxDiffPct.toFixed(6)}% | Avg: ${result.stats.avgDiffPct.toFixed(6)}% | <span class="${result.stats.maxDiffPct <= 1 ? 'pass' : 'fail'}">${result.stats.maxDiffPct <= 1 ? '✓ PASSED' : '✗ FAILED'}</span></div></div>`;
    }
  }
}

htmlOutput += `</tbody></table><div class="stats"><strong>Overall Summary:</strong> Passed: ${totalPassed} | Failed: ${totalFailed} | Total: ${totalPassed + totalFailed}</div></div></body></html>`;

fs.writeFileSync(path.join(__dirname, 'comparison_table_final_image_params.txt'), allOutput, 'utf8');
fs.writeFileSync(path.join(__dirname, 'comparison_table_final_image_params.html'), htmlOutput, 'utf8');
console.log('\n✅ Final comparison tables generated!');
console.log('   - Text: comparison_table_final_image_params.txt');
console.log('   - HTML: comparison_table_final_image_params.html');

