// E3P1 CORRECT 4PL Fitting - Learning from MSD's approach
// Key: Proper constraints, better initialization, robust optimization

const fs = require('fs');

// Standard 4PL: y = Bottom + (Top - Bottom) / (1 + (x/MidPoint)^HillSlope)
function fourPL(x, bottom, top, midpoint, hillslope) {
  return bottom + (top - bottom) / (1 + Math.pow(x / midpoint, hillslope));
}

// Inverse 4PL: x = MidPoint * ((Top - Bottom) / (y - Bottom) - 1)^(1/HillSlope)
function inverseFourPL(y, bottom, top, midpoint, hillslope) {
  if (y <= bottom) return null;
  if (y >= top) return null;
  const ratio = (top - bottom) / (y - bottom) - 1;
  if (ratio <= 0) return null;
  return midpoint / Math.pow(ratio, 1 / hillslope);
}

// Loss function with proper 1/y² weighting
function loss(params, xData, yData) {
  const [bottom, top, midpoint, hillslope] = params;
  
  // CRITICAL: Enforce constraints
  if (top <= bottom) return 1e20; // Top must be > Bottom
  if (midpoint <= 0) return 1e20;
  if (hillslope <= 0.3 || hillslope > 1.5) return 1e20; // Typical MSD range
  if (bottom < 0) return 1e20;
  
  let sse = 0;
  for (let i = 0; i < xData.length; i++) {
    const predicted = fourPL(xData[i], bottom, top, midpoint, hillslope);
    const weight = 1 / Math.pow(Math.max(yData[i], 1), 2); // 1/y²
    sse += weight * Math.pow(yData[i] - predicted, 2);
  }
  return sse;
}

// Simple gradient descent with momentum (more stable than Nelder-Mead for this)
function fitFourPL(xData, yData, maxIter = 500) {
  // BETTER initial guesses based on data
  const yMin = Math.min(...yData);
  const yMax = Math.max(...yData);
  const xMin = Math.min(...xData);
  const xMax = Math.max(...xData);
  
  let bottom = yMin * 0.95; // Start slightly below minimum
  let top = yMax * 1.05;    // Start slightly above maximum
  let midpoint = Math.sqrt(xMin * xMax); // Geometric mean
  let hillslope = 1.0;      // Typical value
  
  // Learning rates
  const lr = {
    bottom: yMax * 0.0001,
    top: yMax * 0.0001,
    midpoint: midpoint * 0.01,
    hillslope: 0.001
  };
  
  let bestLoss = Infinity;
  let bestParams = [bottom, top, midpoint, hillslope];
  let patience = 50;
  let noImprove = 0;
  
  for (let iter = 0; iter < maxIter; iter++) {
    const currentLoss = loss([bottom, top, midpoint, hillslope], xData, yData);
    
    if (currentLoss < bestLoss) {
      bestLoss = currentLoss;
      bestParams = [bottom, top, midpoint, hillslope];
      noImprove = 0;
    } else {
      noImprove++;
      if (noImprove > patience) break; // Early stopping
    }
    
    // Try small perturbations
    const delta = 0.001;
    
    // Bottom
    const lossBottomPlus = loss([bottom + delta * yMax, top, midpoint, hillslope], xData, yData);
    const gradBottom = (lossBottomPlus - currentLoss) / (delta * yMax);
    bottom -= lr.bottom * gradBottom;
    bottom = Math.max(0, Math.min(bottom, yMin)); // Constrain
    
    // Top
    const lossTopPlus = loss([bottom, top + delta * yMax, midpoint, hillslope], xData, yData);
    const gradTop = (lossTopPlus - currentLoss) / (delta * yMax);
    top -= lr.top * gradTop;
    top = Math.max(bottom * 1.5, top); // Must be > bottom
    
    // MidPoint
    const lossMidPlus = loss([bottom, top, midpoint * (1 + delta), hillslope], xData, yData);
    const gradMid = (lossMidPlus - currentLoss) / (midpoint * delta);
    midpoint -= lr.midpoint * gradMid;
    midpoint = Math.max(xMin * 0.1, Math.min(midpoint, xMax * 10)); // Constrain
    
    // HillSlope
    const lossHillPlus = loss([bottom, top, midpoint, hillslope + delta], xData, yData);
    const gradHill = (lossHillPlus - currentLoss) / delta;
    hillslope -= lr.hillslope * gradHill;
    hillslope = Math.max(0.5, Math.min(hillslope, 1.3)); // Typical MSD range
  }
  
  return {
    bottom: bestParams[0],
    top: bestParams[1],
    midpoint: bestParams[2],
    hillslope: bestParams[3],
    loss: bestLoss
  };
}

