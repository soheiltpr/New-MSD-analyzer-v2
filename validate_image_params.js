/**
 * Validate parameters from the image tables
 * Using the EXACT values shown in the Plate Analysis Properties tables
 */

const fs = require('fs');
const path = require('path');

// Read validation data
const validationDataPath = path.join(__dirname, 'js', 'msd-validation-data.js');
let validationDataContent = fs.readFileSync(validationDataPath, 'utf8');
const validationMatch = validationDataContent.match(/export const MSD_VALIDATION_DATA = ({[\s\S]*});/);
const MSD_VALIDATION_DATA = eval('(' + validationMatch[1] + ')');

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
  let maxDiffExample = null;
  let allErrors = [];
  
  for (const ex of validationExamples) {
    if (ex.signal == null || ex.originalCalculatedConcentration == null || 
        ex.originalCalculatedConcentration === 0) continue;
    const calcConc = fourPLInverse(ex.signal, params);
    if (!isFinite(calcConc)) continue;
    const diffPct = Math.abs(calcConc - ex.originalCalculatedConcentration) /
                    ex.originalCalculatedConcentration * 100;
    allErrors.push({ ex, diffPct, calcConc });
    if (diffPct > maxDiffPct) {
      maxDiffPct = diffPct;
      maxDiffExample = { ex, diffPct, calcConc };
    }
  }
  
  return { maxDiffPct, maxDiffExample, allErrors };
}

// Parameters from E3P4 image (Plate_2BOANACS77)
const E3P4_PARAMS = {
  "GM-CSF": {
    top: 2905098,
    bottom: 108.9687,
    midPoint: 2356.392,
    hillSlope: 0.998426
  },
  "IFN-γ": {
    top: 592000000, // 5.92E+08
    bottom: 154.7288,
    midPoint: 9062275,
    hillSlope: 1.014541
  },
  "IL-10": {
    top: 1686965,
    bottom: 121.6305,
    midPoint: 1978.757,
    hillSlope: 0.975056
  },
  "IL-1β": {
    top: 4297377,
    bottom: 183.074,
    midPoint: 4882.571,
    hillSlope: 0.979152
  },
  "IL-2": {
    top: 86800000, // 8.68E+07
    bottom: 148.676,
    midPoint: 327051.2,
    hillSlope: 1.011874
  },
  "IL-4": {
    top: 3451522,
    bottom: 92.66713,
    midPoint: 1137.36,
    hillSlope: 1.000719
  },
  "IL-5": {
    top: 5371094,
    bottom: 161.4381,
    midPoint: 10834.29,
    hillSlope: 0.988987
  },
  "IL-6": {
    top: 293000000, // 2.93E+08
    bottom: 127.5109,
    midPoint: 422500.7,
    hillSlope: 1.039774
  },
  "MCP-1": {
    top: 1597547,
    bottom: 152.3343,
    midPoint: 1852.515,
    hillSlope: 1.117328
  },
  "TNF-α": {
    top: 3268788,
    bottom: 228.888,
    midPoint: 390.7497,
    hillSlope: 1.012043
  }
};

// Parameters from E3P6 image (Plate_2BOANA6S78)
const E3P6_PARAMS = {
  "GM-CSF": {
    top: 2872985,
    bottom: 111.8709,
    midPoint: 2272.195,
    hillSlope: 1.006125
  },
  "IFN-γ": {
    top: 782000000, // 7.82E+08
    bottom: 152.4633,
    midPoint: 11000000, // 1.10E+07
    hillSlope: 1.020429
  },
  "IL-10": {
    top: 1722572,
    bottom: 112.3031,
    midPoint: 1879.847,
    hillSlope: 0.984193
  },
  "IL-1β": {
    top: 4297377,
    bottom: 183.074,
    midPoint: 4882.571,
    hillSlope: 0.979152
  },
  "IL-2": {
    top: 86800000, // 8.68E+07
    bottom: 148.676,
    midPoint: 327051.2,
    hillSlope: 1.011874
  },
  "IL-4": {
    top: 3451522,
    bottom: 92.66713,
    midPoint: 1137.36,
    hillSlope: 1.000719
  },
  "IL-5": {
    top: 5371094,
    bottom: 161.4381,
    midPoint: 10834.29,
    hillSlope: 0.988987
  },
  "IL-6": {
    top: 293000000, // 2.93E+08
    bottom: 127.5109,
    midPoint: 422500.7,
    hillSlope: 1.039774
  },
  "MCP-1": {
    top: 1597547,
    bottom: 152.3343,
    midPoint: 1852.515,
    hillSlope: 1.117328
  },
  "TNF-α": {
    top: 6002699,
    bottom: 220.8896,
    midPoint: 6743.01,
    hillSlope: 1.011124
  }
};

