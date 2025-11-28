/**
 * Fit 4PL parameters from standards data using Levenberg-Marquardt algorithm
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

// Filter out zero concentration
const dataPoints = standards.filter(s => s.concentration > 0).map(s => ({
  x: s.concentration,
  y: s.mean
}));

/**
 * Forward 4PL function
 */
function fourPL(x, top, bottom, midpoint, hillSlope) {
  return bottom + (top - bottom) / (1 + Math.pow(x / midpoint, hillSlope));
}

/**
 * Calculate sum of squared residuals
 */
function calculateSSR(params, dataPoints) {
  const { top, bottom, midpoint, hillSlope } = params;
  let ssr = 0;
  for (const point of dataPoints) {
    const predicted = fourPL(point.x, top, bottom, midpoint, hillSlope);
    const residual = point.y - predicted;
    ssr += residual * residual;
  }
  return ssr;
}

/**
 * Levenberg-Marquardt fitting
 */
function fit4PL(dataPoints, initialParams, maxIterations = 1000, tolerance = 1e-10) {
  let params = { ...initialParams };
  let lambda = 0.001;
  const lambdaFactor = 10;
  
  for (let iter = 0; iter < maxIterations; iter++) {
    const ssr = calculateSSR(params, dataPoints);
    
    // Calculate Jacobian matrix
    const n = dataPoints.length;
    const jacobian = [];
    const residuals = [];
    
    for (let i = 0; i < n; i++) {
      const point = dataPoints[i];
      const predicted = fourPL(point.x, params.top, params.bottom, params.midpoint, params.hillSlope);
      const residual = point.y - predicted;
      residuals.push(residual);
      
      // Calculate partial derivatives
      const x = point.x;
      const t = params.top;
      const b = params.bottom;
      const m = params.midpoint;
      const h = params.hillSlope;
      
      const term = Math.pow(x / m, h);
      const denom = 1 + term;
      
      // d/dtop
      const dtop = 1 / denom;
      // d/dbottom
      const dbottom = 1 - 1 / denom;
      // d/dmidpoint
      const dmidpoint = (t - b) * h * term / (m * denom * denom);
      // d/dhillSlope
      const dhillSlope = -(t - b) * term * Math.log(x / m) / (denom * denom);
      
      jacobian.push([dtop, dbottom, dmidpoint, dhillSlope]);
    }
    
    // Calculate J^T * J and J^T * r
    const jtj = [[0,0,0,0], [0,0,0,0], [0,0,0,0], [0,0,0,0]];
    const jtr = [0, 0, 0, 0];
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < 4; j++) {
        jtr[j] += jacobian[i][j] * residuals[i];
        for (let k = 0; k < 4; k++) {
          jtj[j][k] += jacobian[i][j] * jacobian[i][k];
        }
      }
    }
    
    // Add damping (Levenberg-Marquardt)
    for (let i = 0; i < 4; i++) {
      jtj[i][i] *= (1 + lambda);
    }
    
    // Solve linear system (simple Gaussian elimination for 4x4)
    const a = jtj.map(row => [...row]);
    const b = [...jtr];
    
    // Gaussian elimination
    for (let i = 0; i < 4; i++) {
      // Find pivot
      let maxRow = i;
      for (let k = i + 1; k < 4; k++) {
        if (Math.abs(a[k][i]) > Math.abs(a[maxRow][i])) {
          maxRow = k;
        }
      }
      [a[i], a[maxRow]] = [a[maxRow], a[i]];
      [b[i], b[maxRow]] = [b[maxRow], b[i]];
      
      // Eliminate
      for (let k = i + 1; k < 4; k++) {
        const factor = a[k][i] / a[i][i];
        for (let j = i; j < 4; j++) {
          a[k][j] -= factor * a[i][j];
        }
        b[k] -= factor * b[i];
      }
    }
    
    // Back substitution
    const delta = [0, 0, 0, 0];
    for (let i = 3; i >= 0; i--) {
      delta[i] = b[i];
      for (let j = i + 1; j < 4; j++) {
        delta[i] -= a[i][j] * delta[j];
      }
      delta[i] /= a[i][i];
    }
    
    // Update parameters
    const newParams = {
      top: params.top + delta[0],
      bottom: params.bottom + delta[1],
      midpoint: params.midpoint + delta[2],
      hillSlope: params.hillSlope + delta[3]
    };
    
    // Ensure parameters stay in valid ranges
    newParams.top = Math.max(newParams.top, Math.max(...dataPoints.map(p => p.y)) * 1.1);
    newParams.bottom = Math.max(0, Math.min(newParams.bottom, Math.min(...dataPoints.map(p => p.y)) * 0.9));
    newParams.midpoint = Math.max(0.001, newParams.midpoint);
    newParams.hillSlope = Math.max(0.1, Math.min(10, newParams.hillSlope));
    
    const newSSR = calculateSSR(newParams, dataPoints);
    
    if (newSSR < ssr) {
      // Good step
      params = newParams;
      lambda /= lambdaFactor;
      
      if (Math.abs(ssr - newSSR) < tolerance) {
        break;
      }
    } else {
      // Bad step, increase damping
      lambda *= lambdaFactor;
    }
  }
  
  return params;
}

