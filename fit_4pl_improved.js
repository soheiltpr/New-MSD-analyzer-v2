/**
 * Improved 4PL fitting using better algorithm
 */

const standards = [
  { concentration: 3.515625, signal: 1807.0 },
  { concentration: 14.0625, signal: 5877.0 },
  { concentration: 56.25, signal: 20904.0 },
  { concentration: 225.0, signal: 72886.0 },
  { concentration: 900.0, signal: 288786.5 },
  { concentration: 3600.0, signal: 867836.5 },
  { concentration: 14400.0, signal: 1042712.0 }
];

function forward4PL(x, top, bottom, midpoint, hillSlope) {
  if (x <= 0) return bottom;
  return bottom + (top - bottom) / (1 + Math.pow(midpoint / x, hillSlope));
}

function calculateSSR(params, dataPoints) {
  const { top, bottom, midpoint, hillSlope } = params;
  let ssr = 0;
  for (const point of dataPoints) {
    const predicted = forward4PL(point.concentration, top, bottom, midpoint, hillSlope);
    const residual = point.signal - predicted;
    ssr += residual * residual;
  }
  return ssr;
}

// Better initial estimates
const minSignal = Math.min(...standards.map(s => s.signal));
const maxSignal = Math.max(...standards.map(s => s.signal));
const bottom = minSignal * 0.9;
const top = maxSignal * 1.1;

// Find EC50 more carefully
const midSignal = (bottom + top) / 2;
let midpoint = standards[2].concentration; // Start with middle standard

// Try multiple starting points and pick best
let bestParams = null;
let bestSSR = Infinity;

const hillSlopeCandidates = [0.8, 0.9, 1.0, 1.1, 1.2];
const midpointCandidates = standards.map(s => s.concentration);

for (const mid of midpointCandidates) {
  for (const slope of hillSlopeCandidates) {
    const testParams = {
      top: top,
      bottom: bottom,
      midpoint: mid,
      hillSlope: slope
    };
    
    const ssr = calculateSSR(testParams, standards);
    if (ssr < bestSSR) {
      bestSSR = ssr;
      bestParams = testParams;
    }
  }
}

console.log('='.repeat(80));
console.log('IMPROVED 4PL FITTING - IFN-γ E3_P6');
console.log('='.repeat(80));

console.log('\nBest initial parameters found:');
console.log(`Top: ${bestParams.top.toFixed(2)}`);
console.log(`Bottom: ${bestParams.bottom.toFixed(2)}`);
console.log(`MidPoint: ${bestParams.midpoint.toFixed(2)}`);
console.log(`HillSlope: ${bestParams.hillSlope.toFixed(2)}`);
console.log(`Initial SSR: ${bestSSR.toFixed(2)}`);

// Refine with gradient descent
let params = { ...bestParams };
let learningRate = 0.001;
const maxIterations = 10000;

