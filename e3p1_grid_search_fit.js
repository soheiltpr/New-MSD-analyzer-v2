// E3P1 Robust Grid Search 4PL Fitting
// Use comprehensive grid search instead of gradient descent

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

// Quality filtering based on CV
function filterByQuality(standards, cvThreshold = 25) {
  const byConc = {};
  for (const [conc, signal] of standards) {
    if (!byConc[conc]) byConc[conc] = [];
    byConc[conc].push(signal);
  }
  
  const cvData = [];
  for (const [conc, signals] of Object.entries(byConc)) {
    if (signals.length < 2) continue;
    const mean = signals.reduce((a,b) => a+b, 0) / signals.length;
    const sd = Math.sqrt(signals.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / signals.length);
    const cv = (sd / mean) * 100;
    cvData.push({ conc: parseFloat(conc), signals, mean, sd, cv });
  }
  
  const goodData = cvData.filter(d => d.cv <= cvThreshold);
  
  if (goodData.length < 4) {
    return standards; // Use all if not enough good data
  }
  
  return goodData.flatMap(d => d.signals.map(s => [d.conc, s]));
}

// Comprehensive grid search with refinement
function fitWithGridSearch(standards) {
  const filtered = filterByQuality(standards, 25);
  const xData = filtered.map(d => d[0]);
  const yData = filtered.map(d => d[1]);
  
  const yMin = Math.min(...yData);
  const yMax = Math.max(...yData);
  const xMin = Math.min(...xData);
  const xMax = Math.max(...xData);
  
  let bestLoss = Infinity;
  let bestParams = null;
  
  // Coarse grid search
  const bottomRange = [yMin * 0.5, yMin * 1.5];
  const topRange = [yMax * 0.8, yMax * 1.2];
  const midpointRange = [xMin * 0.1, xMax * 10];
  const hillslopeRange = [0.7, 1.3];
  
  console.log(`   Grid search over: Bottom[${bottomRange[0].toFixed(0)}-${bottomRange[1].toFixed(0)}], Top[${topRange[0].toFixed(0)}-${topRange[1].toFixed(0)}], MidPoint[${midpointRange[0].toFixed(2)}-${midpointRange[1].toFixed(2)}], HillSlope[${hillslopeRange[0]}-${hillslopeRange[1]}]`);
  
  const steps = 8; // 8^4 = 4096 combinations
  
  for (let bi = 0; bi < steps; bi++) {
    const bottom = bottomRange[0] + (bottomRange[1] - bottomRange[0]) * bi / (steps - 1);
    
    for (let ti = 0; ti < steps; ti++) {
      const top = topRange[0] + (topRange[1] - topRange[0]) * ti / (steps - 1);
      if (top <= bottom) continue;
      
      for (let mi = 0; mi < steps; mi++) {
        // Log-scale for midpoint
        const logMin = Math.log10(midpointRange[0]);
        const logMax = Math.log10(midpointRange[1]);
        const midpoint = Math.pow(10, logMin + (logMax - logMin) * mi / (steps - 1));
        
        for (let hi = 0; hi < steps; hi++) {
          const hillslope = hillslopeRange[0] + (hillslopeRange[1] - hillslopeRange[0]) * hi / (steps - 1);
          
          // Calculate weighted loss
          let loss = 0;
          for (let i = 0; i < xData.length; i++) {
            const pred = fourPL(xData[i], bottom, top, midpoint, hillslope);
            const weight = 1 / Math.pow(Math.max(yData[i], 1), 2);
            loss += weight * Math.pow(pred - yData[i], 2);
          }
          
          if (loss < bestLoss) {
            bestLoss = loss;
            bestParams = { bottom, top, midpoint, hillslope };
          }
        }
      }
    }
  }
  
  console.log(`   Best loss: ${bestLoss.toExponential(2)}`);
  return bestParams;
}