// E3P1 Data
const E3P1_DATA = {
  'GM-CSF': {
    standards: [[1.127929688,1278],[1.127929688,1611],[4.51171875,4529],[4.51171875,5797],[18.046875,18374],[18.046875,21263],[72.1875,74083],[72.1875,84188],[288.75,270599],[288.75,304331],[1155,1070008],[1155,1143081],[4620,1809801],[4620,1846757]],
    all: [[0,207],[0,113],[1.127929688,1278],[1.127929688,1611],[4.51171875,4529],[4.51171875,5797],[18.046875,18374],[18.046875,21263],[72.1875,74083],[72.1875,84188],[288.75,270599],[288.75,304331],[1155,1070008],[1155,1143081],[4620,1809801],[4620,1846757]]
  },
  'IFN-γ': {
    standards: [[3.918457031,651],[3.918457031,393],[15.67382813,1089],[15.67382813,1037],[62.6953125,3417],[62.6953125,3558],[250.78125,14390],[250.78125,14199],[1003.125,52179],[1003.125,52864],[4012.5,237392],[4012.5,242445],[16050,1059190],[16050,1002274]],
    all: [[0,623],[0,165],[3.918457031,651],[3.918457031,393],[15.67382813,1089],[15.67382813,1037],[62.6953125,3417],[62.6953125,3558],[250.78125,14390],[250.78125,14199],[1003.125,52179],[1003.125,52864],[4012.5,237392],[4012.5,242445],[16050,1059190],[16050,1002274]]
  },
  'IL-10': {
    standards: [[0.491943359,806],[0.491943359,675],[1.967773438,1804],[1.967773438,1886],[7.87109375,6855],[7.87109375,7416],[31.484375,26007],[31.484375,26859],[125.9375,98680],[125.9375,103299],[503.75,335074],[503.75,343984],[2015,769096],[2015,780459]],
    all: [[0,606],[0,273],[0.491943359,806],[0.491943359,675],[1.967773438,1804],[1.967773438,1886],[7.87109375,6855],[7.87109375,7416],[31.484375,26007],[31.484375,26859],[125.9375,98680],[125.9375,103299],[503.75,335074],[503.75,343984],[2015,769096],[2015,780459]]
  },
  'IL-1β': {
    standards: [[0.541992188,1360],[0.541992188,683],[2.16796875,2149],[2.16796875,2116],[8.671875,7362],[8.671875,7459],[34.6875,29935],[34.6875,30162],[138.75,111113],[138.75,106123],[555,417213],[555,412734],[2220,1264883],[2220,1186955]],
    all: [[0,887],[0,195],[0.541992188,1360],[0.541992188,683],[2.16796875,2149],[2.16796875,2116],[8.671875,7362],[8.671875,7459],[34.6875,29935],[34.6875,30162],[138.75,111113],[138.75,106123],[555,417213],[555,412734],[2220,1264883],[2220,1186955]]
  },
  'IL-2': {
    standards: [[0.230712891,411],[0.230712891,179],[0.922851563,439],[0.922851563,349],[3.69140625,856],[3.69140625,982],[14.765625,3151],[14.765625,3745],[59.0625,11944],[59.0625,13807],[236.25,50561],[236.25,57538],[945,188551],[945,239755]],
    all: [[0,421],[0,141],[0.230712891,411],[0.230712891,179],[0.922851563,439],[0.922851563,349],[3.69140625,856],[3.69140625,982],[14.765625,3151],[14.765625,3745],[59.0625,11944],[59.0625,13807],[236.25,50561],[236.25,57538],[945,188551],[945,239755]]
  },
  'IL-4': {
    standards: [[0.201416016,786],[0.201416016,829],[0.805664063,2572],[0.805664063,2776],[3.22265625,10177],[3.22265625,10745],[12.890625,39995],[12.890625,40060],[51.5625,154084],[51.5625,154892],[206.25,605506],[206.25,597286],[825,1379072],[825,1474619]],
    all: [[0,188],[0,94],[0.201416016,786],[0.201416016,829],[0.805664063,2572],[0.805664063,2776],[3.22265625,10177],[3.22265625,10745],[12.890625,39995],[12.890625,40060],[51.5625,154084],[51.5625,154892],[206.25,605506],[206.25,597286],[825,1379072],[825,1474619]]
  },
  'IL-5': {
    standards: [[0.522460938,523],[0.522460938,395],[2.08984375,1133],[2.08984375,1067],[8.359375,4003],[8.359375,4145],[33.4375,17283],[33.4375,16103],[133.75,61651],[133.75,59964],[535,246308],[535,241288],[2140,836216],[2140,791590]],
    all: [[0,577],[0,141],[0.522460938,523],[0.522460938,395],[2.08984375,1133],[2.08984375,1067],[8.359375,4003],[8.359375,4145],[33.4375,17283],[33.4375,16103],[133.75,61651],[133.75,59964],[535,246308],[535,241288],[2140,836216],[2140,791590]]
  },
  'IL-6': {
    standards: [[0.25390625,1555],[0.25390625,521],[1.015625,928],[1.015625,762],[4.0625,1957],[4.0625,1966],[16.25,6671],[16.25,6970],[65,27024],[65,29395],[260,130007],[260,134248],[1040,586864],[1040,579611]],
    all: [[0,1605],[0,744],[0.25390625,1555],[0.25390625,521],[1.015625,928],[1.015625,762],[4.0625,1957],[4.0625,1966],[16.25,6671],[16.25,6970],[65,27024],[65,29395],[260,130007],[260,134248],[1040,586864],[1040,579611]]
  },
  'MCP-1': {
    standards: [[0.659179688,26348],[0.659179688,5076],[2.63671875,15126],[2.63671875,5588],[10.546875,13071],[10.546875,8629],[42.1875,28182],[42.1875,25636],[168.75,109654],[168.75,110922],[675,385905],[675,401049],[2700,775936],[2700,831302]],
    all: [[0,45973],[0,9680],[0.659179688,26348],[0.659179688,5076],[2.63671875,15126],[2.63671875,5588],[10.546875,13071],[10.546875,8629],[42.1875,28182],[42.1875,25636],[168.75,109654],[168.75,110922],[675,385905],[675,401049],[2700,775936],[2700,831302]]
  },
  'TNF-α': {
    standards: [[0.330810547,580],[0.330810547,505],[1.323242188,1175],[1.323242188,1095],[5.29296875,4081],[5.29296875,4223],[21.171875,17749],[21.171875,15813],[84.6875,62536],[84.6875,61962],[338.75,269475],[338.75,246720],[1355,940177],[1355,867425]],
    all: [[0,1222],[0,256],[0.330810547,580],[0.330810547,505],[1.323242188,1175],[1.323242188,1095],[5.29296875,4081],[5.29296875,4223],[21.171875,17749],[21.171875,15813],[84.6875,62536],[84.6875,61962],[338.75,269475],[338.75,246720],[1355,940177],[1355,867425]]
  }
};

