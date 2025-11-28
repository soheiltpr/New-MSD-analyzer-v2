/**
 * Generate comparison table showing differences between our calculations
 * and original MSD calculated concentrations
 */

const fs = require('fs');
const path = require('path');

// Read and parse validation data
const validationDataPath = path.join(__dirname, 'js', 'msd-validation-data.js');
let validationDataContent = fs.readFileSync(validationDataPath, 'utf8');
// Extract the data object
const validationMatch = validationDataContent.match(/export const MSD_VALIDATION_DATA = ({[\s\S]*});/);
if (!validationMatch) {
  console.error('Could not parse validation data');
  process.exit(1);
}
const MSD_VALIDATION_DATA = eval('(' + validationMatch[1] + ')');

// Read and parse training data
const trainingDataPath = path.join(__dirname, 'js', 'msd-training-data-refitted.js');
let trainingDataContent = fs.readFileSync(trainingDataPath, 'utf8');
// Extract the data object
const trainingMatch = trainingDataContent.match(/export const MSD_TRAINING_DATA = ({[\s\S]*});/);
if (!trainingMatch) {
  console.error('Could not parse training data');
  process.exit(1);
}
// Using refitted parameters
const MSD_TRAINING_DATA = eval('('
' + trainingMatch[1] + ')');

/**
 * Inverse 4PL function
 */
function fourPLInverse(y, { top, bottom, midPoint, hillSlope }) {
  if (y <= bottom || y >= top) {
    return null;
  }
  const ratio = (top - bottom) / (y - bottom) - 1;
  if (ratio <= 0) {
    return null;
  }
  return midPoint / Math.pow(ratio, 1 / hillSlope);
}

/**
 * Get params from training data
 */
function getParams(sheetKey, assayName) {
  const sheet = MSD_TRAINING_DATA[sheetKey];
  if (!sheet || !sheet[assayName] || !sheet[assayName].params) {
    return null;
  }
  const params = sheet[assayName].params;
  return {
    top: params["Algorithm Parameter: Calc. Top"],
    bottom: params["Algorithm Parameter: Calc. Bottom"],
    midPoint: params["Algorithm Parameter: Calc. MidPoint"],
    hillSlope: params["Algorithm Parameter: Calc. HillSlope"]
  };
}

/**
 * Generate comparison table for a sheet and assay
 */
