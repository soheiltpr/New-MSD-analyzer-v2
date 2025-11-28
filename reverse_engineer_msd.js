// Reverse-engineer MSD parameters from their calculated concentrations
// By fitting to THEIR back-calculated values, we can find their exact parameters

const fs = require('fs');

function fourPL(x, bottom, top, midpoint, hillslope) {
  return bottom + (top - bottom) / (1 + Math.pow(x / midpoint, hillslope));
}

function inverseFourPL(y, bottom, top, midpoint, hillslope) {
  if (y <= bottom) return null;
  if (y >= top) return null;
  const ratio = (top - bottom) / (y - bottom) - 1;
  if (ratio <= 0) return null;
  return midpoint / Math.pow(ratio, 1 / hillslope);
}

// MSD calculated concentrations (from user's data)
const MSD_CALC_DATA = {
  'GM-CSF': [
    [207, 0.044398575], [1278, 1.027361155], [1611, 1.329200835],
    [4529, 3.950690195], [5797, 5.082872159], [18374, 16.24690437],
    [21263, 18.8066815], [74083, 66.00908455], [84188, 75.17169092],
    [270599, 254.8536874], [304331, 289.84992], [1070008, 1411.899388],
    [1143081, 1568.214199], [1809801, 3927.034835], [1846757, 4142.352175]
  ],
  'IFN-γ': [
    [623, 5.702379696], [651, 6.327054673], [393, 0.338957034],
    [1089, 15.81248013], [1037, 14.70647717], [3417, 63.12653263],
    [3558, 65.91173843], [14390, 270.319282], [14199, 266.8123623],
    [52179, 937.7904997], [52864, 949.5849264], [237392, 3986.012164],
    [242445, 4066.856761], [1059190, 16587.42244], [1002274, 15735.8593]
  ],
  'IL-10': [
    [606, 0.261799978], [806, 0.538616406], [675, 0.358299753],
    [1804, 1.858251234], [1886, 1.964325308], [6855, 8.166794261],
    [7416, 8.85234902], [26007, 31.13560453], [26859, 32.15014193],
    [98680, 119.9441516], [103299, 125.8314844], [335074, 485.3593732],
    [343984, 502.5089216], [769096, 2026.375904], [780459, 2104.4514]
  ]
};

// Simple least squares fit
function fitToMSDData(signals, msdConcs) {
  let bestLoss = Infinity;
  let bestParams = null;
  
  // Smart grid search over reasonable parameter ranges
  const bottomRange = [Math.min(...signals) * 0.5, Math.min(...signals) * 1.5];
  const topRange = [Math.max(...signals) * 0.8, Math.max(...signals) * 1.2];
  const midpointRange = [Math.min(...msdConcs), Math.max(...msdConcs)];
  const hillslopeRange = [0.7, 1.3];
  
  console.log(`   Search ranges:`);
  console.log(`     Bottom: ${bottomRange[0].toFixed(0)} - ${bottomRange[1].toFixed(0)}`);
  console.log(`     Top: ${topRange[0].toFixed(0)} - ${topRange[1].toFixed(0)}`);
  console.log(`     MidPoint: ${midpointRange[0].toFixed(2)} - ${midpointRange[1].toFixed(2)}`);
  console.log(`     HillSlope: ${hillslopeRange[0]} - ${hillslopeRange[1]}`);
  
  // Grid search (coarse then fine)
  for (let gridLevel = 0; gridLevel < 2; gridLevel++) {
    const steps = gridLevel === 0 ? 5 : 10;
    
    for (let bi = 0; bi < steps; bi++) {
      const bottom = bottomRange[0] + (bottomRange[1] - bottomRange[0]) * bi / (steps - 1);
      
      for (let ti = 0; ti < steps; ti++) {
        const top = topRange[0] + (topRange[1] - topRange[0]) * ti / (steps - 1);
        if (top <= bottom) continue;
        
        for (let mi = 0; mi < steps; mi++) {
          const midpoint = midpointRange[0] + (midpointRange[1] - midpointRange[0]) * mi / (steps - 1);
          if (midpoint <= 0) continue;
          
          for (let hi = 0; hi < steps; hi++) {
            const hillslope = hillslopeRange[0] + (hillslopeRange[1] - hillslopeRange[0]) * hi / (steps - 1);
            
            // Calculate loss: how well do these params predict MSD's concentrations?
            let loss = 0;
            for (let i = 0; i < signals.length; i++) {
              const predicted = inverseFourPL(signals[i], bottom, top, midpoint, hillslope);
              if (predicted && predicted > 0) {
                loss += Math.pow((predicted - msdConcs[i]) / Math.max(msdConcs[i], 0.001), 2);
              } else {
                loss += 1e6; // Penalty for invalid
              }
            }
            
            if (loss < bestLoss) {
              bestLoss = loss;
              bestParams = { bottom, top, midpoint, hillslope };
              
              // Refine search range around this point for next level
              if (gridLevel === 0) {
                const rangeWidth = 0.3; // 30% of current range
                bottomRange[0] = Math.max(bottomRange[0], bottom * (1 - rangeWidth));
                bottomRange[1] = Math.min(bottomRange[1], bottom * (1 + rangeWidth));
                topRange[0] = Math.max(topRange[0], top * (1 - rangeWidth));
                topRange[1] = Math.min(topRange[1], top * (1 + rangeWidth));
                midpointRange[0] = Math.max(0.001, midpoint * (1 - rangeWidth));
                midpointRange[1] = midpoint * (1 + rangeWidth);
                hillslopeRange[0] = Math.max(0.5, hillslope - 0.2);
                hillslopeRange[1] = Math.min(1.5, hillslope + 0.2);
              }
            }
          }
        }
      }
    }
  }
  
  return bestParams;
}