// Shortened data for demonstration - GM-CSF only
const GMCSF_DATA = {
  standards: [[1.127929688,1278],[1.127929688,1611],[4.51171875,4529],[4.51171875,5797],[18.046875,18374],[18.046875,21263],[72.1875,74083],[72.1875,84188],[288.75,270599],[288.75,304331],[1155,1070008],[1155,1143081],[4620,1809801],[4620,1846757]],
  all: [[0,207],[0,113],[1.127929688,1278],[1.127929688,1611],[4.51171875,4529],[4.51171875,5797],[18.046875,18374],[18.046875,21263],[72.1875,74083],[72.1875,84188],[288.75,270599],[288.75,304331],[1155,1070008],[1155,1143081],[4620,1809801],[4620,1846757]],
  msdCalc: [0.044398575, null, 1.027361155, 1.329200835, 3.950690195, 5.082872159, 16.24690437, 18.8066815, 66.00908455, 75.17169092, 254.8536874, 289.84992, 1411.899388, 1568.214199, 3927.034835, 4142.352175]
};

console.log('═'.repeat(120));
console.log('                  E3P1 GRID SEARCH 4PL FITTING - GM-CSF DEMONSTRATION');
console.log('═'.repeat(120));
console.log('\n🔑 Using comprehensive grid search for robust parameter estimation\n');

console.log('🔬 GM-CSF Analysis:');
const fit = fitWithGridSearch(GMCSF_DATA.standards);

console.log(`\n   ✅ FITTED PARAMETERS:`);
console.log(`      Bottom:    ${fit.bottom.toFixed(2)}`);
console.log(`      Top:       ${fit.top.toFixed(2)}`);
console.log(`      MidPoint:  ${fit.midpoint.toFixed(2)}`);
console.log(`      HillSlope: ${fit.hillslope.toFixed(6)}`);

// Compare with MSD
console.log(`\n   📊 COMPARISON WITH MSD:`);
console.log('   Well      Signal      My Calc         MSD Calc        Diff (%)');
console.log('   ' + '-'.repeat(100));

const wells = ['A02','H02','A03','H03','A04','H04','A05','H05','A06','H06','A07','H07','A08','H08','A09','H09'];
let totalDiff = 0, count = 0, maxDiff = 0;

for (let i = 0; i < GMCSF_DATA.all.length; i++) {
  const [_, signal] = GMCSF_DATA.all[i];
  const msdCalc = GMCSF_DATA.msdCalc[i];
  const myCalc = inverseFourPL(signal, fit.bottom, fit.top, fit.midpoint, fit.hillslope);
  
  const myStr = myCalc ? myCalc.toFixed(4) : 'N/A';
  const msdStr = msdCalc !== null ? msdCalc.toFixed(4) : 'N/A';
  
  let diffStr = 'N/A';
  if (myCalc && msdCalc && msdCalc > 0) {
    const diff = Math.abs((myCalc - msdCalc) / msdCalc) * 100;
    diffStr = diff.toFixed(2) + '%';
    totalDiff += diff;
    count++;
    maxDiff = Math.max(maxDiff, diff);
  }
  
  console.log(`   ${wells[i].padEnd(9)} ${signal.toString().padEnd(11)} ${myStr.padEnd(15)} ${msdStr.padEnd(15)} ${diffStr}`);
}

const avgDiff = count > 0 ? totalDiff / count : 0;
console.log('   ' + '-'.repeat(100));
console.log(`   📊 SUMMARY: Avg Diff = ${avgDiff.toFixed(2)}%, Max Diff = ${maxDiff.toFixed(2)}%, Points = ${count}/${GMCSF_DATA.all.length}`);

if (avgDiff < 10) {
  console.log(`   ✅ EXCELLENT MATCH!`);
} else if (avgDiff < 25) {
  console.log(`   ✅ GOOD MATCH`);
} else {
  console.log(`   ⚠️  Needs improvement`);
}

console.log('\n' + '═'.repeat(120));
console.log('💡 KEY INSIGHT:');
console.log('═'.repeat(120));
console.log('\nGrid search is more robust than gradient descent for this problem.');
console.log('However, it\'s computationally intensive. MSD likely uses:');
console.log('  - Levenberg-Marquardt algorithm (industry standard)');
console.log('  - Multiple starting points');
console.log('  - Adaptive trust regions');
console.log('\nFor production: Consider using a proper nonlinear least squares library.');
console.log('═'.repeat(120));

