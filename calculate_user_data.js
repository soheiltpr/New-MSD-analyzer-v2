// ============================================================================
// EXACT COPY OF 4PL.html IMPLEMENTATION
// ============================================================================

function msd_mean(arr) { 
  return arr.reduce((a, b) => a + b, 0) / arr.length; 
}

function msd_clamp(v, lo, hi) { 
  return Math.max(lo, Math.min(hi, v)); 
}

function msd_log10(v) { 
  return Math.log(Math.max(v, 1e-10)) / Math.LN10; 
}

function msd_y4pl_logx(params, xlog) {
  const {A, D, Clog, B} = params;
  const t = Math.pow(10, (xlog - Clog));
  return A + (D - A) / (1 + Math.pow(t, B));
}

function msd_loss4pl(params, xlog, y, weights, hardBounds) {
  const {A, D, Clog, B} = params;
  let pen = 0;
  if (A < hardBounds.Amin) pen += Math.pow(hardBounds.Amin - A, 2) * 1e6;
  if (D < hardBounds.Dmin) pen += Math.pow(hardBounds.Dmin - D, 2) * 1e6;
  if (D > hardBounds.Dmax) pen += Math.pow(D - hardBounds.Dmax, 2) * 1e6;
  if (B < hardBounds.Bmin) pen += Math.pow(hardBounds.Bmin - B, 2) * 1e6;
  if (B > hardBounds.Bmax) pen += Math.pow(B - hardBounds.Bmax, 2) * 1e6;
  if (Clog < hardBounds.ClogMin) pen += Math.pow(hardBounds.ClogMin - Clog, 2) * 1e6;
  if (Clog > hardBounds.ClogMax) pen += Math.pow(Clog - hardBounds.ClogMax, 2) * 1e6;

  let sse = 0;
  for (let i = 0; i < xlog.length; i++) {
    const yhat = msd_y4pl_logx(params, xlog[i]);
    const r = y[i] - yhat;
    sse += weights[i] * r * r;
  }
  return sse + pen;
}

