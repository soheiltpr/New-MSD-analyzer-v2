// Universal Smart Fit Strategy for 4PL

function msd_mean(arr) { 
  return arr.reduce((a, b) => a + b, 0) / arr.length; 
}

function msd_median(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function msd_log10(v) { 
  return Math.log(Math.max(v, 1e-10)) / Math.LN10; 
}

function msd_clamp(v, lo, hi) { 
  return Math.max(lo, Math.min(hi, v)); 
}

// 4PL equation: y = D + (A - D) / (1 + (x/C)^B)
// For INCREASING curves, we need: y = D + (A - D) / (1 + (C/x)^B)
// Where: A = Top (upper asymptote), D = Bottom (lower asymptote)
// At low x: (C/x)^B >> 1, so y ≈ D (Bottom) ✓
// At high x: (C/x)^B << 1, so y ≈ A (Top) ✓
function y4pl(params, x) {
  const {A, D, C, B} = params;
  if (C <= 0 || B <= 0 || A <= D) return NaN;
  const ratio = C / x;  // FIXED: C/x for increasing curves
  return D + (A - D) / (1 + Math.pow(ratio, B));
}

// Loss function with weights
function loss4pl(params, x, y, weights) {
  let sse = 0;
  for (let i = 0; i < x.length; i++) {
    const ypred = y4pl(params, x[i]);
    const residual = y[i] - ypred;
    sse += weights[i] * residual * residual;
  }
  return sse;
}

// Nelder-Mead optimizer
function nelderMead(fn, start, step = 1.0, maxIter = 500, tol = 1e-9) {
  const n = start.length;
  let simplex = [start.slice()];
  for (let i = 0; i < n; i++) {
    const p = start.slice();
    p[i] = p[i] + (Math.abs(start[i]) + 1) * 0.05 + step * 0.01;
    simplex.push(p);
  }
  function f(p) { return fn(p); }

  function centroid(pts, exclude) {
    const c = new Array(n).fill(0);
    for (let i = 0; i < pts.length; i++) {
      if (i === exclude) continue;
      for (let j = 0; j < n; j++) c[j] += pts[i][j];
    }
    for (let j = 0; j < n; j++) c[j] /= (pts.length - 1);
    return c;
  }

  let values = simplex.map(f);
  for (let iter = 0; iter < maxIter; iter++) {
    const idx = values.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
    simplex = idx.map(k => simplex[k]);
    values = idx.map(k => values[k]);
    const fspan = Math.abs(values[values.length - 1] - values[0]);
    let pspan = 0;
    for (let j = 0; j < n; j++) {
      const arr = simplex.map(s => s[j]);
      pspan = Math.max(pspan, Math.abs(Math.max(...arr) - Math.min(...arr)));
    }
    if (fspan < tol && pspan < 1e-7) break;
    const worst = simplex.length - 1;
    const c = centroid(simplex, worst);
    const alpha = 1.0, gamma = 2.0, rho = 0.5, sigma = 0.5;
    const xr = c.map((ci, j) => ci + alpha * (ci - simplex[worst][j]));
    const fr = f(xr);
    if (fr < values[0]) {
      const xe = c.map((ci, j) => ci + gamma * (xr[j] - ci));
      const fe = f(xe);
      if (fe < fr) { simplex[worst] = xe; values[worst] = fe; }
      else { simplex[worst] = xr; values[worst] = fr; }
    } else if (fr < values[worst - 1]) {
      simplex[worst] = xr;
      values[worst] = fr;
    } else {
      const xc = c.map((ci, j) => ci + rho * (simplex[worst][j] - ci));
      const fc = f(xc);
      if (fc < values[worst]) { simplex[worst] = xc; values[worst] = fc; }
      else {
        for (let i = 1; i < simplex.length; i++) {
          simplex[i] = simplex[0].map((s0j, j) => s0j + sigma * (simplex[i][j] - s0j));
          values[i] = f(simplex[i]);
        }
      }
    }
  }
  const bestIdx = values.indexOf(Math.min(...values));
  return {params: simplex[bestIdx], fval: values[bestIdx]};
}

// Step 1: Hook Effect Filter
function applyHookFilter(concentrations, signals) {
  const filtered = [];
  const mask = new Array(concentrations.length).fill(false);
  
  // Check for non-monotonic behavior at low concentrations
  for (let i = 0; i < concentrations.length - 1; i++) {
    if (concentrations[i] < concentrations[i + 1] && 
        signals[i] > signals[i + 1] * 1.1) {
      // Lower concentration has significantly higher signal - Hook Effect
      mask[i] = true;
      console.log(`  ⚠️ Hook Effect detected: Conc ${concentrations[i].toFixed(4)} (signal ${signals[i].toFixed(0)}) > Conc ${concentrations[i+1].toFixed(4)} (signal ${signals[i+1].toFixed(0)})`);
    }
  }
  
  for (let i = 0; i < concentrations.length; i++) {
    if (!mask[i]) {
      filtered.push({conc: concentrations[i], signal: signals[i]});
    }
  }
  
  return filtered;
}

// Step 2: Initial Guessing
function getInitialGuesses(concentrations, signals, zeroSignals) {
  const A = Math.max(...signals) * 1.01;  // Top (upper asymptote)
  const D = zeroSignals && zeroSignals.length > 0 ? 
            msd_mean(zeroSignals) * 0.9 : 
            Math.min(...signals);  // Bottom (lower asymptote)
  const C = msd_median(concentrations.filter(c => c > 0));  // MidPoint (median of positive)
  const B = 1.0;  // Hill Slope
  
  // Ensure A > D
  if (A <= D) {
    return {A: D * 1.1, D: D, C, B};
  }
  
  return {A, D, C, B};
}

// Step 3 & 4: Iteratively Reweighted Fitting with Outlier Pruning
function fit4PLWithOutlierRemoval(concentrations, signals, initialParams, maxIterations = 10) {
  let params = {...initialParams};
  let x = concentrations.slice();
  let y = signals.slice();
  let mask = new Array(x.length).fill(false);
  
  for (let iter = 0; iter < maxIterations; iter++) {
    // Calculate weights based on predicted values
    const weights = y.map((yi, i) => {
      const ypred = y4pl(params, x[i]);
      return 1 / Math.pow(Math.max(ypred, 1), 2);  // 1/y² weighting
    });
    
    // Fit with current weights
    const fn = (pArr) => {
      const p = {A: pArr[0], D: pArr[1], C: pArr[2], B: pArr[3]};
      // Apply bounds - A must be > D, C and B must be > 0
      if (p.A <= p.D) return 1e10;
      if (p.C <= 0 || p.C > Math.max(...x) * 100) return 1e10;
      if (p.B <= 0 || p.B > 10) return 1e10;
      if (p.A < Math.max(...y) * 0.5) return 1e10;  // Top should be reasonable
      if (p.D > Math.min(...y) * 2) return 1e10;   // Bottom should be reasonable
      return loss4pl(p, x, y, weights);
    };
    
    const start = [params.A, params.D, params.C, params.B];
    const res = nelderMead(fn, start, 1.0, 500, 1e-10);
    params = {
      A: Math.max(res.params[0], params.D * 1.1),  // Ensure A > D
      D: Math.min(res.params[1], params.A * 0.9),   // Ensure D < A
      C: Math.max(res.params[2], Math.min(...x) * 0.1),  // C should be in reasonable range
      B: msd_clamp(res.params[3], 0.1, 10.0)
    };
    
    // Final validation
    if (params.A <= params.D) {
      params.A = params.D * 1.1;
    }
    if (params.C <= 0) {
      params.C = msd_median(x.filter(c => c > 0));
    }
    
    // Step 4: Outlier Pruning (after first few iterations)
    if (iter >= 3) {
      let foundOutlier = false;
      for (let i = 0; i < x.length; i++) {
        if (mask[i]) continue;  // Already masked
        const ypred = y4pl(params, x[i]);
        const deviation = Math.abs(y[i] - ypred) / Math.max(ypred, 1);
        if (deviation > 0.40) {  // 40% threshold
          mask[i] = true;
          foundOutlier = true;
          console.log(`  ⚠️ Outlier removed: Conc ${x[i].toFixed(4)}, Signal ${y[i].toFixed(0)}, Predicted ${ypred.toFixed(0)}, Deviation ${(deviation*100).toFixed(1)}%`);
        }
      }
      
      // Rebuild arrays without outliers
      if (foundOutlier) {
        const newX = [];
        const newY = [];
        const newMask = [];
        for (let i = 0; i < x.length; i++) {
          if (!mask[i]) {
            newX.push(x[i]);
            newY.push(y[i]);
            newMask.push(false);
          }
        }
        x = newX;
        y = newY;
        mask = newMask;
      }
    }
    
    // Check convergence
    if (iter > 0) {
      const change = Math.abs(res.fval - (iter === 1 ? 1e10 : res.fval));
      if (change < 1e-6) break;
    }
  }
  
  return {params, maskedCount: mask.filter(m => m).length};
}

// Calculate R²
function calculateR2(params, concentrations, signals) {
  const yhat = concentrations.map(x => y4pl(params, x));
  const ssRes = signals.reduce((sum, yi, i) => sum + Math.pow(yi - yhat[i], 2), 0);
  const ssTot = signals.reduce((sum, yi) => sum + Math.pow(yi - msd_mean(signals), 2), 0);
  return 1 - (ssRes / ssTot);
}

// Main fitting function
function universalSmartFit4PL(concentrations, signals, zeroSignals = null) {
  console.log('\n🔬 Universal Smart Fit 4PL:');
  
  // Step 1: Hook Effect Filter
  console.log('Step 1: Hook Effect Filter...');
  const filtered = applyHookFilter(concentrations, signals);
  const filteredConc = filtered.map(f => f.conc);
  const filteredSig = filtered.map(f => f.signal);
  
  if (filtered.length < concentrations.length) {
    console.log(`  ✓ Filtered ${concentrations.length - filtered.length} point(s) due to Hook Effect`);
  } else {
    console.log('  ✓ No Hook Effect detected');
  }
  
  // Step 2: Initial Guessing
  console.log('Step 2: Initial Guessing...');
  const initial = getInitialGuesses(filteredConc, filteredSig, zeroSignals);
  console.log(`  Initial Top (A): ${initial.A.toFixed(2)}`);
  console.log(`  Initial Bottom (D): ${initial.D.toFixed(2)}`);
  console.log(`  Initial MidPoint (C): ${initial.C.toFixed(4)}`);
  console.log(`  Initial HillSlope (B): ${initial.B.toFixed(2)}`);
  
  // Step 3 & 4: Iteratively Reweighted Fitting with Outlier Pruning
  console.log('Step 3-4: Iteratively Reweighted Fitting with Outlier Pruning...');
  const fitResult = fit4PLWithOutlierRemoval(filteredConc, filteredSig, initial, 10);
  const finalParams = fitResult.params;
  
  if (fitResult.maskedCount > 0) {
    console.log(`  ✓ Removed ${fitResult.maskedCount} outlier(s)`);
  }
  
  console.log(`  Final Top (A): ${finalParams.A.toFixed(2)}`);
  console.log(`  Final Bottom (D): ${finalParams.D.toFixed(2)}`);
  console.log(`  Final MidPoint (C): ${finalParams.C.toFixed(4)}`);
  console.log(`  Final HillSlope (B): ${finalParams.B.toFixed(6)}`);
  
  // Calculate R²
  const r2 = calculateR2(finalParams, filteredConc, filteredSig);
  console.log(`  R²: ${r2.toFixed(6)}`);
  
  return {
    params: finalParams,
    initial: initial,
    r2: r2,
    filteredPoints: concentrations.length - filtered.length
  };
}

// Test with remaining cytokines
const remainingData = {
  'IL-4': {
    zero: [88, 96],
    standards: [
      {conc: 0.201416016, signals: [787, 734]},
      {conc: 0.805664063, signals: [2447, 2327]},
      {conc: 3.22265625, signals: [9827, 9557]},
      {conc: 12.890625, signals: [38279, 36754]},
      {conc: 51.5625, signals: [149440, 149013]},
      {conc: 206.25, signals: [571725, 558238]},
      {conc: 825, signals: [1386830, 1458066]}
    ]
  },
  'IL-5': {
    zero: [152, 167],
    standards: [
      {conc: 0.522460938, signals: [472, 472]},
      {conc: 2.08984375, signals: [1316, 1230]},
      {conc: 8.359375, signals: [4678, 4438]},
      {conc: 33.4375, signals: [18326, 16898]},
      {conc: 133.75, signals: [70241, 67645]},
      {conc: 535, signals: [273830, 260724]},
      {conc: 2140, signals: [916569, 870606]}
    ]
  },
  'IL-6': {
    zero: [117, 126],
    standards: [
      {conc: 0.25390625, signals: [239, 257]},
      {conc: 1.015625, signals: [553, 612]},
      {conc: 4.0625, signals: [1832, 1850]},
      {conc: 16.25, signals: [7349, 7109]},
      {conc: 65, signals: [30599, 30087]},
      {conc: 260, signals: [142686, 134401]},
      {conc: 1040, signals: [597631, 600164]}
    ]
  },
  'MCP-1': {
    zero: [111, 178],
    standards: [
      {conc: 0.659179688, signals: [420, 499]},
      {conc: 2.63671875, signals: [1239, 1189]},
      {conc: 10.546875, signals: [4670, 4625]},
      {conc: 42.1875, signals: [21550, 20053]},
      {conc: 168.75, signals: [112796, 110921]},
      {conc: 675, signals: [454545, 437231]},
      {conc: 2700, signals: [916556, 927463]}
    ]
  },
  'TNF-α': {
    zero: [200, 240],
    standards: [
      {conc: 0.330810547, signals: [492, 491]},
      {conc: 1.323242188, signals: [1354, 1191]},
      {conc: 5.29296875, signals: [4657, 4579]},
      {conc: 21.171875, signals: [18170, 17121]},
      {conc: 84.6875, signals: [71400, 71792]},
      {conc: 338.75, signals: [285538, 272065]},
      {conc: 1355, signals: [969965, 1008205]}
    ]
  }
};

console.log('='.repeat(100));
console.log('UNIVERSAL SMART FIT 4PL PARAMETERS');
console.log('='.repeat(100));

const results = [];

for (const [cytokine, data] of Object.entries(remainingData)) {
  console.log(`\n${'='.repeat(100)}`);
  console.log(`${cytokine}:`);
  console.log('='.repeat(100));
  
  const meanSignals = data.standards.map(s => msd_mean(s.signals));
  const concentrations = data.standards.map(s => s.conc);
  
  const fitResult = universalSmartFit4PL(concentrations, meanSignals, data.zero);
  
  results.push({
    cytokine,
    Top: fitResult.params.A,
    Bottom: fitResult.params.D,
    MidPoint: fitResult.params.C,
    HillSlope: fitResult.params.B,
    R2: fitResult.r2
  });
}

console.log('\n' + '='.repeat(100));
console.log('FINAL RESULTS TABLE');
console.log('='.repeat(100));
console.log('');

console.log('Assay\tSpot\tCalc. Top\tCalc. Bottom\tCalc. MidPoint\tCalc. HillSlope\tRSquared');
console.log('-'.repeat(100));

const spotMap = {'IL-4': 5, 'IL-5': 6, 'IL-6': 7, 'MCP-1': 9, 'TNF-α': 10};

for (const r of results) {
  console.log(
    `${r.cytokine}\t${spotMap[r.cytokine]}\t${r.Top.toFixed(3)}\t${r.Bottom.toFixed(9)}\t${r.MidPoint.toFixed(10)}\t${r.HillSlope.toFixed(9)}\t${r.R2.toFixed(9)}`
  );
}

