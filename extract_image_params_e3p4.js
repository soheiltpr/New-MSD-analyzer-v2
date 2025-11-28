/**
 * Extract exact parameters from the E3P4 Plate Analysis Properties image
 * and update MSD_TRAINING_DATA to use ONLY these values
 */

const fs = require('fs');
const path = require('path');

// Parameters extracted directly from the image for E3P4
// Based on "Algorithm P (Parameter 7-10)" which are the "Calc." parameters
const IMAGE_PARAMS_E3P4 = {
  "GM-CSF": {
    "Top": 2905098,
    "Bottom": 108.9687,
    "MidPoint": 2356.392,
    "HillSlope": 0.998426,
    "Detection Low": 0.029884,
    "Detection High": 4620
  },
  "IFN-γ": {
    "Top": 5.92E+08,  // 592000000
    "Bottom": 154.7288,
    "MidPoint": 9062275,
    "HillSlope": 1.014541,
    "Detection Low": 0.728129,
    "Detection High": 16050
  },
  "IL-10": {
    "Top": 1686965,
    "Bottom": 121.6305,
    "MidPoint": 1978.757,
    "HillSlope": 0.975056,
    "Detection Low": 0.039581,
    "Detection High": 2015
  },
  "IL-1β": {
    "Top": 6608945,  // Approximate from image
    "Bottom": 111.4727,
    "MidPoint": 415.7119,
    "HillSlope": 1.078618,
    "Detection Low": 0.034855,
    "Detection High": 2220
  },
  "IL-2": {
    "Top": 1558006,
    "Bottom": 103.8230,
    "MidPoint": 42.12895,
    "HillSlope": 1.004979,
    "Detection Low": 0.033294,
    "Detection High": 945
  },
  "IL-4": {
    "Top": 15338829,
    "Bottom": 153.5483,
    "MidPoint": 363.0910,
    "HillSlope": 1.069812,
    "Detection Low": 0.093862,
    "Detection High": 825
  },
  "IL-5": {
    "Top": 5371094,
    "Bottom": 161.4381,
    "MidPoint": 10834.29,
    "HillSlope": 0.988987,
    "Detection Low": 0.056086,
    "Detection High": 2140
  },
  "IL-6": {
    "Top": 10597188,
    "Bottom": 135.6246,
    "MidPoint": 165.0818,
    "HillSlope": 1.012450,
    "Detection Low": 0.090615,
    "Detection High": 1040
  },
  "MCP-1": {
    "Top": 2442778,
    "Bottom": 117.2125,
    "MidPoint": 215.7242,
    "HillSlope": 1.031667,
    "Detection Low": 0.096691,
    "Detection High": 2700
  },
  "TNF-α": {
    "Top": 3268788,
    "Bottom": 228.8880,
    "MidPoint": 390.7497,
    "HillSlope": 1.012043,
    "Detection Low": 0.079652,
    "Detection High": 1355
  }
};

// Read the current training data file
const trainingDataPath = path.join(__dirname, 'js', 'msd-training-data.js');
let trainingDataContent = fs.readFileSync(trainingDataPath, 'utf8');

console.log('='.repeat(120));
console.log('UPDATING MSD_TRAINING_DATA WITH EXACT PARAMETERS FROM IMAGE');
console.log('='.repeat(120));

