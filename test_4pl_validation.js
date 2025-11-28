/**
 * Validation script to test inverse 4PL calculation against standards
 */

// E3_P6 GM-CSF Standards and Parameters
const standards = [
  { concentration: 0.0, signals: [97.0, 126.0], mean: 111.5 },
  { concentration: 1.1279296875, signals: [1565.0, 1539.0], mean: 1552.0 },
  { concentration: 4.51171875, signals: [5608.0, 5499.0], mean: 5553.5 },
  { concentration: 18.046875, signals: [21685.0, 21238.0], mean: 21461.5 },
  { concentration: 72.1875, signals: [78210.0, 75143.0], mean: 76676.5 },
  { concentration: 288.75, signals: [268530.0, 270661.0], mean: 269595.5 },
  { concentration: 1155.0, signals: [1068129.0, 1132297.0], mean: 1100213.0 },
  { concentration: 4620.0, signals: [1753481.0, 1805855.0], mean: 1779668.0 }
];

const params = {
  top: 2730863.33378444,
  bottom: 107.957608734576,
  midpoint: 2262.91919423903,
  hillSlope: 1.00338440779492
};

/**
 * Calculate concentration from signal using inverse 4PL
 */
function calculateConcentrationFromSignal(signal, params) {
  const { top, bottom, midpoint, hillSlope } = params;
  
  // Validate
  if (!Number.isFinite(top) || !Number.isFinite(bottom) || 
      !Number.isFinite(midpoint) || !Number.isFinite(hillSlope) ||
      !Number.isFinite(signal)) {
    return null;
  }
  
  // Check if signal is within valid range
  if (signal <= bottom || signal >= top) {
    return null;
  }
  
  // Inverse 4PL formula:
  // x = EC50 * ( ( (top - bottom) / (y - bottom) - 1 ) ** (1 / hillSlope) )
  try {
    const numerator = (top - bottom) / (signal - bottom) - 1;
    if (numerator <= 0) {
      return null;
    }
    
    const exponent = 1 / hillSlope;
    const ratio = Math.pow(numerator, exponent);
    const concentration = midpoint * ratio;
    
    return concentration;
  } catch (error) {
    console.error("Error calculating concentration:", error);
    return null;
  }
}

/**
 * Forward 4PL to verify parameters
 */
function forward4PL(concentration, params) {
  const { top, bottom, midpoint, hillSlope } = params;
  return bottom + (top - bottom) / (1 + Math.pow(concentration / midpoint, hillSlope));
}

console.log('='.repeat(80));
console.log('VALIDATION OF INVERSE 4PL ALGORITHM FOR E3_P6 GM-CSF');
console.log('='.repeat(80));
console.log('\nParameters:');
console.log(`  Top: ${params.top.toFixed(2)}`);
console.log(`  Bottom: ${params.bottom.toFixed(2)}`);
console.log(`  MidPoint (EC50): ${params.midpoint.toFixed(2)}`);
console.log(`  HillSlope: ${params.hillSlope.toFixed(6)}`);
console.log('\n' + '='.repeat(80));
console.log('STANDARD VALIDATION RESULTS');
console.log('='.repeat(80));

const results = [];

for (const std of standards) {
  if (std.concentration === 0) {
    // Skip zero concentration
    continue;
  }
  
  // Test with mean signal
  const calculatedConc = calculateConcentrationFromSignal(std.mean, params);
  
  if (calculatedConc === null) {
    console.log(`\nConcentration ${std.concentration.toFixed(4)}: Signal ${std.mean.toFixed(2)} → OUT OF RANGE`);
    results.push({
      actual: std.concentration,
      signal: std.mean,
      calculated: null,
      diff: null,
      diffPercent: null,
      status: 'OUT_OF_RANGE'
    });
    continue;
  }
  
  const diff = Math.abs(calculatedConc - std.concentration);
  const diffPercent = (diff / std.concentration) * 100;
  
  // Also verify forward calculation
  const forwardSignal = forward4PL(std.concentration, params);
  const forwardDiff = Math.abs(forwardSignal - std.mean);
  const forwardDiffPercent = (forwardDiff / std.mean) * 100;
  
  results.push({
    actual: std.concentration,
    signal: std.mean,
    calculated: calculatedConc,
    diff: diff,
    diffPercent: diffPercent,
    forwardSignal: forwardSignal,
    forwardDiffPercent: forwardDiffPercent,
    status: diffPercent <= 0.5 ? 'PASS' : 'FAIL'
  });
  
  console.log(`\nConcentration: ${std.concentration.toFixed(4)}`);
  console.log(`  Signal: ${std.mean.toFixed(2)}`);
  console.log(`  Calculated Conc: ${calculatedConc.toFixed(4)}`);
  console.log(`  Difference: ${diff.toFixed(4)} (${diffPercent.toFixed(2)}%)`);
  console.log(`  Forward Check - Expected Signal: ${forwardSignal.toFixed(2)}, Actual: ${std.mean.toFixed(2)}, Diff: ${forwardDiffPercent.toFixed(2)}%`);
  console.log(`  Status: ${diffPercent <= 0.5 ? '✓ PASS' : '✗ FAIL'}`);
}

console.log('\n' + '='.repeat(80));
console.log('SUMMARY TABLE');
console.log('='.repeat(80));
console.log('\nActual Conc | Signal    | Calculated Conc | Difference | % Diff | Status');
console.log('-'.repeat(80));

results.forEach(r => {
  if (r.status === 'OUT_OF_RANGE') {
    console.log(`${r.actual.toFixed(4).padEnd(11)} | ${r.signal.toFixed(2).padEnd(9)} | OUT OF RANGE    | -          | -      | -`);
  } else {
    const status = r.status === 'PASS' ? '✓ PASS' : '✗ FAIL';
    console.log(
      `${r.actual.toFixed(4).padEnd(11)} | ` +
      `${r.signal.toFixed(2).padEnd(9)} | ` +
      `${r.calculated.toFixed(4).padEnd(16)} | ` +
      `${r.diff.toFixed(4).padEnd(10)} | ` +
      `${r.diffPercent.toFixed(2).padEnd(6)}% | ` +
      status
    );
  }
});

const passCount = results.filter(r => r.status === 'PASS').length;
const failCount = results.filter(r => r.status === 'FAIL').length;
const total = results.length;

console.log('\n' + '='.repeat(80));
console.log(`RESULTS: ${passCount}/${total} passed (${failCount} failed)`);
console.log('='.repeat(80));

if (failCount > 0) {
  console.log('\n⚠️  Some calculations differ by more than 0.5%');
  console.log('   The algorithm or parameters may need adjustment.');
} else {
  console.log('\n✓ All calculations within 0.5% tolerance');
}

