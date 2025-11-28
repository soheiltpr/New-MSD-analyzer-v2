/**
 * Final validation table comparing calculated vs actual concentrations
 */

const standards = [
  { concentration: 1.1279296875, signal: 1552.0 },
  { concentration: 4.51171875, signal: 5553.5 },
  { concentration: 18.046875, signal: 21461.5 },
  { concentration: 72.1875, signal: 76676.5 },
  { concentration: 288.75, signal: 269595.5 },
  { concentration: 1155.0, signal: 1100213.0 },
  { concentration: 4620.0, signal: 1779668.0 }
];

// Current parameters from training data
const currentParams = {
  top: 2730863.33378444,
  bottom: 107.957608734576,
  midpoint: 2262.91919423903,
  hillSlope: 1.00338440779492
};

/**
 * CORRECT inverse 4PL formula
 */
function inverse4PL(signal, params) {
  const { top, bottom, midpoint, hillSlope } = params;
  
  if (signal <= bottom || signal >= top) {
    return null;
  }
  
  const numerator = (top - bottom) / (signal - bottom) - 1;
  if (numerator <= 0) {
    return null;
  }
  
  const ratio = Math.pow(numerator, 1 / hillSlope);
  return midpoint / ratio;
}

console.log('='.repeat(100));
console.log('VALIDATION TABLE: Calculated vs Actual Concentrations (E3_P6 GM-CSF)');
console.log('='.repeat(100));
console.log('\nCurrent Parameters:');
console.log(`  Top: ${currentParams.top.toFixed(6)}`);
console.log(`  Bottom: ${currentParams.bottom.toFixed(6)}`);
console.log(`  MidPoint (EC50): ${currentParams.midpoint.toFixed(6)}`);
console.log(`  HillSlope: ${currentParams.hillSlope.toFixed(6)}`);

console.log('\n' + '='.repeat(100));
console.log('COMPARISON TABLE');
console.log('='.repeat(100));
console.log('\nActual Conc | Signal      | Calculated Conc | Difference  | % Difference | Status');
console.log('-'.repeat(100));

const results = [];
for (const std of standards) {
  const calculatedConc = inverse4PL(std.signal, currentParams);
  
  if (calculatedConc === null) {
    console.log(`${std.concentration.toFixed(4).padEnd(11)} | ${std.signal.toFixed(2).padEnd(12)} | OUT OF RANGE    | -           | -            | -`);
    results.push({
      actual: std.concentration,
      signal: std.signal,
      calculated: null,
      diff: null,
      diffPercent: null,
      status: 'OUT_OF_RANGE'
    });
    continue;
  }
  
  const diff = Math.abs(calculatedConc - std.concentration);
  const diffPercent = (diff / std.concentration) * 100;
  const status = diffPercent <= 0.5 ? 'PASS' : 'FAIL';
  
  results.push({
    actual: std.concentration,
    signal: std.signal,
    calculated: calculatedConc,
    diff: diff,
    diffPercent: diffPercent,
    status: status
  });
  
  const statusSymbol = status === 'PASS' ? '✓ PASS' : '✗ FAIL';
  console.log(
    `${std.concentration.toFixed(4).padEnd(11)} | ` +
    `${std.signal.toFixed(2).padEnd(12)} | ` +
    `${calculatedConc.toFixed(4).padEnd(16)} | ` +
    `${diff.toFixed(4).padEnd(12)} | ` +
    `${diffPercent.toFixed(2).padEnd(13)}% | ` +
    statusSymbol
  );
}

const passCount = results.filter(r => r.status === 'PASS').length;
const failCount = results.filter(r => r.status === 'FAIL').length;
const total = results.length;

console.log('\n' + '='.repeat(100));
console.log(`SUMMARY: ${passCount}/${total} passed (${failCount} failed)`);
console.log('='.repeat(100));

if (failCount > 0) {
  console.log('\n⚠️  Some calculations differ by more than 0.5%');
  console.log('   The parameters need to be refitted to improve accuracy.');
  
  // Calculate average error
  const validResults = results.filter(r => r.calculated !== null);
  const avgError = validResults.reduce((sum, r) => sum + r.diffPercent, 0) / validResults.length;
  const maxError = Math.max(...validResults.map(r => r.diffPercent));
  const minError = Math.min(...validResults.map(r => r.diffPercent));
  
  console.log(`\nError Statistics:`);
  console.log(`  Average: ${avgError.toFixed(2)}%`);
  console.log(`  Maximum: ${maxError.toFixed(2)}%`);
  console.log(`  Minimum: ${minError.toFixed(2)}%`);
} else {
  console.log('\n✓ All calculations within 0.5% tolerance!');
}

// Test with signal 10068
console.log('\n' + '='.repeat(100));
console.log('TEST CASE: Signal = 10,068');
console.log('='.repeat(100));
const testSignal = 10068;
const testCalculated = inverse4PL(testSignal, currentParams);
if (testCalculated !== null) {
  console.log(`Signal: ${testSignal}`);
  console.log(`Calculated Concentration: ${testCalculated.toFixed(4)}`);
  console.log(`\nThis result makes sense when compared to the standards:`);
  console.log(`  - Concentration 4.512 → Signal ~5,553`);
  console.log(`  - Concentration 18.047 → Signal ~21,461`);
  console.log(`  - Signal 10,068 falls between these, so concentration ~8.4 is reasonable`);
} else {
  console.log(`Signal ${testSignal} is OUT OF RANGE`);
}

