/**
 * Test the CORRECT inverse 4PL formula
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

const params = {
  top: 2730863.33378444,
  bottom: 107.957608734576,
  midpoint: 2262.91919423903,
  hillSlope: 1.00338440779492
};

/**
 * CORRECT forward 4PL for increasing curve
 */
function forward4PL(x, top, bottom, midpoint, hillSlope) {
  if (x <= 0) return bottom;
  return bottom + (top - bottom) / (1 + Math.pow(midpoint / x, hillSlope));
}

/**
 * CORRECT inverse 4PL
 * From: y = bottom + (top - bottom) / (1 + (EC50 / x)^hillSlope)
 * Solve for x:
 * y - bottom = (top - bottom) / (1 + (EC50 / x)^hillSlope)
 * 1 + (EC50 / x)^hillSlope = (top - bottom) / (y - bottom)
 * (EC50 / x)^hillSlope = (top - bottom) / (y - bottom) - 1
 * EC50 / x = ((top - bottom) / (y - bottom) - 1)^(1 / hillSlope)
 * x = EC50 / ((top - bottom) / (y - bottom) - 1)^(1 / hillSlope)
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

console.log('='.repeat(80));
console.log('VALIDATION WITH CORRECT INVERSE 4PL FORMULA');
console.log('='.repeat(80));
console.log('\nParameters:');
console.log(`  Top: ${params.top.toFixed(2)}`);
console.log(`  Bottom: ${params.bottom.toFixed(2)}`);
console.log(`  MidPoint (EC50): ${params.midpoint.toFixed(2)}`);
console.log(`  HillSlope: ${params.hillSlope.toFixed(6)}`);

console.log('\n' + '='.repeat(80));
console.log('FORWARD 4PL VALIDATION (to verify parameters)');
console.log('='.repeat(80));
console.log('\nConcentration | Actual Signal | Predicted Signal | Difference | % Diff | Status');
console.log('-'.repeat(80));

const forwardResults = [];
for (const std of standards) {
  const predicted = forward4PL(std.concentration, params.top, params.bottom, params.midpoint, params.hillSlope);
  const diff = Math.abs(predicted - std.signal);
  const diffPercent = (diff / std.signal) * 100;
  const status = diffPercent <= 0.5 ? 'PASS' : 'FAIL';
  
  forwardResults.push({
    concentration: std.concentration,
    signal: std.signal,
    predicted: predicted,
    diff: diff,
    diffPercent: diffPercent,
    status: status
  });
  
  const statusSymbol = status === 'PASS' ? '✓ PASS' : '✗ FAIL';
  console.log(
    `${std.concentration.toFixed(4).padEnd(13)} | ` +
    `${std.signal.toFixed(2).padEnd(14)} | ` +
    `${predicted.toFixed(2).padEnd(16)} | ` +
    `${diff.toFixed(2).padEnd(10)} | ` +
    `${diffPercent.toFixed(2).padEnd(6)}% | ` +
    statusSymbol
  );
}

const forwardPassCount = forwardResults.filter(r => r.status === 'PASS').length;
console.log(`\nForward validation: ${forwardPassCount}/${forwardResults.length} passed`);

console.log('\n' + '='.repeat(80));
console.log('INVERSE 4PL VALIDATION');
console.log('='.repeat(80));
console.log('\nConcentration | Signal    | Calculated Conc | Difference | % Diff | Status');
console.log('-'.repeat(80));

const inverseResults = [];
for (const std of standards) {
  const calculatedConc = inverse4PL(std.signal, params);
  
  if (calculatedConc === null) {
    console.log(`${std.concentration.toFixed(4).padEnd(13)} | ${std.signal.toFixed(2).padEnd(9)} | OUT OF RANGE    | -          | -      | -`);
    continue;
  }
  
  const diff = Math.abs(calculatedConc - std.concentration);
  const diffPercent = (diff / std.concentration) * 100;
  const status = diffPercent <= 0.5 ? 'PASS' : 'FAIL';
  
  inverseResults.push({
    concentration: std.concentration,
    signal: std.signal,
    calculated: calculatedConc,
    diff: diff,
    diffPercent: diffPercent,
    status: status
  });
  
  const statusSymbol = status === 'PASS' ? '✓ PASS' : '✗ FAIL';
  console.log(
    `${std.concentration.toFixed(4).padEnd(13)} | ` +
    `${std.signal.toFixed(2).padEnd(9)} | ` +
    `${calculatedConc.toFixed(4).padEnd(16)} | ` +
    `${diff.toFixed(4).padEnd(10)} | ` +
    `${diffPercent.toFixed(2).padEnd(6)}% | ` +
    statusSymbol
  );
}

const inversePassCount = inverseResults.filter(r => r.status === 'PASS').length;
console.log(`\nInverse validation: ${inversePassCount}/${inverseResults.length} passed`);

// Test with signal 10068
console.log('\n' + '='.repeat(80));
console.log('TEST: Signal 10,068');
console.log('='.repeat(80));
const testSignal = 10068;
const calculatedConc = inverse4PL(testSignal, params);
if (calculatedConc !== null) {
  console.log(`Signal: ${testSignal}`);
  console.log(`Calculated Concentration: ${calculatedConc.toFixed(4)}`);
  
  // Verify with forward calculation
  const verifySignal = forward4PL(calculatedConc, params.top, params.bottom, params.midpoint, params.hillSlope);
  console.log(`Verification (forward calc): ${verifySignal.toFixed(2)} (expected ${testSignal})`);
  console.log(`Difference: ${Math.abs(verifySignal - testSignal).toFixed(2)} (${(Math.abs(verifySignal - testSignal) / testSignal * 100).toFixed(2)}%)`);
} else {
  console.log(`Signal ${testSignal} is OUT OF RANGE`);
}

console.log('\n' + '='.repeat(80));
console.log('SUMMARY');
console.log('='.repeat(80));
console.log(`Forward validation: ${forwardPassCount}/${forwardResults.length} passed`);
console.log(`Inverse validation: ${inversePassCount}/${inverseResults.length} passed`);

if (inversePassCount === inverseResults.length) {
  console.log('\n✓ All inverse calculations within 0.5% tolerance!');
} else {
  console.log(`\n⚠️  ${inverseResults.length - inversePassCount} calculations exceed 0.5% tolerance`);
}

