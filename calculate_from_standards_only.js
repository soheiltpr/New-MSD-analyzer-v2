/**
 * Calculate concentration from signal using ONLY standards data (no 4PL parameters)
 * For IFN-γ E3_P6, signal = 14446
 */

// E3_P6 IFN-γ Standards (from training data)
const standards = [
  { concentration: 0.0, signals: [585.0, 577.0], mean: 581.0 },
  { concentration: 3.515625, signals: [1822.0, 1792.0], mean: 1807.0 },
  { concentration: 14.0625, signals: [5787.0, 5967.0], mean: 5877.0 },
  { concentration: 56.25, signals: [20662.0, 21146.0], mean: 20904.0 },
  { concentration: 225.0, signals: [72308.0, 73464.0], mean: 72886.0 },
  { concentration: 900.0, signals: [286501.0, 291072.0], mean: 288786.5 },
  { concentration: 3600.0, signals: [857918.0, 877755.0], mean: 867836.5 },
  { concentration: 14400.0, signals: [1042532.0, 1042892.0], mean: 1042712.0 }
];

// Filter out zero concentration
const dataPoints = standards.filter(s => s.concentration > 0).map(s => ({
  concentration: s.concentration,
  signal: s.mean
}));

console.log('='.repeat(80));
console.log('CALCULATION FROM STANDARDS ONLY (No 4PL Parameters)');
console.log('IFN-γ E3_P6 - Signal = 14,446');
console.log('='.repeat(80));

console.log('\nStandards Data:');
console.log('Concentration | Signal');
console.log('-'.repeat(30));
dataPoints.forEach(dp => {
  console.log(`${dp.concentration.toFixed(4).padEnd(13)} | ${dp.signal.toFixed(2)}`);
});

const targetSignal = 14446;

/**
 * Linear interpolation in log-log space (most accurate for sigmoidal curves)
 */
function interpolateLogLog(signal, dataPoints) {
  // Sort by signal
  const sorted = [...dataPoints].sort((a, b) => a.signal - b.signal);
  
  // Check bounds
  if (signal <= sorted[0].signal) {
    // Below lowest standard - extrapolate
    const ratio = signal / sorted[0].signal;
    return sorted[0].concentration * ratio;
  }
  
  if (signal >= sorted[sorted.length - 1].signal) {
    // Above highest standard - extrapolate
    const last = sorted[sorted.length - 1];
    const secondLast = sorted[sorted.length - 2];
    const ratio = signal / last.signal;
    return last.concentration * ratio;
  }
  
  // Find the two points to interpolate between
  let lowerIdx = 0;
  let upperIdx = sorted.length - 1;
  
  for (let i = 0; i < sorted.length - 1; i++) {
    if (signal >= sorted[i].signal && signal <= sorted[i + 1].signal) {
      lowerIdx = i;
      upperIdx = i + 1;
      break;
    }
  }
  
  const lower = sorted[lowerIdx];
  const upper = sorted[upperIdx];
  
  // Linear interpolation in log-log space
  const logSignal = Math.log(signal);
  const logLowerSignal = Math.log(lower.signal);
  const logUpperSignal = Math.log(upper.signal);
  const logLowerConc = Math.log(lower.concentration);
  const logUpperConc = Math.log(upper.concentration);
  
  // Interpolate
  const ratio = (logSignal - logLowerSignal) / (logUpperSignal - logLowerSignal);
  const logConc = logLowerConc + ratio * (logUpperConc - logLowerConc);
  
  return Math.exp(logConc);
}

/**
 * Simple linear interpolation
 */
function interpolateLinear(signal, dataPoints) {
  const sorted = [...dataPoints].sort((a, b) => a.signal - b.signal);
  
  if (signal <= sorted[0].signal) {
    return sorted[0].concentration * (signal / sorted[0].signal);
  }
  
  if (signal >= sorted[sorted.length - 1].signal) {
    return sorted[sorted.length - 1].concentration * (signal / sorted[sorted.length - 1].signal);
  }
  
  for (let i = 0; i < sorted.length - 1; i++) {
    if (signal >= sorted[i].signal && signal <= sorted[i + 1].signal) {
      const ratio = (signal - sorted[i].signal) / (sorted[i + 1].signal - sorted[i].signal);
      return sorted[i].concentration + ratio * (sorted[i + 1].concentration - sorted[i].concentration);
    }
  }
  
  return null;
}

console.log(`\n${'='.repeat(80)}`);
console.log(`Target Signal: ${targetSignal}`);
console.log('='.repeat(80));

// Method 1: Log-log interpolation (most accurate for sigmoidal curves)
const concLogLog = interpolateLogLog(targetSignal, dataPoints);
console.log(`\n📊 Method 1: Log-Log Interpolation`);
console.log(`   Calculated Concentration: ${concLogLog.toFixed(6)}`);
console.log(`   Concentration × 3: ${(concLogLog * 3).toFixed(6)}`);

// Method 2: Linear interpolation
const concLinear = interpolateLinear(targetSignal, dataPoints);
console.log(`\n📊 Method 2: Linear Interpolation`);
console.log(`   Calculated Concentration: ${concLinear.toFixed(6)}`);
console.log(`   Concentration × 3: ${(concLinear * 3).toFixed(6)}`);

// Find which standards bracket the signal
console.log(`\n🔍 Signal ${targetSignal} falls between:`);
for (let i = 0; i < dataPoints.length - 1; i++) {
  if (targetSignal >= dataPoints[i].signal && targetSignal <= dataPoints[i + 1].signal) {
    console.log(`   Standard ${i + 1}: Conc ${dataPoints[i].concentration.toFixed(4)} → Signal ${dataPoints[i].signal.toFixed(2)}`);
    console.log(`   Standard ${i + 2}: Conc ${dataPoints[i + 1].concentration.toFixed(4)} → Signal ${dataPoints[i + 1].signal.toFixed(2)}`);
    
    // Manual calculation for verification
    const ratio = (targetSignal - dataPoints[i].signal) / (dataPoints[i + 1].signal - dataPoints[i].signal);
    const manualConc = dataPoints[i].concentration + ratio * (dataPoints[i + 1].concentration - dataPoints[i].concentration);
    console.log(`\n   Manual linear interpolation:`);
    console.log(`   Ratio: ${ratio.toFixed(4)}`);
    console.log(`   Concentration: ${manualConc.toFixed(6)}`);
    console.log(`   Concentration × 3: ${(manualConc * 3).toFixed(6)}`);
    break;
  }
}

console.log(`\n${'='.repeat(80)}`);
console.log('RECOMMENDED RESULT (Log-Log Interpolation - most accurate for sigmoidal curves):');
console.log('='.repeat(80));
console.log(`   Signal: ${targetSignal}`);
console.log(`   Concentration: ${concLogLog.toFixed(6)}`);
console.log(`   Concentration × 3: ${(concLogLog * 3).toFixed(6)}`);

