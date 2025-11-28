/**
 * Robust 4PL fitting using better initial estimates and weighted least squares
 */

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

const dataPoints = standards.filter(s => s.concentration > 0).map(s => ({
  x: s.concentration,
  y: s.mean
}));

/**
 * Forward 4PL
 */
function fourPL(x, top, bottom, midpoint, hillSlope) {
  if (x <= 0) return bottom;
  return bottom + (top - bottom) / (1 + Math.pow(x / midpoint, hillSlope));
}

/**
 * Better initial parameter estimation
 */
function estimateInitialParams(dataPoints) {
  const sorted = [...dataPoints].sort((a, b) => a.x - b.x);
  
  // Bottom: minimum signal (or slightly below)
  const bottom = Math.max(0, sorted[0].y * 0.8);
  
  // Top: maximum signal (or slightly above)
  const top = sorted[sorted.length - 1].y * 1.1;
  
  // Find EC50: concentration where signal is halfway between bottom and top
  const midSignal = (bottom + top) / 2;
  let midpoint = sorted[0].x;
  
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].y <= midSignal && sorted[i + 1].y >= midSignal) {
      // Linear interpolation
      const ratio = (midSignal - sorted[i].y) / (sorted[i + 1].y - sorted[i].y);
      midpoint = sorted[i].x + ratio * (sorted[i + 1].x - sorted[i].x);
      break;
    }
  }
  
  // Hill slope: estimate from slope of log-log plot
  const logX = sorted.map(p => Math.log(p.x));
  const logY = sorted.map(p => Math.log(Math.max(p.y - bottom, 1)));
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
 * Weighted sum of squared residuals
 */
function calculateWSSR(params, dataPoints) {
  const { top, bottom, midpoint, hillSlope } = params;
  let wssr = 0;
  for (const point of dataPoints) {
    const predicted = fourPL(point.x, top, bottom, midpoint, hillSlope);
    const residual = point.y - predicted;
    // Weight by 1/y^2 (as specified in training data)
    const weight = 1 / (point.y * point.y);
    wssr += weight * residual * residual;
  }
  return wssr;
}