// Initial parameter estimates
const minSignal = Math.min(...dataPoints.map(p => p.y));
const maxSignal = Math.max(...dataPoints.map(p => p.y));
const midSignal = (minSignal + maxSignal) / 2;

// Find concentration that gives mid signal
let midConc = dataPoints[Math.floor(dataPoints.length / 2)].x;

const initialParams = {
  top: maxSignal * 1.2,
  bottom: minSignal * 0.9,
  midpoint: midConc,
  hillSlope: 1.0
};

console.log('Fitting 4PL parameters from standards data...');
console.log('Initial parameters:', initialParams);
console.log('\nData points:', dataPoints);

const fittedParams = fit4PL(dataPoints, initialParams);

console.log('\n' + '='.repeat(80));
console.log('FITTED 4PL PARAMETERS');
console.log('='.repeat(80));
console.log(`Top: ${fittedParams.top.toFixed(6)}`);
console.log(`Bottom: ${fittedParams.bottom.toFixed(6)}`);
console.log(`MidPoint (EC50): ${fittedParams.midpoint.toFixed(6)}`);
console.log(`HillSlope: ${fittedParams.hillSlope.toFixed(6)}`);

// Validate fitted parameters
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
  
  console.log(`\nConcentration: ${point.x.toFixed(4)}`);
  console.log(`  Actual Signal: ${point.y.toFixed(2)}`);
  console.log(`  Predicted Signal: ${predicted.toFixed(2)}`);
  console.log(`  Difference: ${diff.toFixed(2)} (${diffPercent.toFixed(2)}%)`);
  console.log(`  Status: ${diffPercent <= 0.5 ? '✓ PASS' : '✗ FAIL'}`);
}

console.log('\n' + '='.repeat(80));
console.log('SUMMARY TABLE');
console.log('='.repeat(80));
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
const total = results.length;

console.log('\n' + '='.repeat(80));
console.log(`RESULTS: ${passCount}/${total} passed`);
console.log('='.repeat(80));

// Now test inverse calculation
console.log('\n' + '='.repeat(80));
console.log('TESTING INVERSE 4PL CALCULATION');
console.log('='.repeat(80));

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
  
  inverseResults.push({
    concentration: point.x,
    signal: point.y,
    calculated: calculatedConc,
    diff: diff,
    diffPercent: diffPercent,
    status: status
  });
  
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
console.log('\n' + '='.repeat(80));
console.log(`INVERSE CALCULATION RESULTS: ${inversePassCount}/${inverseResults.length} passed`);
console.log('='.repeat(80));

// Export fitted parameters
console.log('\n' + '='.repeat(80));
console.log('FITTED PARAMETERS (for use in training data)');
console.log('='.repeat(80));
console.log(JSON.stringify({
  "Algorithm Parameter: Calc. Top": fittedParams.top,
  "Algorithm Parameter: Calc. Bottom": fittedParams.bottom,
  "Algorithm Parameter: Calc. MidPoint": fittedParams.midpoint,
  "Algorithm Parameter: Calc. HillSlope": fittedParams.hillSlope
}, null, 2));