console.log('='.repeat(120));
console.log('VALIDATING PARAMETERS FROM IMAGE TABLES');
console.log('Using EXACT values from Plate Analysis Properties');
console.log('='.repeat(120));

const assays = ["GM-CSF", "IFN-γ", "IL-10", "IL-1β", "IL-2", "IL-4", "IL-5", "IL-6", "MCP-1", "TNF-α"];
const sheets = [
  { key: "E3_P4", params: E3P4_PARAMS },
  { key: "E3_P6", params: E3P6_PARAMS }
];

let results = [];

for (const sheet of sheets) {
  for (const assay of assays) {
    const validationExamples = MSD_VALIDATION_DATA[sheet.key][assay] || [];
    if (validationExamples.length === 0) continue;
    
    const params = sheet.params[assay];
    if (!params) continue;
    
    const result = calculateMaxError(params, validationExamples);
    
    results.push({
      sheetKey: sheet.key,
      assayName: assay,
      params,
      maxDiffPct: result.maxDiffPct,
      maxDiffExample: result.maxDiffExample,
      count: result.allErrors.length
    });
  }
}

// Sort by error
results.sort((a, b) => a.maxDiffPct - b.maxDiffPct);

console.log('\nSheet  | Assay    | Max Diff % | Status | Details');
console.log('-'.repeat(120));

let totalPassed = 0;
let totalFailed = 0;
let perfectMatches = 0;

for (const result of results) {
  const status = result.maxDiffPct <= 1.0 ? '✓ PASS' : '✗ FAIL';
  if (result.maxDiffPct <= 1.0) totalPassed++;
  else totalFailed++;
  if (result.maxDiffPct === 0) perfectMatches++;
  
  let details = '';
  if (result.maxDiffPct === 0) {
    details = 'PERFECT MATCH (0.00% error)';
  } else if (result.maxDiffPct <= 0.01) {
    details = 'Near perfect (<0.01%)';
  } else if (result.maxDiffPct <= 1.0) {
    details = `Passes (≤1%)`;
  } else {
    details = `Worst: ${result.maxDiffExample.ex.sample} ${result.maxDiffExample.ex.well} - Signal: ${result.maxDiffExample.ex.signal}, Expected: ${result.maxDiffExample.ex.originalCalculatedConcentration.toFixed(6)}, Got: ${result.maxDiffExample.calcConc.toFixed(6)}`;
  }
  
  console.log(
    `${result.sheetKey.padEnd(6)} | ${result.assayName.padEnd(8)} | ${result.maxDiffPct.toFixed(6).padEnd(10)}% | ${status.padEnd(6)} | ${details}`
  );
}

console.log(`\n${'='.repeat(120)}`);
console.log(`SUMMARY: ${totalPassed}/${results.length} assays pass validation (≤1% error)`);
console.log(`Perfect matches (0% error): ${perfectMatches}`);
console.log('='.repeat(120));

// Detailed report for passing assays
console.log('\n' + '='.repeat(120));
console.log('DETAILED VALIDATION FOR PASSING ASSAYS (≤1% error)');
console.log('='.repeat(120));

for (const result of results.filter(r => r.maxDiffPct <= 1.0)) {
  console.log(`\n${result.sheetKey} - ${result.assayName}:`);
  console.log(`  Parameters from image:`);
  console.log(`    Top: ${result.params.top}`);
  console.log(`    Bottom: ${result.params.bottom}`);
  console.log(`    MidPoint: ${result.params.midPoint}`);
  console.log(`    HillSlope: ${result.params.hillSlope}`);
  console.log(`  Max Error: ${result.maxDiffPct.toFixed(6)}%`);
  console.log(`  Validation Examples: ${result.count}`);
  
  if (result.maxDiffPct === 0) {
    console.log(`  ✓ PERFECT MATCH - All ${result.count} examples match exactly!`);
  } else {
    if (result.maxDiffExample) {
      console.log(`  Worst example:`);
      console.log(`    Sample: ${result.maxDiffExample.ex.sample} ${result.maxDiffExample.ex.well}`);
      console.log(`    Signal: ${result.maxDiffExample.ex.signal}`);
      console.log(`    Expected: ${result.maxDiffExample.ex.originalCalculatedConcentration.toFixed(6)}`);
      console.log(`    Calculated: ${result.maxDiffExample.calcConc.toFixed(6)}`);
      console.log(`    Difference: ${result.maxDiffExample.diffPct.toFixed(6)}%`);
    }
  }
}

console.log('\n✅ Validation complete!');