/**
 * Simplified gradient descent with adaptive step size
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
    const gradients = {
      top: 0,
      bottom: 0,
      midpoint: 0,
      hillSlope: 0
    };
    
    for (const point of dataPoints) {
      const predicted = fourPL(point.x, params.top, params.bottom, params.midpoint, params.hillSlope);
      const residual = point.y - predicted;
      const weight = 1 / (point.y * point.y);
      
      // Numerical derivatives
      const dTop = (fourPL(point.x, params.top + eps, params.bottom, params.midpoint, params.hillSlope) - predicted) / eps;
      const dBottom = (fourPL(point.x, params.top, params.bottom + eps, params.midpoint, params.hillSlope) - predicted) / eps;
      const dMidpoint = (fourPL(point.x, params.top, params.bottom, params.midpoint + eps, params.hillSlope) - predicted) / eps;
      const dHillSlope = (fourPL(point.x, params.top, params.bottom, params.midpoint, params.hillSlope + eps) - predicted) / eps;
      
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
    newParams.top = Math.max(newParams.top, Math.max(...dataPoints.map(p => p.y)) * 1.05);
    newParams.bottom = Math.max(0, Math.min(newParams.bottom, Math.min(...dataPoints.map(p => p.y)) * 0.95));
    newParams.midpoint = Math.max(0.001, newParams.midpoint);
    newParams.hillSlope = Math.max(0.1, Math.min(10, newParams.hillSlope));
    
    const newWSSR = calculateWSSR(newParams, dataPoints);
    
    if (newWSSR < wssr) {
      params = newParams;
      learningRate *= 1.1; // Increase learning rate if improving
    } else {
      learningRate *= 0.5; // Decrease learning rate if not improving
      if (learningRate < minLearningRate) {
        break;
      }
    }
    
    if (iter % 500 === 0) {
      console.log(`Iteration ${iter}: WSSR = ${wssr.toFixed(2)}, LR = ${learningRate.toExponential(2)}`);
    }
  }
  
  return bestParams;
}

console.log('Fitting 4PL parameters with robust method...\n');

const fittedParams = fit4PL(dataPoints);

console.log('\n' + '='.repeat(80));
console.log('FITTED 4PL PARAMETERS');
console.log('='.repeat(80));
console.log(`Top: ${fittedParams.top.toFixed(6)}`);
console.log(`Bottom: ${fittedParams.bottom.toFixed(6)}`);
console.log(`MidPoint (EC50): ${fittedParams.midpoint.toFixed(6)}`);
console.log(`HillSlope: ${fittedParams.hillSlope.toFixed(6)}`);

// Validate
console.log('\n' + '='.repeat(80));
console.log('VALIDATION OF FITTED PARAMETERS');
console.log('='.repeat(80));

const results = [];
for (const point of dataPoints) {
  const predicted = fourPL(point.x, fittedParams.top, fittedParams.bottom, fittedParams.midpoint, fittedParams.hillSlope);
  const diff = Math.abs(predicted - point.y);
  const diffPercent = (diff / point.y) * 100;
  
  results.push({
    concentration: point.x,
    actualSignal: point.y,
    predictedSignal: predicted,
    diff: diff,
    diffPercent: diffPercent,
    status: diffPercent <= 0.5 ? 'PASS' : 'FAIL'
  });
}

console.log('\nConcentration | Actual Signal | Predicted Signal | Difference | % Diff | Status');
console.log('-'.repeat(80));

results.forEach(r => {
  const status = r.status === 'PASS' ? '✓ PASS' : '✗ FAIL';
  console.log(
    `${r.concentration.toFixed(4).padEnd(13)} | ` +
    `${r.actualSignal.toFixed(2).padEnd(14)} | ` +
    `${r.predictedSignal.toFixed(2).padEnd(16)} | ` +
    `${r.diff.toFixed(2).padEnd(10)} | ` +
    `${r.diffPercent.toFixed(2).padEnd(6)}% | ` +
    status
  );
});

const passCount = results.filter(r => r.status === 'PASS').length;
console.log(`\nForward fit: ${passCount}/${results.length} passed`);

// Test inverse
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
  return midpoint * ratio;
}

console.log('\n' + '='.repeat(80));
console.log('INVERSE 4PL VALIDATION');
console.log('='.repeat(80));
console.log('\nConcentration | Signal    | Calculated Conc | Difference | % Diff | Status');
console.log('-'.repeat(80));

const inverseResults = [];
for (const point of dataPoints) {
  const calculatedConc = inverse4PL(point.y, fittedParams);
  
  if (calculatedConc === null) {
    console.log(`${point.x.toFixed(4).padEnd(13)} | ${point.y.toFixed(2).padEnd(9)} | OUT OF RANGE    | -          | -      | -`);
    continue;
  }
  
  const diff = Math.abs(calculatedConc - point.x);
  const diffPercent = (diff / point.x) * 100;
  const status = diffPercent <= 0.5 ? 'PASS' : 'FAIL';
  
  inverseResults.push({ concentration: point.x, signal: point.y, calculated: calculatedConc, diff, diffPercent, status });
  
  const statusSymbol = status === 'PASS' ? '✓ PASS' : '✗ FAIL';
  console.log(
    `${point.x.toFixed(4).padEnd(13)} | ` +
    `${point.y.toFixed(2).padEnd(9)} | ` +
    `${calculatedConc.toFixed(4).padEnd(16)} | ` +
    `${diff.toFixed(4).padEnd(10)} | ` +
    `${diffPercent.toFixed(2).padEnd(6)}% | ` +
    statusSymbol
  );
}

const inversePassCount = inverseResults.filter(r => r.status === 'PASS').length;
console.log(`\nInverse calculation: ${inversePassCount}/${inverseResults.length} passed`);

console.log('\n' + '='.repeat(80));
console.log('FITTED PARAMETERS (JSON)');
console.log('='.repeat(80));
console.log(JSON.stringify({
  "Algorithm Parameter: Calc. Top": fittedParams.top,
  "Algorithm Parameter: Calc. Bottom": fittedParams.bottom,
  "Algorithm Parameter: Calc. MidPoint": fittedParams.midpoint,
  "Algorithm Parameter: Calc. HillSlope": fittedParams.hillSlope
}, null, 2));

