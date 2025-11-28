/**
 * Fit 4PL parameters from IFN-γ E3_P6 standards, then calculate concentration for signal 14446
 */

// E3_P6 IFN-γ Standards
const standards = [
  { concentration: 3.515625, signal: 1807.0 },
  { concentration: 14.0625, signal: 5877.0 },
  { concentration: 56.25, signal: 20904.0 },
  { concentration: 225.0, signal: 72886.0 },
  { concentration: 900.0, signal: 288786.5 },
  { concentration: 3600.0, signal: 867836.5 },
  { concentration: 14400.0, signal: 1042712.0 }
];

/**
 * Forward 4PL for increasing curve
 * y = bottom + (top - bottom) / (1 + (EC50 / x)^hillSlope)
 */
function forward4PL(x, top, bottom, midpoint, hillSlope) {
  if (x <= 0) return bottom;
  return bottom + (top - bottom) / (1 + Math.pow(midpoint / x, hillSlope));
}

/**
 * Calculate weighted sum of squared residuals
 */
function calculateWSSR(params, dataPoints) {
  const { top, bottom, midpoint, hillSlope } = params;
  let wssr = 0;
  for (const point of dataPoints) {
    const predicted = forward4PL(point.concentration, top, bottom, midpoint, hillSlope);
    const residual = point.signal - predicted;
    // Weight by 1/y^2
    const weight = 1 / (point.signal * point.signal);
    wssr += weight * residual * residual;
  }
  return wssr;
}

/**
 * Estimate initial parameters from data
 */
function estimateInitialParams(dataPoints) {
  const sorted = [...dataPoints].sort((a, b) => a.concentration - b.concentration);
  
  const bottom = Math.max(0, sorted[0].signal * 0.8);
  const top = sorted[sorted.length - 1].signal * 1.1;
  
  // Find EC50: concentration where signal is halfway
  const midSignal = (bottom + top) / 2;
  let midpoint = sorted[0].concentration;
  
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].signal <= midSignal && sorted[i + 1].signal >= midSignal) {
      const ratio = (midSignal - sorted[i].signal) / (sorted[i + 1].signal - sorted[i].signal);
      midpoint = sorted[i].concentration + ratio * (sorted[i + 1].concentration - sorted[i].concentration);
      break;
    }
  }
  
  // Estimate hill slope from log-log plot
  const logX = sorted.map(p => Math.log(p.concentration));
  const logY = sorted.map(p => Math.log(Math.max(p.signal - bottom, 1)));
  const n = sorted.length;
  
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += logX[i];
    sumY += logY[i];
    sumXY += logX[i] * logY[i];
    sumX2 += logX[i] * logX[i];
  }
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const hillSlope = Math.abs(slope);
  
  return {
    top: top,
    bottom: bottom,
    midpoint: Math.max(0.1, midpoint),
    hillSlope: Math.max(0.5, Math.min(5, hillSlope))
  };
}

/**
 * Fit 4PL using gradient descent
 */