console.log('═'.repeat(120));
console.log('                       E3P1 CORRECT 4PL FITTING - MSD-Style Approach');
console.log('═'.repeat(120));
console.log('\n✅ Method: 1/y² weighted 4PL with proper constraints');
console.log('✅ Iterations: 500 with early stopping');
console.log('✅ Key Fix: Enforced Top > Bottom, realistic parameter bounds\n');

const results = {};

for (const [cytokine, data] of Object.entries(E3P1_DATA)) {
  console.log(`\n🔬 ${cytokine}:`);
  
  const standards = data.standards;
  const xData = standards.map(d => d[0]);
  const yData = standards.map(d => d[1]);
  
  console.log(`   Standards: ${standards.length} points`);
  console.log(`   X range: ${Math.min(...xData).toFixed(3)} - ${Math.max(...xData).toFixed(1)} pg/mL`);
  console.log(`   Y range: ${Math.min(...yData)} - ${Math.max(...yData)}`);
  
  const fit = fitFourPL(xData, yData, 500);
  
  results[cytokine] = fit;
  
  console.log(`   ✅ Bottom:    ${fit.bottom.toFixed(2)}`);
  console.log(`   ✅ Top:       ${fit.top.toFixed(2)}`);
  console.log(`   ✅ MidPoint:  ${fit.midpoint.toFixed(2)}`);
  console.log(`   ✅ HillSlope: ${fit.hillslope.toFixed(6)}`);
  
  // Validate
  let totalErr = 0, count = 0, maxErr = 0;
  for (let i = 0; i < standards.length; i++) {
    const calc = inverseFourPL(yData[i], fit.bottom, fit.top, fit.midpoint, fit.hillslope);
    if (calc && calc > 0) {
      const err = Math.abs((calc - xData[i]) / xData[i]) * 100;
      totalErr += err;
      count++;
      maxErr = Math.max(maxErr, err);
    }
  }
  const avgErr = count > 0 ? totalErr / count : 0;
  console.log(`   📊 Validation: Avg=${avgErr.toFixed(2)}%, Max=${maxErr.toFixed(2)}%, Points=${count}/${standards.length}`);
}