function generateComparisonTable(sheetKey, assayName) {
  const params = getParams(sheetKey, assayName);
  if (!params) {
    return null;
  }

  const examples = MSD_VALIDATION_DATA[sheetKey][assayName] || [];
  const comparisons = [];

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

    const ourCalcConc = fourPLInverse(ex.signal, params);
    if (ourCalcConc === null || isNaN(ourCalcConc)) {
      continue;
    }

    const diff = ourCalcConc - ex.originalCalculatedConcentration;
    const diffPct = Math.abs(diff) / ex.originalCalculatedConcentration * 100;

    comparisons.push({
      sample: ex.sample,
      well: ex.well,
      concentration: ex.concentration,
      signal: ex.signal,
      originalCalcConc: ex.originalCalculatedConcentration,
      ourCalcConc: ourCalcConc,
      difference: diff,
      diffPct: diffPct,
      passed: diffPct <= 1
    });
  }

  return {
    sheetKey,
    assayName,
    params,
    comparisons,
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

/**
 * Format table output
 */
function formatTable(result) {
  if (!result || !result.comparisons || result.comparisons.length === 0) {
    return `No data available for ${result.assayName} on ${result.sheetKey}`;
  }

  let output = `\n${'='.repeat(120)}\n`;
  output += `${result.sheetKey} - ${result.assayName}\n`;
  output += `${'='.repeat(120)}\n`;
  output += `\n4PL Parameters:\n`;
  output += `  Top: ${result.params.top.toFixed(6)}\n`;
  output += `  Bottom: ${result.params.bottom.toFixed(6)}\n`;
  output += `  MidPoint: ${result.params.midPoint.toFixed(6)}\n`;
  output += `  HillSlope: ${result.params.hillSlope.toFixed(6)}\n`;
  output += `\n${'='.repeat(120)}\n`;
  output += `Comparison Table\n`;
  output += `${'='.repeat(120)}\n\n`;
  
  // Header
  output += 'Sample | Well | Conc   | Signal  | Original Calc | Our Calc    | Difference  | Diff %   | Status\n';
  output += '-'.repeat(120) + '\n';

  // Data rows
  for (const comp of result.comparisons) {
    const status = comp.passed ? '✓ PASS' : '✗ FAIL';
    output += 
      `${comp.sample.padEnd(6)} | ` +
      `${comp.well.padEnd(4)} | ` +
      `${(comp.concentration !== null ? comp.concentration.toFixed(4) : 'N/A').padEnd(6)} | ` +
      `${comp.signal.toFixed(0).padEnd(7)} | ` +
      `${comp.originalCalcConc.toFixed(6).padEnd(13)} | ` +
      `${comp.ourCalcConc.toFixed(6).padEnd(11)} | ` +
      `${comp.difference.toFixed(6).padEnd(11)} | ` +
      `${comp.diffPct.toFixed(2).padEnd(8)}% | ` +
      `${status}\n`;
  }

  // Statistics
  output += `\n${'='.repeat(120)}\n`;
  output += `Statistics\n`;
  output += `${'='.repeat(120)}\n`;
  output += `Total comparisons: ${result.stats.count}\n`;
  output += `Passed (≤1%): ${result.stats.passed}\n`;
  output += `Failed (>1%): ${result.stats.failed}\n`;
  output += `Max difference: ${result.stats.maxDiffPct.toFixed(2)}%\n`;
  output += `Min difference: ${result.stats.minDiffPct.toFixed(2)}%\n`;
  output += `Average difference: ${result.stats.avgDiffPct.toFixed(2)}%\n`;
  output += `Overall status: ${result.stats.maxDiffPct <= 1 ? '✓ PASSED' : '✗ FAILED'}\n`;

  return output;
}

console.log('='.repeat(120));
console.log('COMPARISON TABLE: Our Calculations vs Original MSD Calculations');
console.log('='.repeat(120));

const assays = ["GM-CSF", "IFN-γ", "IL-10", "IL-1β", "IL-2", "IL-4", "IL-5", "IL-6", "MCP-1", "TNF-α"];
const sheets = ["E3_P4", "E3_P6"];

// Generate tables for all combinations
let allOutput = '';

for (const sheetKey of sheets) {
  for (const assay of assays) {
    const result = generateComparisonTable(sheetKey, assay);
    if (result) {
      allOutput += formatTable(result);
      allOutput += '\n\n';
    }
  }
}

// Also create summary table
console.log('\n' + '='.repeat(120));
console.log('SUMMARY TABLE - All Assays');
console.log('='.repeat(120));
console.log('\nSheet  | Assay    | Count | Passed | Failed | Max Diff % | Avg Diff % | Status');
console.log('-'.repeat(120));

for (const sheetKey of sheets) {
  for (const assay of assays) {
    const result = generateComparisonTable(sheetKey, assay);
    if (result && result.comparisons.length > 0) {
      const status = result.stats.maxDiffPct <= 1 ? '✓ PASS' : '✗ FAIL';
      console.log(
        `${sheetKey.padEnd(6)} | ` +
        `${assay.padEnd(8)} | ` +
        `${result.stats.count.toString().padEnd(5)} | ` +
        `${result.stats.passed.toString().padEnd(6)} | ` +
        `${result.stats.failed.toString().padEnd(6)} | ` +
        `${result.stats.maxDiffPct.toFixed(2).padEnd(10)}% | ` +
        `${result.stats.avgDiffPct.toFixed(2).padEnd(10)}% | ` +
        status
      );
    }
  }
}

// Save detailed output to file
const outputFile = path.join(__dirname, 'comparison_table_output.txt');
fs.writeFileSync(outputFile, allOutput, 'utf8');
console.log(`\n✅ Detailed comparison tables saved to: ${outputFile}`);

// Also create HTML table
let htmlOutput = `
<!DOCTYPE html>
<html>
<head>
  <title>MSD Calculation Comparison</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1400px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; font-size: 12px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #4a90e2; color: white; position: sticky; top: 0; }
    tr:nth-child(even) { background-color: #f9f9f9; }
    .pass { color: #28a745; font-weight: bold; }
    .fail { color: #dc3545; font-weight: bold; }
    .section { margin: 40px 0; page-break-inside: avoid; }
    h1 { color: #333; border-bottom: 3px solid #4a90e2; padding-bottom: 10px; }
    h2 { color: #4a90e2; margin-top: 30px; }
    .params { background: #f8f9fa; padding: 10px; border-radius: 4px; margin: 10px 0; font-family: monospace; }
    .stats { background: #e9ecef; padding: 10px; border-radius: 4px; margin: 10px 0; }
    .summary-table { margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>MSD Calculation Comparison: Our Calculations vs Original MSD</h1>
    <p>This table compares concentrations calculated using our inverse 4PL implementation 
    against the original MSD software's calculated concentrations (Column H).</p>
`;

// Add summary table first
htmlOutput += `
    <div class="section">
      <h2>Summary</h2>
      <table class="summary-table">
        <thead>
          <tr>
            <th>Sheet</th>
            <th>Assay</th>
            <th>Count</th>
            <th>Passed</th>
            <th>Failed</th>
            <th>Max Diff %</th>
            <th>Avg Diff %</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
`;

for (const sheetKey of sheets) {
  for (const assay of assays) {
    const result = generateComparisonTable(sheetKey, assay);
    if (result && result.comparisons.length > 0) {
      const statusClass = result.stats.maxDiffPct <= 1 ? 'pass' : 'fail';
      const status = result.stats.maxDiffPct <= 1 ? '✓ PASS' : '✗ FAIL';
      htmlOutput += `
          <tr>
            <td>${sheetKey}</td>
            <td>${assay}</td>
            <td>${result.stats.count}</td>
            <td>${result.stats.passed}</td>
            <td>${result.stats.failed}</td>
            <td>${result.stats.maxDiffPct.toFixed(2)}%</td>
            <td>${result.stats.avgDiffPct.toFixed(2)}%</td>
            <td class="${statusClass}">${status}</td>
          </tr>
      `;
    }
  }
}

htmlOutput += `
        </tbody>
      </table>
    </div>
`;

// Add detailed tables
for (const sheetKey of sheets) {
  for (const assay of assays) {
    const result = generateComparisonTable(sheetKey, assay);
    if (result && result.comparisons.length > 0) {
      htmlOutput += `
      <div class="section">
        <h2>${sheetKey} - ${assay}</h2>
        <div class="params">
          <strong>4PL Parameters:</strong><br>
          Top: ${result.params.top.toFixed(6)} | 
          Bottom: ${result.params.bottom.toFixed(6)} | 
          MidPoint: ${result.params.midPoint.toFixed(6)} | 
          HillSlope: ${result.params.hillSlope.toFixed(6)}
        </div>
        <table>
          <thead>
            <tr>
              <th>Sample</th>
              <th>Well</th>
              <th>Concentration</th>
              <th>Signal</th>
              <th>Original Calc</th>
              <th>Our Calc</th>
              <th>Difference</th>
              <th>Diff %</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
      `;
      
      for (const comp of result.comparisons) {
        const statusClass = comp.passed ? 'pass' : 'fail';
        const status = comp.passed ? '✓ PASS' : '✗ FAIL';
        htmlOutput += `
            <tr>
              <td>${comp.sample}</td>
              <td>${comp.well}</td>
              <td>${comp.concentration !== null ? comp.concentration.toFixed(4) : 'N/A'}</td>
              <td>${comp.signal.toFixed(0)}</td>
              <td>${comp.originalCalcConc.toFixed(6)}</td>
              <td>${comp.ourCalcConc.toFixed(6)}</td>
              <td>${comp.difference.toFixed(6)}</td>
              <td>${comp.diffPct.toFixed(2)}%</td>
              <td class="${statusClass}">${status}</td>
            </tr>
        `;
      }
      
      htmlOutput += `
          </tbody>
        </table>
        <div class="stats">
          <strong>Statistics:</strong><br>
          Total: ${result.stats.count} | 
          Passed: ${result.stats.passed} | 
          Failed: ${result.stats.failed} | 
          Max Diff: ${result.stats.maxDiffPct.toFixed(2)}% | 
          Avg Diff: ${result.stats.avgDiffPct.toFixed(2)}% | 
          <span class="${result.stats.maxDiffPct <= 1 ? 'pass' : 'fail'}">
            ${result.stats.maxDiffPct <= 1 ? '✓ PASSED' : '✗ FAILED'}
          </span>
        </div>
      </div>
      `;
    }
  }
}

htmlOutput += `
  </div>
</body>
</html>
`;

const htmlFile = path.join(__dirname, 'comparison_table.html');
fs.writeFileSync(htmlFile, htmlOutput, 'utf8');
console.log(`✅ HTML comparison table saved to: ${htmlFile}`);