// Update each assay's parameters
for (const [assayName, params] of Object.entries(IMAGE_PARAMS_E3P4)) {
  console.log(`\nUpdating ${assayName}:`);
  console.log(`  Top: ${params.Top}`);
  console.log(`  Bottom: ${params.Bottom}`);
  console.log(`  MidPoint: ${params.MidPoint}`);
  console.log(`  HillSlope: ${params.HillSlope}`);
  console.log(`  Detection Low: ${params["Detection Low"]}`);
  console.log(`  Detection High: ${params["Detection High"]}`);
  
  // Replace the Calc. parameters in the training data
  const topPattern = new RegExp(
    `("E3_P4"\\s*:\\s*{[^}]*"${assayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s*:\\s*{[^}]*"params"\\s*:\\s*{[^}]*"Algorithm Parameter: Calc\\. Top"\\s*:\\s*)[0-9.E+-]+`,
    's'
  );
  
  const bottomPattern = new RegExp(
    `("Algorithm Parameter: Calc\\. Bottom"\\s*:\\s*)[0-9.E+-]+`,
    's'
  );
  
  const midPointPattern = new RegExp(
    `("Algorithm Parameter: Calc\\. MidPoint"\\s*:\\s*)[0-9.E+-]+`,
    's'
  );
  
  const hillSlopePattern = new RegExp(
    `("Algorithm Parameter: Calc\\. HillSlope"\\s*:\\s*)[0-9.E+-]+`,
    's'
  );
  
  const detectionLowPattern = new RegExp(
    `("Detection Limits: Calc\\. Low"\\s*:\\s*)[0-9.E+-]+`,
    's'
  );
  
  const detectionHighPattern = new RegExp(
    `("Detection Limits: Calc\\. High"\\s*:\\s*)[0-9.E+-]+`,
    's'
  );
  
  // More precise replacement using string matching
  const assaySectionPattern = new RegExp(
    `("${assayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s*:\\s*{[^}]*"params"\\s*:\\s*{)([^}]*})`,
    's'
  );
  
  // Find and replace each parameter individually
  trainingDataContent = trainingDataContent.replace(
    new RegExp(`("Algorithm Parameter: Calc\\. Top"\\s*:\\s*)[0-9.E+-]+([^,]*"${assayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}")`, 's'),
    `$1${params.Top}$2`
  );
  
  // Better approach: replace in the specific assay section
  const lines = trainingDataContent.split('\n');
  let inE3P4 = false;
  let inAssay = false;
  let assayStartLine = -1;
  let paramsStartLine = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('"E3_P4"')) {
      inE3P4 = true;
    }
    if (inE3P4 && lines[i].includes(`"${assayName}"`)) {
      inAssay = true;
      assayStartLine = i;
    }
    if (inAssay && lines[i].includes('"params"')) {
      paramsStartLine = i;
    }
    if (inAssay && paramsStartLine >= 0) {
      // Replace parameters in this section
      if (lines[i].includes('"Algorithm Parameter: Calc. Top"')) {
        lines[i] = lines[i].replace(/:\s*[0-9.E+-]+/, `: ${params.Top}`);
      }
      if (lines[i].includes('"Algorithm Parameter: Calc. Bottom"')) {
        lines[i] = lines[i].replace(/:\s*[0-9.E+-]+/, `: ${params.Bottom}`);
      }
      if (lines[i].includes('"Algorithm Parameter: Calc. MidPoint"')) {
        lines[i] = lines[i].replace(/:\s*[0-9.E+-]+/, `: ${params.MidPoint}`);
      }
      if (lines[i].includes('"Algorithm Parameter: Calc. HillSlope"')) {
        lines[i] = lines[i].replace(/:\s*[0-9.E+-]+/, `: ${params.HillSlope}`);
      }
      if (lines[i].includes('"Detection Limits: Calc. Low"')) {
        lines[i] = lines[i].replace(/:\s*[0-9.E+-]+/, `: ${params["Detection Low"]}`);
      }
      if (lines[i].includes('"Detection Limits: Calc. High"')) {
        lines[i] = lines[i].replace(/:\s*[0-9.E+-]+/, `: ${params["Detection High"]}`);
        // End of params section for this assay
        inAssay = false;
        paramsStartLine = -1;
      }
    }
    if (inE3P4 && lines[i].includes('"E3_P6"')) {
      inE3P4 = false;
    }
  }
  
  trainingDataContent = lines.join('\n');
}

// Write the updated file
fs.writeFileSync(trainingDataPath, trainingDataContent, 'utf8');

console.log('\n' + '='.repeat(120));
console.log('✓ Successfully updated msd-training-data.js with exact parameters from image');
console.log('='.repeat(120));

// Verify by reading back
console.log('\nVerifying updates...');
const verifyMatch = trainingDataContent.match(/export const MSD_TRAINING_DATA = ({[\s\S]*});/);
if (verifyMatch) {
  const MSD_TRAINING_DATA = eval('(' + verifyMatch[1] + ')');
  
  console.log('\nVerification for E3_P4 IL-5:');
  const il5Params = MSD_TRAINING_DATA.E3_P4["IL-5"].params;
  console.log(`  Top: ${il5Params["Algorithm Parameter: Calc. Top"]} (expected: ${IMAGE_PARAMS_E3P4["IL-5"].Top})`);
  console.log(`  Bottom: ${il5Params["Algorithm Parameter: Calc. Bottom"]} (expected: ${IMAGE_PARAMS_E3P4["IL-5"].Bottom})`);
  console.log(`  MidPoint: ${il5Params["Algorithm Parameter: Calc. MidPoint"]} (expected: ${IMAGE_PARAMS_E3P4["IL-5"].MidPoint})`);
  console.log(`  HillSlope: ${il5Params["Algorithm Parameter: Calc. HillSlope"]} (expected: ${IMAGE_PARAMS_E3P4["IL-5"].HillSlope})`);
  
  const allMatch = 
    Math.abs(il5Params["Algorithm Parameter: Calc. Top"] - IMAGE_PARAMS_E3P4["IL-5"].Top) < 0.01 &&
    Math.abs(il5Params["Algorithm Parameter: Calc. Bottom"] - IMAGE_PARAMS_E3P4["IL-5"].Bottom) < 0.01 &&
    Math.abs(il5Params["Algorithm Parameter: Calc. MidPoint"] - IMAGE_PARAMS_E3P4["IL-5"].MidPoint) < 0.01 &&
    Math.abs(il5Params["Algorithm Parameter: Calc. HillSlope"] - IMAGE_PARAMS_E3P4["IL-5"].HillSlope) < 0.0001;
  
  if (allMatch) {
    console.log('\n✓ All parameters match!');
  } else {
    console.log('\n⚠ Some parameters do not match - manual review needed');
  }
}

console.log('\n✅ Update complete!');