function fit4PL(dataPoints, maxIterations = 5000) {
  let params = estimateInitialParams(dataPoints);
  
  console.log('Initial parameters:', params);
  
  let bestWSSR = calculateWSSR(params, dataPoints);
  let bestParams = { ...params };
  let learningRate = 0.01;
  const minLearningRate = 1e-8;
  
  for (let iter = 0; iter < maxIterations; iter++) {
    const wssr = calculateWSSR(params, dataPoints);
    
    if (wssr < bestWSSR) {
      bestWSSR = wssr;
      bestParams = { ...params };
    }
    
    // Calculate gradients numerically
    const eps = 1e-6;
    const gradients = { top: 0, bottom: 0, midpoint: 0, hillSlope: 0 };
    
    for (const point of dataPoints) {
      const predicted = forward4PL(point.concentration, params.top, params.bottom, params.midpoint, params.hillSlope);
      const residual = point.signal - predicted;
      const weight = 1 / (point.signal * point.signal);
      
      const dTop = (forward4PL(point.concentration, params.top + eps, params.bottom, params.midpoint, params.hillSlope) - predicted) / eps;
      const dBottom = (forward4PL(point.concentration, params.top, params.bottom + eps, params.midpoint, params.hillSlope) - predicted) / eps;
      const dMidpoint = (forward4PL(point.concentration, params.top, params.bottom, params.midpoint + eps, params.hillSlope) - predicted) / eps;
      const dHillSlope = (forward4PL(point.concentration, params.top, params.bottom, params.midpoint, params.hillSlope + eps) - predicted) / eps;
      
      gradients.top += weight * residual * dTop;
      gradients.bottom += weight * residual * dBottom;
      gradients.midpoint += weight * residual * dMidpoint;
      gradients.hillSlope += weight * residual * dHillSlope;
    }
    
    // Update parameters
    const newParams = {
      top: params.top - learningRate * gradients.top,
      bottom: params.bottom - learningRate * gradients.bottom,
      midpoint: params.midpoint - learningRate * gradients.midpoint,
      hillSlope: params.hillSlope - learningRate * gradients.hillSlope
    };
    
    // Apply constraints
    newParams.top = Math.max(newParams.top, Math.max(...dataPoints.map(p => p.signal)) * 1.05);
    newParams.bottom = Math.max(0, Math.min(newParams.bottom, Math.min(...dataPoints.map(p => p.signal)) * 0.95));
    newParams.midpoint = Math.max(0.001, newParams.midpoint);
    newParams.hillSlope = Math.max(0.1, Math.min(10, newParams.hillSlope));
    
    const newWSSR = calculateWSSR(newParams, dataPoints);
    
    if (newWSSR < wssr) {
      params = newParams;
      learningRate *= 1.1;
    } else {
      learningRate *= 0.5;
      if (learningRate < minLearningRate) {
        break;
      }
    }
    
    if (iter % 1000 === 0 && iter > 0) {
      console.log(`Iteration ${iter}: WSSR = ${wssr.toFixed(2)}`);
    }
  }
  
  return bestParams;
}

/**
 * Inverse 4PL
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
console.log('FITTING 4PL FROM STANDARDS - IFN-γ E3_P6');
console.log('='.repeat(80));

console.log('\nStandards Data:');
console.log('Concentration | Signal');
console.log('-'.repeat(30));
standards.forEach(s => {
  console.log(`${s.concentration.toFixed(4).padEnd(13)} | ${s.signal.toFixed(2)}`);
});

console.log('\nFitting 4PL parameters...');
const fittedParams = fit4PL(standards);

console.log('\n' + '='.repeat(80));
console.log('FITTED 4PL PARAMETERS');
console.log('='.repeat(80));
console.log(`Top: ${fittedParams.top.toFixed(6)}`);
console.log(`Bottom: ${fittedParams.bottom.toFixed(6)}`);
console.log(`MidPoint (EC50): ${fittedParams.midpoint.toFixed(6)}`);
console.log(`HillSlope: ${fittedParams.hillSlope.toFixed(6)}`);

// Validate fit
console.log('\n' + '='.repeat(80));
console.log('VALIDATION OF FITTED PARAMETERS');
console.log('='.repeat(80));
console.log('\nConcentration | Actual Signal | Predicted Signal | Difference | % Diff | Status');
console.log('-'.repeat(80));

let passCount = 0;
for (const std of standards) {
  const predicted = forward4PL(std.concentration, fittedParams.top, fittedParams.bottom, fittedParams.midpoint, fittedParams.hillSlope);
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

// Calculate concentration for signal 14446
console.log('\n' + '='.repeat(80));
console.log('CALCULATION FOR SIGNAL = 14,446');
console.log('='.repeat(80));

const targetSignal = 14446;
const calculatedConc = inverse4PL(targetSignal, fittedParams);

if (calculatedConc === null) {
  console.log(`\n❌ Signal ${targetSignal} is OUT OF RANGE`);
  console.log(`   Signal must be between ${fittedParams.bottom.toFixed(2)} and ${fittedParams.top.toFixed(2)}`);
} else {
  console.log(`\n✅ Calculated Concentration: ${calculatedConc.toFixed(6)}`);
  console.log(`\n📊 Concentration × 3 = ${(calculatedConc * 3).toFixed(6)}`);
  
  // Verify
  const verifySignal = forward4PL(calculatedConc, fittedParams.top, fittedParams.bottom, fittedParams.midpoint, fittedParams.hillSlope);
  console.log(`\n🔍 Verification:`);
  console.log(`   Forward calc: ${calculatedConc.toFixed(6)} → Signal: ${verifySignal.toFixed(2)} (expected ${targetSignal})`);
  console.log(`   Difference: ${Math.abs(verifySignal - targetSignal).toFixed(2)} (${(Math.abs(verifySignal - targetSignal) / targetSignal * 100).toFixed(2)}%)`);
}

