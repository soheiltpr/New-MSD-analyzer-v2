// Calculate remaining 5 cytokines using the exact MSD algorithm

function msd_mean(arr) { 
  return arr.reduce((a, b) => a + b, 0) / arr.length; 
}

function msd_clamp(v, lo, hi) { 
  return Math.max(lo, Math.min(hi, v)); 
}

function msd_log10(v) { 
  return Math.log(Math.max(v, 1e-10)) / Math.LN10; 
}

// Use the ORIGINAL equation from 4PL.html: t = 10^(xlog - Clog)
function msd_y4pl_logx(params, xlog) {
  const {A, D, Clog, B} = params;
  const t = Math.pow(10, (xlog - Clog));  // Original from 4PL.html
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

function calculateInitialMidPoint(conc, y) {
  let bestC0 = null;
  let bestScore = Infinity;
  const minConc = Math.min(...conc);
  const maxConc = Math.max(...conc);
  
  for (let excludeStart = 0; excludeStart <= Math.min(3, conc.length - 3); excludeStart++) {
    for (let excludeEnd = 0; excludeEnd <= Math.min(2, conc.length - excludeStart - 3); excludeEnd++) {
      const testConc = conc.slice(excludeStart, conc.length - excludeEnd);
      const testY = y.slice(excludeStart, y.length - excludeEnd);
      
      if (testConc.length < 3) continue;
      
      const minSignal = Math.min(...testY);
      const maxSignal = Math.max(...testY);
      const midSignal = (minSignal + maxSignal) / 2;
      let baseC0 = Math.sqrt(testConc[0] * testConc[testConc.length - 1]);
      
      for (let i = 0; i < testY.length - 1; i++) {
        if ((testY[i] <= midSignal && testY[i+1] >= midSignal) || 
            (testY[i] >= midSignal && testY[i+1] <= midSignal)) {
          const y1 = testY[i];
          const y2 = testY[i+1];
          const x1 = msd_log10(testConc[i]);
          const x2 = msd_log10(testConc[i+1]);
          if (Math.abs(y2 - y1) > 1e-6) {
            const fraction = (midSignal - y1) / (y2 - y1);
            const xlogMid = x1 + fraction * (x2 - x1);
            baseC0 = Math.pow(10, xlogMid);
          }
          break;
        }
      }
      
      const factors = [1.0, 1.15, 1.2, 1.25];
      for (const factor of factors) {
        const testC0 = baseC0 * factor;
        
        let score = 0;
        if (testC0 < minConc * 0.1 || testC0 > maxConc * 10) {
          score += 1000;
        } else if (testC0 < minConc || testC0 > maxConc) {
          score += 100;
        }
        const midRange = (minConc + maxConc) / 2;
        score += Math.abs(testC0 - midRange) / maxConc * 50;
        score -= (testConc.length / conc.length) * 5;
        
        if (score < bestScore) {
          bestScore = score;
          bestC0 = testC0;
        }
      }
    }
  }
  
  return bestC0 || (Math.sqrt(conc[0] * conc[conc.length - 1]) * 1.2);
}

function msd_fit4PL(conc, signal, zeroSignals = null) {
  const xlog = conc.map(x => msd_log10(x));
  const y = signal.slice();
  const w = y.map(v => 1 / Math.pow(Math.max(v, 1), 2)); // 1/y² weighting

  // Universal Algorithm for Initial Parameter Estimates
  let A0;
  if (zeroSignals && zeroSignals.length > 0) {
    A0 = msd_mean(zeroSignals) * 0.9;
  } else {
    A0 = Math.min(...y);
  }
  
  const D0 = Math.max(...y) * 1.01;
  const B0 = 1.0;
  const C0 = calculateInitialMidPoint(conc, y);

  const start = [A0, D0, msd_log10(C0), B0];
  
  const ClogMin = Math.min(...xlog) - 1.0;
  const ClogMax = Math.max(...xlog) + 1.0;
  
  const hard = {
    Amin: 0,
    Dmin: A0 * 0.1, 
    Dmax: 1e12, // Very high upper bound
    Bmin: 0.1,
    Bmax: 10.0,
    ClogMin, ClogMax
  };

  const fn = (pArr) => {
    const p = {A: pArr[0], D: pArr[1], Clog: pArr[2], B: pArr[3]};
    return msd_loss4pl(p, xlog, y, w, hard);
  };

  const res = msd_nelderMead(fn, start, 1.0, 500, 1e-10);
  const p = {A: res.params[0], D: res.params[1], Clog: res.params[2], B: res.params[3]};
  
  // Validate and clamp parameters
  p.A = Math.max(p.A, hard.Amin);
  p.D = msd_clamp(p.D, hard.Dmin, hard.Dmax);
  p.B = msd_clamp(p.B, hard.Bmin, hard.Bmax);
  p.Clog = msd_clamp(p.Clog, hard.ClogMin, hard.ClogMax);
  
  // Ensure Top > Bottom
  if (p.D <= p.A) {
    p.D = Math.max(p.A * 1.1, D0 * 1.01);
  }
  
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

// Remaining cytokines to calculate
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
console.log('4PL PARAMETERS FOR REMAINING CYTOKINES');
console.log('='.repeat(100));
console.log('');

const results = [];

for (const [cytokine, data] of Object.entries(remainingData)) {
  const zeroMean = msd_mean(data.zero);
  const meanSignals = data.standards.map(s => msd_mean(s.signals));
  const concentrations = data.standards.map(s => s.conc);
  
  const fitResult = msd_fit4PL(concentrations, meanSignals, data.zero);
  const params = fitResult.params;
  const midPoint = Math.pow(10, params.Clog);
  const r2 = calculateR2(params, concentrations, meanSignals);
  
  // Calculate initial guesses for comparison
  const initialBottom = zeroMean * 0.9;
  const initialTop = Math.max(...meanSignals) * 1.01;
  const initialMidPoint = calculateInitialMidPoint(concentrations, meanSignals);
  
  results.push({
    cytokine,
    initialTop: initialTop,
    initialBottom: initialBottom,
    initialMidPoint: initialMidPoint,
    finalTop: params.D,
    finalBottom: params.A,
    finalMidPoint: midPoint,
    finalHillSlope: params.B,
    R2: r2
  });
}

// Print table in MSD format
console.log('Assay\tSpot\tAlgorithm\tAlgorithm Parameter: Initial Top\tAlgorithm Parameter: Initial Bottom\tAlgorithm Parameter: Initial MidPoint\tAlgorithm Parameter: Initial HillSlope\tAlgorithm Parameter: Weighting\tAlgorithm Parameter: Max Iteration\tFit Statistic: RSquared\tAlgorithm Parameter: Calc. Top\tAlgorithm Parameter: Calc. Bottom\tAlgorithm Parameter: Calc. MidPoint\tAlgorithm Parameter: Calc. HillSlope');
console.log('-'.repeat(200));

const spotMap = {'IL-4': 5, 'IL-5': 6, 'IL-6': 7, 'MCP-1': 9, 'TNF-α': 10};

for (const r of results) {
  console.log(
    `${r.cytokine}\t${spotMap[r.cytokine]}\tFourPL\t` +
    `${r.initialTop.toFixed(2)}\t${r.initialBottom.toFixed(2)}\t${r.initialMidPoint.toFixed(10)}\t1\t1/y^2\t500\t` +
    `${r.R2.toFixed(9)}\t${r.finalTop.toFixed(3)}\t${r.finalBottom.toFixed(9)}\t${r.finalMidPoint.toFixed(10)}\t${r.finalHillSlope.toFixed(9)}`
  );
}

console.log('');
console.log('='.repeat(100));
console.log('DETAILED RESULTS:');
console.log('='.repeat(100));

for (const r of results) {
  console.log(`\n${r.cytokine}:`);
  console.log(`  Initial: Top=${r.initialTop.toFixed(2)}, Bottom=${r.initialBottom.toFixed(2)}, MidPoint=${r.initialMidPoint.toFixed(4)}`);
  console.log(`  Final:   Top=${r.finalTop.toFixed(2)}, Bottom=${r.finalBottom.toFixed(2)}, MidPoint=${r.finalMidPoint.toFixed(4)}, HillSlope=${r.finalHillSlope.toFixed(6)}, R²=${r.R2.toFixed(6)}`);
}