console.log('\n' + '═'.repeat(120));
console.log('CALCULATING ALL CONCENTRATIONS:');
console.log('═'.repeat(120));

const wells = ['A02','H02','A03','H03','A04','H04','A05','H05','A06','H06','A07','H07','A08','H08','A09','H09'];
let csvLines = ['Well,Cytokine,Signal,Calculated Concentration (pg/mL)'];

for (const [cytokine, data] of Object.entries(E3P1_DATA)) {
  const params = results[cytokine];
  const allData = data.all;
  
  console.log(`\n${cytokine}:`);
  console.log('Well'.padEnd(8) + 'Signal'.padEnd(12) + 'Calc. Conc (pg/mL)');
  console.log('-'.repeat(60));
  
  for (let i = 0; i < allData.length; i++) {
    const [knownConc, signal] = allData[i];
    const well = wells[i];
    const calcConc = inverseFourPL(signal, params.bottom, params.top, params.midpoint, params.hillslope);
    const concStr = calcConc ? calcConc.toFixed(4) : 'N/A';
    
    console.log(well.padEnd(8) + signal.toString().padEnd(12) + concStr);
    csvLines.push(`${well},${cytokine},${signal},${calcConc ? calcConc.toFixed(4) : 'N/A'}`);
  }
}

console.log('\n' + '═'.repeat(120));
console.log('FITTED PARAMETERS:');
console.log('═'.repeat(120));
console.log('\nconst E3P1_PARAMETERS = {');
for (const [cytokine, params] of Object.entries(results)) {
  console.log(`  '${cytokine}': { Top: ${params.top}, Bottom: ${params.bottom}, MidPoint: ${params.midpoint}, HillSlope: ${params.hillslope} },`);
}
console.log('};');

fs.writeFileSync('E3P1_FINAL_correct.csv', csvLines.join('\n'));
console.log('\n✅ Results saved to E3P1_FINAL_correct.csv');
console.log('═'.repeat(120));

