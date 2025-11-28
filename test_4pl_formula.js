/**
 * Test different 4PL formula forms to find the correct one
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

// Test parameters from training data
const params = {
  top: 2730863.33378444,
  bottom: 107.957608734576,
  midpoint: 2262.91919423903,
  hillSlope: 1.00338440779492
};

console.log('Testing different 4PL formula forms...\n');
console.log('Parameters:', params);
console.log('\n' + '='.repeat(80));

// Formula 1: y = bottom + (top - bottom) / (1 + (x / EC50)^hillSlope)
function fourPL1(x, top, bottom, midpoint, hillSlope) {
  return bottom + (top - bottom) / (1 + Math.pow(x / midpoint, hillSlope));
}

// Formula 2: y = bottom + (top - bottom) / (1 + (EC50 / x)^hillSlope)
function fourPL2(x, top, bottom, midpoint, hillSlope) {
  if (x <= 0) return bottom;
  return bottom + (top - bottom) / (1 + Math.pow(midpoint / x, hillSlope));
}

// Formula 3: y = bottom + (top - bottom) / (1 + exp(-hillSlope * log(x / EC50)))
function fourPL3(x, top, bottom, midpoint, hillSlope) {
  if (x <= 0) return bottom;
  return bottom + (top - bottom) / (1 + Math.exp(-hillSlope * Math.log(x / midpoint)));
}

console.log('\nFormula 1: y = bottom + (top - bottom) / (1 + (x / EC50)^hillSlope)');
console.log('Concentration | Actual Signal | Predicted | Difference | % Diff');
console.log('-'.repeat(70));
let sumDiff1 = 0;
for (const std of standards) {
  const pred = fourPL1(std.concentration, params.top, params.bottom, params.midpoint, params.hillSlope);
  const diff = Math.abs(pred - std.signal);
  const pct = (diff / std.signal) * 100;
  sumDiff1 += pct;
  console.log(`${std.concentration.toFixed(4).padEnd(13)} | ${std.signal.toFixed(2).padEnd(12)} | ${pred.toFixed(2).padEnd(9)} | ${diff.toFixed(2).padEnd(10)} | ${pct.toFixed(2)}%`);
}
console.log(`Average difference: ${(sumDiff1 / standards.length).toFixed(2)}%`);

console.log('\nFormula 2: y = bottom + (top - bottom) / (1 + (EC50 / x)^hillSlope)');
console.log('Concentration | Actual Signal | Predicted | Difference | % Diff');
console.log('-'.repeat(70));
let sumDiff2 = 0;
for (const std of standards) {
  const pred = fourPL2(std.concentration, params.top, params.bottom, params.midpoint, params.hillSlope);
  const diff = Math.abs(pred - std.signal);
  const pct = (diff / std.signal) * 100;
  sumDiff2 += pct;
  console.log(`${std.concentration.toFixed(4).padEnd(13)} | ${std.signal.toFixed(2).padEnd(12)} | ${pred.toFixed(2).padEnd(9)} | ${diff.toFixed(2).padEnd(10)} | ${pct.toFixed(2)}%`);
}
console.log(`Average difference: ${(sumDiff2 / standards.length).toFixed(2)}%`);

console.log('\nFormula 3: y = bottom + (top - bottom) / (1 + exp(-hillSlope * log(x / EC50)))');
console.log('Concentration | Actual Signal | Predicted | Difference | % Diff');
console.log('-'.repeat(70));
let sumDiff3 = 0;
for (const std of standards) {
  const pred = fourPL3(std.concentration, params.top, params.bottom, params.midpoint, params.hillSlope);
  const diff = Math.abs(pred - std.signal);
  const pct = (diff / std.signal) * 100;
  sumDiff3 += pct;
  console.log(`${std.concentration.toFixed(4).padEnd(13)} | ${std.signal.toFixed(2).padEnd(12)} | ${pred.toFixed(2).padEnd(9)} | ${diff.toFixed(2).padEnd(10)} | ${pct.toFixed(2)}%`);
}
console.log(`Average difference: ${(sumDiff3 / standards.length).toFixed(2)}%`);

// Now let's try to manually fit better parameters using Formula 2 (which seems more likely for increasing curves)
console.log('\n' + '='.repeat(80));
console.log('Attempting manual parameter adjustment for Formula 2...');
console.log('='.repeat(80));

// Try different parameter sets
const testParams = [
  { top: 2000000, bottom: 100, midpoint: 50, hillSlope: 1.0 },
  { top: 2000000, bottom: 100, midpoint: 100, hillSlope: 1.0 },
  { top: 2000000, bottom: 100, midpoint: 200, hillSlope: 1.0 },
  { top: 1800000, bottom: 111.5, midpoint: 100, hillSlope: 1.0 },
  { top: 1800000, bottom: 111.5, midpoint: 50, hillSlope: 1.0 },
];

for (let i = 0; i < testParams.length; i++) {
  const test = testParams[i];
  console.log(`\nTest ${i + 1}: Top=${test.top}, Bottom=${test.bottom}, Mid=${test.midpoint}, Slope=${test.hillSlope}`);
  let totalDiff = 0;
  for (const std of standards) {
    const pred = fourPL2(std.concentration, test.top, test.bottom, test.midpoint, test.hillSlope);
    const diff = Math.abs(pred - std.signal);
    const pct = (diff / std.signal) * 100;
    totalDiff += pct;
  }
  console.log(`Average difference: ${(totalDiff / standards.length).toFixed(2)}%`);
}

