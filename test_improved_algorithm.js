// Test the improved algorithm with adaptive exclusion on user's data

function msd_mean(arr) { 
  return arr.reduce((a, b) => a + b, 0) / arr.length; 
}

function msd_log10(v) { 
  return Math.log(Math.max(v, 1e-10)) / Math.LN10; 
}

// Improved MidPoint calculation with adaptive exclusion
function calculateMidPointWithExclusion(concentrations, meanSignals) {
  let bestC0 = null;
  let bestScore = Infinity;
  const minConc = Math.min(...concentrations);
  const maxConc = Math.max(...concentrations);
  let bestExclusion = 0;
  let bestFactor = 1.2;
  
  // Try different exclusion patterns (exclude 0-3 early points)
  for (let excludeStart = 0; excludeStart <= Math.min(3, concentrations.length - 3); excludeStart++) {
    const testConc = concentrations.slice(excludeStart);
    const testY = meanSignals.slice(excludeStart);
    
    if (testConc.length < 3) continue;
    
    const minSignal = Math.min(...testY);
    const maxSignal = Math.max(...testY);
    const midSignal = (minSignal + maxSignal) / 2;
    let baseC0 = Math.sqrt(testConc[0] * testConc[testConc.length - 1]);
    
    // Interpolate
    for (let i = 0; i < testY.length - 1; i++) {
      if ((testY[i] <= midSignal && testY[i+1] >= midSignal) || 
          (testY[i] >= midSignal && testY[i+1] <= midSignal)) {
        const y1 = testY[i];
        const y2 = testY[i+1];
        const x1 = msd_log10(testConc[i]);
        const x2 = msd_log10(testConc[i+1]);
        if (Math.abs(y2 - y1) > 1e-6) {
          const fraction = (midSignal - y1) / (y2 - y1);
          const xlogMid = x1 + fraction * (x2 - x1);
          baseC0 = Math.pow(10, xlogMid);
        }
        break;
      }
    }
    
    // Try different correction factors
    const factors = [1.0, 1.15, 1.2, 1.25];
    for (const factor of factors) {
      const testC0 = baseC0 * factor;
      
      let score = 0;
      if (testC0 < minConc * 0.1 || testC0 > maxConc * 10) {
        score += 1000;
      } else if (testC0 < minConc || testC0 > maxConc) {
        score += 100;
      }
      const midRange = (minConc + maxConc) / 2;
      score += Math.abs(testC0 - midRange) / maxConc * 50;
      score -= (testConc.length / concentrations.length) * 5;
      
      if (score < bestScore) {
        bestScore = score;
        bestC0 = testC0;
        bestExclusion = excludeStart;
        bestFactor = factor;
      }
    }
  }
  
  return {
    midPoint: bestC0 || (Math.sqrt(concentrations[0] * concentrations[concentrations.length - 1]) * 1.2),
    excludeStart: bestExclusion,
    factor: bestFactor
  };
}

// User's data
const userData = {
  zero: [119, 98],
  standards: [
    {conc: 1.127929688, signals: [1658, 1591]},
    {conc: 4.51171875, signals: [6241, 5432]},
    {conc: 18.046875, signals: [19341, 21411]},
    {conc: 72.1875, signals: [93083, 77758]},
    {conc: 288.75, signals: [301744, 305792]},
    {conc: 1155, signals: [1342780, 1100625]},
    {conc: 4620, signals: [1759497, 1836747]}
  ]
};

// Process data
const zeroMean = msd_mean(userData.zero);
const meanSignals = userData.standards.map(s => msd_mean(s.signals));
const concentrations = userData.standards.map(s => s.conc);

console.log('='.repeat(80));
console.log('TESTING IMPROVED ALGORITHM ON USER DATA');
console.log('='.repeat(80));

// Calculate initial parameters
const A0 = zeroMean * 0.9;
const D0 = Math.max(...meanSignals) * 1.01;
const B0 = 1.0;
const midPointResult = calculateMidPointWithExclusion(concentrations, meanSignals);
const C0 = midPointResult.midPoint;

console.log('\nInitial Parameters:');
console.log(`  Bottom (A0): ${A0.toFixed(2)} (from zero mean ${zeroMean.toFixed(2)} * 0.9)`);
console.log(`  Top (D0): ${D0.toFixed(2)} (from max ${Math.max(...meanSignals).toFixed(2)} * 1.01)`);
console.log(`  MidPoint (C0): ${C0.toFixed(4)}`);
console.log(`    - Excluded first ${midPointResult.excludeStart} point(s)`);
console.log(`    - Used correction factor: ${midPointResult.factor.toFixed(2)}`);
console.log(`  HillSlope (B0): ${B0.toFixed(2)}`);

console.log('\n' + '='.repeat(80));
console.log('COMPARISON WITH PREVIOUS (without exclusion):');
console.log('-'.repeat(80));

// Calculate without exclusion for comparison
const minSignal = Math.min(...meanSignals);
const maxSignal = Math.max(...meanSignals);
const midSignal = (minSignal + maxSignal) / 2;
let oldC0 = Math.sqrt(concentrations[0] * concentrations[concentrations.length - 1]);

for (let i = 0; i < meanSignals.length - 1; i++) {
  if ((meanSignals[i] <= midSignal && meanSignals[i+1] >= midSignal) || 
      (meanSignals[i] >= midSignal && meanSignals[i+1] <= midSignal)) {
    const y1 = meanSignals[i];
    const y2 = meanSignals[i+1];
    const x1 = msd_log10(concentrations[i]);
    const x2 = msd_log10(concentrations[i+1]);
    if (Math.abs(y2 - y1) > 1e-6) {
      const fraction = (midSignal - y1) / (y2 - y1);
      const xlogMid = x1 + fraction * (x2 - x1);
      oldC0 = Math.pow(10, xlogMid);
    }
    break;
  }
}
oldC0 = oldC0 * 1.2;

console.log(`Old method (no exclusion): C0 = ${oldC0.toFixed(4)}`);
console.log(`New method (with exclusion): C0 = ${C0.toFixed(4)}`);
console.log(`Difference: ${Math.abs(C0 - oldC0).toFixed(4)} (${Math.abs(C0 - oldC0) / oldC0 * 100}%)`);