function msd_nelderMead(fn, start, step = 1.0, maxIter = 500, tol = 1e-9) {
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

function msd_fit4PL(conc, signal, topStdMean) {
  const xlog = conc.map(x => msd_log10(x));
  const y = signal.slice();
  const w = y.map(v => 1 / Math.pow(Math.max(v, 1), 2)); // 1/y² weighting

  // Initial parameter estimates based on MSD learning
  // A0 (Bottom) = min signal
  // D0 (Top) = max signal
  const A0 = Math.min(...y);
  const D0 = Math.max(...y);
  const B0 = 1.0;
  
  // Estimate C0 (MidPoint) - find concentration at half-maximal signal range
  const midSignal = (A0 + D0) / 2;
  let C0 = Math.sqrt(conc[0] * conc[conc.length - 1]); // Fallback: geometric mean
  
  // Try to find a better initial C0 by interpolation
  for (let i = 0; i < y.length - 1; i++) {
    if ((y[i] <= midSignal && y[i+1] >= midSignal) || (y[i] >= midSignal && y[i+1] <= midSignal)) {
      // Linear interpolation in log-space for concentration
      const y1 = y[i];
      const y2 = y[i+1];
      const x1 = msd_log10(conc[i]);
      const x2 = msd_log10(conc[i+1]);
      if (Math.abs(y2 - y1) > 1e-6) {
        const fraction = (midSignal - y1) / (y2 - y1);
        const xlogMid = x1 + fraction * (x2 - x1);
        C0 = Math.pow(10, xlogMid);
      }
      break;
    }
  }

  const start = [A0, D0, msd_log10(C0), B0];
  
  console.log('🔧 Initial 4PL parameters:', {
    A0: A0.toFixed(2),
    D0: D0.toFixed(2),
    C0: C0.toFixed(4),
    B0: B0.toFixed(2),
    Clog0: msd_log10(C0).toFixed(4)
  });

  const ClogMin = Math.min(...xlog) - 1.0;
  const ClogMax = Math.max(...xlog) + 1.0;
  
  // Hard bounds
  // Relax Dmax significantly to allow for non-saturating curves (like IFN-gamma)
  const hard = {
    Amin: 0,
    Dmin: A0 * 0.1, 
    Dmax: 1e12, // Very high upper bound (1 trillion) to allow for virtual top
    Bmin: 0.1,
    Bmax: 10.0,
    ClogMin, ClogMax
  };
  
  console.log('🔧 Hard bounds:', hard);

  const fn = (pArr) => {
    const p = {A: pArr[0], D: pArr[1], Clog: pArr[2], B: pArr[3]};
    return msd_loss4pl(p, xlog, y, w, hard);
  };

  const res = msd_nelderMead(fn, start, 1.0, 500, 1e-10); // 500 iterations
  const p = {A: res.params[0], D: res.params[1], Clog: res.params[2], B: res.params[3]};
  
  console.log('🔧 Raw fitted parameters (before clamping):', {
    A: p.A.toFixed(2),
    D: p.D.toFixed(2),
    Clog: p.Clog.toFixed(4),
    B: p.B.toFixed(4),
    fval: res.fval.toFixed(2)
  });
  
  // Validate and clamp parameters
  p.A = Math.max(p.A, hard.Amin);
  p.D = msd_clamp(p.D, hard.Dmin, hard.Dmax);
  p.B = msd_clamp(p.B, hard.Bmin, hard.Bmax);
  p.Clog = msd_clamp(p.Clog, hard.ClogMin, hard.ClogMax);
  
  // Ensure Top > Bottom
  if (p.D <= p.A) {
    console.warn('⚠️ Top <= Bottom, forcing Top > Bottom');
    p.D = Math.max(p.A * 1.1, D0 * 1.01);
  }
  
  console.log('🔧 Final parameters (after clamping):', {
    A: p.A.toFixed(2),
    D: p.D.toFixed(2),
    EC50: Math.pow(10, p.Clog).toFixed(4),
    B: p.B.toFixed(4)
  });
  
  return {
    params: p,
    initial: {A: A0, D: D0, C: C0, B: B0, Clog: msd_log10(C0)},
    hardBounds: hard
  };
}

function calculateR2(params, conc, signals) {
  const xlog = conc.map(x => msd_log10(x));
  const yhat = xlog.map(x => msd_y4pl_logx(params, x));
  const ssRes = signals.reduce((sum, yi, i) => sum + Math.pow(yi - yhat[i], 2), 0);
  const ssTot = signals.reduce((sum, yi) => sum + Math.pow(yi - msd_mean(signals), 2), 0);
  return 1 - (ssRes / ssTot);
}

// ============================================================================
// DATA PROCESSING
// ============================================================================

// Raw data from user
const rawData = [
  {conc: 0, signal: 119},
  {conc: 0, signal: 98},
  {conc: 1.127929688, signal: 1658},
  {conc: 1.127929688, signal: 1591},
  {conc: 4.51171875, signal: 6241},
  {conc: 4.51171875, signal: 5432},
  {conc: 18.046875, signal: 19341},
  {conc: 18.046875, signal: 21411},
  {conc: 72.1875, signal: 93083},
  {conc: 72.1875, signal: 77758},
  {conc: 288.75, signal: 301744},
  {conc: 288.75, signal: 305792},
  {conc: 1155, signal: 1342780},
  {conc: 1155, signal: 1100625},
  {conc: 4620, signal: 1759497},
  {conc: 4620, signal: 1836747}
];

// Group by concentration and average replicates (exclude zero)
const grouped = {};
rawData.forEach(d => {
  if (d.conc === 0) return; // Skip zero concentration (can't take log)
  const key = d.conc.toFixed(10);
  if (!grouped[key]) {
    grouped[key] = {conc: d.conc, signals: []};
  }
  grouped[key].signals.push(d.signal);
});

// Extract concentrations and mean signals
const concentrations = [];
const meanSignals = [];
const allSignals = [];

Object.keys(grouped).sort((a, b) => parseFloat(a) - parseFloat(b)).forEach(key => {
  const group = grouped[key];
  const mean = msd_mean(group.signals);
  concentrations.push(group.conc);
  meanSignals.push(mean);
  allSignals.push(group.signals);
});

console.log('\n📊 Processed Data (Averaged Replicates):');
console.log('Concentration (pg/mL) | Mean Signal | Replicates');
console.log('-----------------------------------------------');
concentrations.forEach((c, i) => {
  console.log(`${c.toFixed(4).padStart(15)} | ${meanSignals[i].toFixed(2).padStart(12)} | ${allSignals[i].length}`);
});

// Calculate zero-concentration mean for reference
const zeroSignals = rawData.filter(d => d.conc === 0).map(d => d.signal);
const zeroMean = msd_mean(zeroSignals);
console.log(`\n📌 Zero concentration mean signal: ${zeroMean.toFixed(2)} (for reference only)`);

console.log('\n🔬 Running 4PL fit (using exact 4PL.html algorithm)...\n');

// Fit 4PL (using max signal as topStdMean, matching analyzeCytokine in 4PL.html)
const topStdMean = Math.max(...meanSignals);
const fitResult = msd_fit4PL(concentrations, meanSignals, topStdMean);
const params = fitResult.params;
const midPoint = Math.pow(10, params.Clog);
const r2 = calculateR2(params, concentrations, meanSignals);

// Display results
console.log('\n' + '='.repeat(60));
console.log('📐 FINAL 4PL PARAMETERS');
console.log('='.repeat(60));
console.log(`Top (D):       ${params.D.toFixed(4)}`);
console.log(`Bottom (A):    ${params.A.toFixed(4)}`);
console.log(`MidPoint (C):  ${midPoint.toFixed(4)} pg/mL`);
console.log(`HillSlope (B): ${params.B.toFixed(6)}`);
console.log(`R²:            ${r2.toFixed(6)}`);
console.log('='.repeat(60));

// Compare with initial guesses
console.log('\n📋 Initial vs Final Parameters:');
console.log('Parameter    | Initial Guess | Final Value');
console.log('-------------------------------------------');
console.log(`Top (D)      | ${fitResult.initial.D.toFixed(4).padStart(13)} | ${params.D.toFixed(4)}`);
console.log(`Bottom (A)   | ${fitResult.initial.A.toFixed(4).padStart(13)} | ${params.A.toFixed(4)}`);
console.log(`MidPoint (C) | ${fitResult.initial.C.toFixed(4).padStart(13)} | ${midPoint.toFixed(4)}`);
console.log(`HillSlope (B)| ${fitResult.initial.B.toFixed(4).padStart(13)} | ${params.B.toFixed(6)}`);
