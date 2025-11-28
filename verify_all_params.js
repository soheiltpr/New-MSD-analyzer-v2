/**
 * Verify all E3P4 parameters match the image exactly
 */

const fs = require('fs');
const path = require('path');

// Read training data
const trainingDataPath = path.join(__dirname, 'js', 'msd-training-data.js');
let trainingDataContent = fs.readFileSync(trainingDataPath, 'utf8');
const trainingMatch = trainingDataContent.match(/export const MSD_TRAINING_DATA = ({[\s\S]*});/);
const MSD_TRAINING_DATA = eval('(' + trainingMatch[1] + ')');

// Expected parameters from image
const EXPECTED_PARAMS = {
  "GM-CSF": {
    "Top": 2905098,
    "Bottom": 108.9687,
    "MidPoint": 2356.392,
    "HillSlope": 0.998426
  },
  "IFN-γ": {
    "Top": 592000000,  // 5.92E+08
    "Bottom": 154.7288,
    "MidPoint": 9062275,
    "HillSlope": 1.014541
  },
  "IL-10": {
    "Top": 1686965,
    "Bottom": 121.6305,
    "MidPoint": 1978.757,
    "HillSlope": 0.975056
  },
  "IL-1β": {
    "Top": 6608945,
    "Bottom": 111.4727,
    "MidPoint": 415.7119,
    "HillSlope": 1.078618
  },
  "IL-2": {
    "Top": 1558006,
    "Bottom": 103.8230,
    "MidPoint": 42.12895,
    "HillSlope": 1.004979
  },
  "IL-4": {
    "Top": 15338829,
    "Bottom": 153.5483,
    "MidPoint": 363.0910,
    "HillSlope": 1.069812
  },
  "IL-5": {
    "Top": 5371094,
    "Bottom": 161.4381,
    "MidPoint": 10834.29,
    "HillSlope": 0.988987
  },
  "IL-6": {
    "Top": 10597188,
    "Bottom": 135.6246,
    "MidPoint": 165.0818,
    "HillSlope": 1.012450
  },
  "MCP-1": {
    "Top": 2442778,
    "Bottom": 117.2125,
    "MidPoint": 215.7242,
    "HillSlope": 1.031667
  },
  "TNF-α": {
    "Top": 3268788,
    "Bottom": 228.8880,
    "MidPoint": 390.7497,
    "HillSlope": 1.012043
  }
};

console.log('='.repeat(120));
console.log('VERIFYING ALL E3P4 PARAMETERS MATCH IMAGE');
console.log('='.repeat(120));

let allMatch = true;

for (const [assayName, expected] of Object.entries(EXPECTED_PARAMS)) {
  const actual = MSD_TRAINING_DATA.E3_P4[assayName].params;
  
  console.log(`\n${assayName}:`);
  
  const topMatch = Math.abs(actual["Algorithm Parameter: Calc. Top"] - expected.Top) < 0.01;
  const bottomMatch = Math.abs(actual["Algorithm Parameter: Calc. Bottom"] - expected.Bottom) < 0.01;
  const midPointMatch = Math.abs(actual["Algorithm Parameter: Calc. MidPoint"] - expected.MidPoint) < 0.01;
  const hillSlopeMatch = Math.abs(actual["Algorithm Parameter: Calc. HillSlope"] - expected.HillSlope) < 0.0001;
  
  console.log(`  Top: ${actual["Algorithm Parameter: Calc. Top"]} ${topMatch ? '✓' : '✗'} (expected: ${expected.Top})`);
  console.log(`  Bottom: ${actual["Algorithm Parameter: Calc. Bottom"]} ${bottomMatch ? '✓' : '✗'} (expected: ${expected.Bottom})`);
  console.log(`  MidPoint: ${actual["Algorithm Parameter: Calc. MidPoint"]} ${midPointMatch ? '✓' : '✗'} (expected: ${expected.MidPoint})`);
  console.log(`  HillSlope: ${actual["Algorithm Parameter: Calc. HillSlope"]} ${hillSlopeMatch ? '✓' : '✗'} (expected: ${expected.HillSlope})`);
  
  if (!topMatch || !bottomMatch || !midPointMatch || !hillSlopeMatch) {
    allMatch = false;
    console.log(`  ⚠ MISMATCH DETECTED - needs manual update`);
  }
}

console.log('\n' + '='.repeat(120));
if (allMatch) {
  console.log('✓ ALL PARAMETERS MATCH THE IMAGE!');
} else {
  console.log('⚠ SOME PARAMETERS DO NOT MATCH - manual update needed');
}
console.log('='.repeat(120));

console.log('\n✅ Verification complete!');