for (let iter = 0; iter < maxIterations; iter++) {
  const ssr = calculateSSR(params, standards);
  
  // Calculate gradients
  const eps = 1e-5;
  const gradients = {
    top: 0,
    bottom: 0,
    midpoint: 0,
    hillSlope: 0
  };
  
  for (const std of standards) {
    const pred = forward4PL(std.concentration, params.top, params.bottom, params.midpoint, params.hillSlope);
    const residual = std.signal - pred;
    
    gradients.top += residual * (forward4PL(std.concentration, params.top + eps, params.bottom, params.midpoint, params.hillSlope) - pred) / eps;
    gradients.bottom += residual * (forward4PL(std.concentration, params.top, params.bottom + eps, params.midpoint, params.hillSlope) - pred) / eps;
    gradients.midpoint += residual * (forward4PL(std.concentration, params.top, params.bottom, params.midpoint + eps, params.hillSlope) - pred) / eps;
    gradients.hillSlope += residual * (forward4PL(std.concentration, params.top, params.bottom, params.midpoint, params.hillSlope + eps) - pred) / eps;
  }
  
  // Update
  const newParams = {
    top: params.top - learningRate * gradients.top,
    bottom: params.bottom - learningRate * gradients.bottom,
    midpoint: params.midpoint - learningRate * gradients.midpoint,
    hillSlope: params.hillSlope - learningRate * gradients.hillSlope
  };
  
  // Constraints
  newParams.top = Math.max(newParams.top, maxSignal * 1.05);
  newParams.bottom = Math.max(0, Math.min(newParams.bottom, minSignal * 0.95));
  newParams.midpoint = Math.max(0.1, newParams.midpoint);
  newParams.hillSlope = Math.max(0.1, Math.min(5, newParams.hillSlope));
  
  const newSSR = calculateSSR(newParams, standards);
  
  if (newSSR < ssr) {
    params = newParams;
    learningRate = Math.min(learningRate * 1.1, 0.01);
  } else {
    learningRate *= 0.5;
    if (learningRate < 1e-8) break;
  }
  
  if (iter % 2000 === 0 && iter > 0) {
    console.log(`Iteration ${iter}: SSR = ${ssr.toFixed(2)}`);
  }
}

console.log('\n' + '='.repeat(80));
console.log('FITTED 4PL PARAMETERS');
console.log('='.repeat(80));
console.log(`Top: ${params.top.toFixed(6)}`);
console.log(`Bottom: ${params.bottom.toFixed(6)}`);
console.log(`MidPoint (EC50): ${params.midpoint.toFixed(6)}`);
console.log(`HillSlope: ${params.hillSlope.toFixed(6)}`);

// Validate
console.log('\n' + '='.repeat(80));
console.log('VALIDATION');
console.log('='.repeat(80));
console.log('\nConcentration | Actual Signal | Predicted Signal | Difference | % Diff | Status');
console.log('-'.repeat(80));

let passCount = 0;
for (const std of standards) {
  const predicted = forward4PL(std.concentration, params.top, params.bottom, params.midpoint, params.hillSlope);
  const diff = Math.abs(predicted - std.signal);
  const diffPercent = (diff / std.signal) * 100;
  const status = diffPercent <= 0.5 ? 'PASS' : 'FAIL';
  
  if (status === 'PASS') passCount++;
  
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

console.log(`\nFit validation: ${passCount}/${standards.length} passed`);

// Calculate for signal 14446
function inverse4PL(signal, params) {
  const { top, bottom, midpoint, hillSlope } = params;
  if (signal <= bottom || signal >= top) return null;
  const numerator = (top - bottom) / (signal - bottom) - 1;
  if (numerator <= 0) return null;
  const ratio = Math.pow(numerator, 1 / hillSlope);
  return midpoint / ratio;
}

console.log('\n' + '='.repeat(80));
console.log('CALCULATION FOR SIGNAL = 14,446');
console.log('='.repeat(80));

const targetSignal = 14446;
const calculatedConc = inverse4PL(targetSignal, params);

if (calculatedConc === null) {
  console.log(`\n❌ Signal ${targetSignal} is OUT OF RANGE`);
} else {
  console.log(`\n✅ Calculated Concentration: ${calculatedConc.toFixed(6)}`);
  console.log(`\n📊 Concentration × 3 = ${(calculatedConc * 3).toFixed(6)}`);
  
  const verifySignal = forward4PL(calculatedConc, params.top, params.bottom, params.midpoint, params.hillSlope);
  console.log(`\n🔍 Verification:`);
  console.log(`   Forward calc: ${calculatedConc.toFixed(6)} → Signal: ${verifySignal.toFixed(2)} (expected ${targetSignal})`);
  console.log(`   Difference: ${Math.abs(verifySignal - targetSignal).toFixed(2)} (${(Math.abs(verifySignal - targetSignal) / targetSignal * 100).toFixed(2)}%)`);
}