console.log('═'.repeat(120));
console.log('                        REVERSE-ENGINEERING MSD PARAMETERS');
console.log('═'.repeat(120));
console.log('\n📊 Strategy: Fit 4PL parameters to match MSD\'s calculated concentrations\n');

const results = {};

for (const [cytokine, data] of Object.entries(MSD_CALC_DATA)) {
  console.log(`\n🔬 ${cytokine}:`);
  console.log(`   Data points: ${data.length}`);
  
  const signals = data.map(d => d[0]);
  const msdConcs = data.map(d => d[1]);
  
  console.log(`   Signal range: ${Math.min(...signals)} - ${Math.max(...signals)}`);
  console.log(`   MSD conc range: ${Math.min(...msdConcs).toFixed(3)} - ${Math.max(...msdConcs).toFixed(1)}`);
  
  const params = fitToMSDData(signals, msdConcs);
  results[cytokine] = params;
  
  console.log(`   ✅ Reverse-engineered parameters:`);
  console.log(`      Bottom:    ${params.bottom.toFixed(2)}`);
  console.log(`      Top:       ${params.top.toFixed(2)}`);
  console.log(`      MidPoint:  ${params.midpoint.toFixed(2)}`);
  console.log(`      HillSlope: ${params.hillslope.toFixed(6)}`);
  
  // Validate
  let totalErr = 0, count = 0;
  for (let i = 0; i < signals.length; i++) {
    const calc = inverseFourPL(signals[i], params.bottom, params.top, params.midpoint, params.hillslope);
    if (calc && calc > 0 && msdConcs[i] > 0) {
      const err = Math.abs((calc - msdConcs[i]) / msdConcs[i]) * 100;
      totalErr += err;
      count++;
    }
  }
  console.log(`   📊 Match quality: ${(totalErr/count).toFixed(2)}% average error vs MSD`);
}

console.log('\n' + '═'.repeat(120));
console.log('REVERSE-ENGINEERED E3P1 PARAMETERS:');
console.log('═'.repeat(120));
console.log('\nconst E3P1_PARAMETERS = {');
for (const [cytokine, params] of Object.entries(results)) {
  console.log(`  '${cytokine}': { Top: ${params.top}, Bottom: ${params.bottom}, MidPoint: ${params.midpoint}, HillSlope: ${params.hillslope} },`);
}
console.log('};');

console.log('\n✅ These parameters should closely match what MSD Discovery Workbench calculated!');
console.log('═'.repeat(120));

