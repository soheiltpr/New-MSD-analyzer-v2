/**
 * Update IL-6 parameters with exact values from the image
 */

const fs = require('fs');
const path = require('path');

// Exact parameters from the image (in order)
const EXACT_IL6_PARAMS = {
  "Assay": "IL-6",
  "Spot": 7,
  "Algorithm": "FourPL",
  "Algorithm Parameter: Initial Top": 619028.5,
  "Algorithm Parameter: Initial Bottom": 140.4,
  "Algorithm Parameter: Initial MidPoint": 531.8441,
  "Algorithm Parameter: Initial HillSlope": 1,
  "Algorithm Parameter: Weighting": "1/y^2",
  "Algorithm Parameter: Max Iteration": 500,
  "Fit Statistic: RSquared": 0.999957,
  "Algorithm Parameter: Calc. Top": 154000000,  // 1.54E+08
  "Algorithm Parameter: Calc. Bottom": 150.2258,
  "Algorithm Parameter: Calc. MidPoint": 182734.8,
  "Algorithm Parameter: Calc. HillSlope": 1.069812,
  "Detection Limits: Calc. Low": 0.561188,
  "Detection Limits: Calc. High": 1040
};

// Read the training data file
const trainingDataPath = path.join(__dirname, 'js', 'msd-training-data.js');
let trainingDataContent = fs.readFileSync(trainingDataPath, 'utf8');

console.log('='.repeat(120));
console.log('UPDATING IL-6 PARAMETERS WITH EXACT VALUES FROM IMAGE');
console.log('='.repeat(120));

console.log('\nNew IL-6 Parameters:');
console.log(`  Calc. Top: ${EXACT_IL6_PARAMS["Algorithm Parameter: Calc. Top"]}`);
console.log(`  Calc. Bottom: ${EXACT_IL6_PARAMS["Algorithm Parameter: Calc. Bottom"]}`);
console.log(`  Calc. MidPoint: ${EXACT_IL6_PARAMS["Algorithm Parameter: Calc. MidPoint"]}`);
console.log(`  Calc. HillSlope: ${EXACT_IL6_PARAMS["Algorithm Parameter: Calc. HillSlope"]}`);
console.log(`  Detection Limits: Calc. Low: ${EXACT_IL6_PARAMS["Detection Limits: Calc. Low"]}`);
console.log(`  Detection Limits: Calc. High: ${EXACT_IL6_PARAMS["Detection Limits: Calc. High"]}`);

// Update the IL-6 section in E3_P4
const lines = trainingDataContent.split('\n');
let inE3P4 = false;
let inIL6 = false;
let paramsStartLine = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('"E3_P4"')) {
    inE3P4 = true;
  }
  if (inE3P4 && lines[i].includes('"IL-6"')) {
    inIL6 = true;
  }
  if (inIL6 && lines[i].includes('"params"')) {
    paramsStartLine = i;
  }
  if (inIL6 && paramsStartLine >= 0) {
    // Update parameters
    if (lines[i].includes('"Algorithm Parameter: Calc. Top"')) {
      lines[i] = lines[i].replace(/:\s*[0-9.E+-]+/, `: ${EXACT_IL6_PARAMS["Algorithm Parameter: Calc. Top"]}`);
    }
    if (lines[i].includes('"Algorithm Parameter: Calc. Bottom"')) {
      lines[i] = lines[i].replace(/:\s*[0-9.E+-]+/, `: ${EXACT_IL6_PARAMS["Algorithm Parameter: Calc. Bottom"]}`);
    }
    if (lines[i].includes('"Algorithm Parameter: Calc. MidPoint"')) {
      lines[i] = lines[i].replace(/:\s*[0-9.E+-]+/, `: ${EXACT_IL6_PARAMS["Algorithm Parameter: Calc. MidPoint"]}`);
    }
    if (lines[i].includes('"Algorithm Parameter: Calc. HillSlope"')) {
      lines[i] = lines[i].replace(/:\s*[0-9.E+-]+/, `: ${EXACT_IL6_PARAMS["Algorithm Parameter: Calc. HillSlope"]}`);
    }
    if (lines[i].includes('"Detection Limits: Calc. Low"')) {
      lines[i] = lines[i].replace(/:\s*[0-9.E+-]+/, `: ${EXACT_IL6_PARAMS["Detection Limits: Calc. Low"]}`);
    }
    if (lines[i].includes('"Detection Limits: Calc. High"')) {
      lines[i] = lines[i].replace(/:\s*[0-9.E+-]+/, `: ${EXACT_IL6_PARAMS["Detection Limits: Calc. High"]}`);
      // End of params section
      inIL6 = false;
      paramsStartLine = -1;
    }
  }
  if (inE3P4 && lines[i].includes('"E3_P6"')) {
    inE3P4 = false;
    if (inIL6) inIL6 = false;
  }
}

trainingDataContent = lines.join('\n');

// Write the updated file
fs.writeFileSync(trainingDataPath, trainingDataContent, 'utf8');

console.log('\n✓ Successfully updated IL-6 parameters');

// Verify
const verifyMatch = trainingDataContent.match(/export const MSD_TRAINING_DATA = ({[\s\S]*});/);
if (verifyMatch) {
  const MSD_TRAINING_DATA = eval('(' + verifyMatch[1] + ')');
  const il6Params = MSD_TRAINING_DATA.E3_P4["IL-6"].params;
  
  console.log('\nVerification:');
  console.log(`  Top: ${il6Params["Algorithm Parameter: Calc. Top"]} ${Math.abs(il6Params["Algorithm Parameter: Calc. Top"] - EXACT_IL6_PARAMS["Algorithm Parameter: Calc. Top"]) < 0.01 ? '✓' : '✗'}`);
  console.log(`  Bottom: ${il6Params["Algorithm Parameter: Calc. Bottom"]} ${Math.abs(il6Params["Algorithm Parameter: Calc. Bottom"] - EXACT_IL6_PARAMS["Algorithm Parameter: Calc. Bottom"]) < 0.01 ? '✓' : '✗'}`);
  console.log(`  MidPoint: ${il6Params["Algorithm Parameter: Calc. MidPoint"]} ${Math.abs(il6Params["Algorithm Parameter: Calc. MidPoint"] - EXACT_IL6_PARAMS["Algorithm Parameter: Calc. MidPoint"]) < 0.01 ? '✓' : '✗'}`);
  console.log(`  HillSlope: ${il6Params["Algorithm Parameter: Calc. HillSlope"]} ${Math.abs(il6Params["Algorithm Parameter: Calc. HillSlope"] - EXACT_IL6_PARAMS["Algorithm Parameter: Calc. HillSlope"]) < 0.0001 ? '✓' : '✗'}`);
}

console.log('\n✅ Update complete!');

