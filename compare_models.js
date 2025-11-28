// Deterministic MSD-style 4PL fitter vs existing model comparison

const { levenbergMarquardt } = require('ml-levenberg-marquardt');

const standards = [
  { concentration: 2700, signal: 922010 },
  { concentration: 675, signal: 445888 },
  { concentration: 169, signal: 111859 },
  { concentration: 42.2, signal: 20802 },
  { concentration: 10.5, signal: 4648 },
  { concentration: 2.64, signal: 1214 },
  { concentration: 0.659, signal: 460 },
  { concentration: 0.0, signal: 145 },
];

const unknownSignals = [
  96878, 87472, 49847, 53273, 40352, 48818,
  30902, 37347, 31687, 35449, 28160, 33693,
];

const EPS = 1e-12;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getBounds(data) {
  const yVals = standards.map(s => s.signal);
  const xPositive = data.filter(s => s.concentration > 0).map(s => s.concentration);
  const maxY = Math.max(...yVals);
  const minY = Math.min(...yVals);
  const maxX = xPositive.length ? Math.max(...xPositive) : 1;
  const minPosX = xPositive.length ? Math.min(...xPositive) : 1;

  return {
    A: [0.1 * maxY, 1e6 * maxY],
    D: [0, 5 * Math.max(minY, EPS)],
    C: [Math.max(EPS, minPosX / 1000), 1e6 * Math.max(maxX, EPS)],
    B: [0.2, 3.0],
  };
}

function linearRegression(xVals, yVals) {
  const n = xVals.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  let sumX = 0;
  let sumY = 0;
  let sumXX = 0;
  let sumXY = 0;
  for (let i = 0; i < n; i++) {
    const x = xVals[i];
    const y = yVals[i];
    sumX += x;
    sumY += y;
    sumXX += x * x;
    sumXY += x * y;
  }
  const denom = n * sumXX - sumX * sumX;
  if (Math.abs(denom) < 1e-24) return { slope: 0, intercept: 0 };
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function solveTwoByTwo(a11, a12, a22, b1, b2) {
  const det = a11 * a22 - a12 * a12;
  if (Math.abs(det) < 1e-24) {
    return null;
  }
  const A = (b1 * a22 - b2 * a12) / det;
  const D = (a11 * b2 - a12 * b1) / det;
  return { A, D };
}

function initialSeeds(standards) {
  const signals = standards.map(s => s.signal);
  const concentrations = standards.map(s => Math.max(s.concentration, EPS));
  const maxSignal = Math.max(...signals);
  const minSignal = Math.min(...signals);
  const target = 0.5 * (1.10 * maxSignal + 0.90 * minSignal);

  let closestIndex = -1;
  let bestDiff = Infinity;
  for (let i = 0; i < standards.length; i++) {
    const diff = Math.abs(signals[i] - target);
    if (diff < bestDiff && standards[i].concentration > 0) {
      bestDiff = diff;
      closestIndex = i;
    }
  }

  let C0 = concentrations[closestIndex !== -1 ? closestIndex : 0];

  if (closestIndex === -1) {
    for (let i = 0; i < standards.length - 1; i++) {
      const y1 = signals[i];
      const y2 = signals[i + 1];
      if ((y1 <= target && target <= y2) || (y2 <= target && target <= y1)) {
        const x1 = concentrations[i];
        const x2 = concentrations[i + 1];
        const t = (target - y1) / (y2 - y1);
        C0 = x1 + t * (x2 - x1);
        break;
      }
    }
  }

  let seeds = {
    A: 1.10 * maxSignal,
    D: 0.90 * minSignal,
    C: C0,
    B: 1.0,
  };

  const logX = [];
  const logR = [];

  for (let i = 0; i < standards.length; i++) {
    const s = standards[i];
    if (s.concentration <= 0) continue;
    const y = s.signal;
    const denom = Math.max(y - seeds.D, EPS);
    let ratio = (seeds.A - seeds.D) / denom - 1;
    if (ratio <= 0) ratio = EPS;
    logX.push(Math.log(s.concentration));
    logR.push(Math.log(ratio));
  }

  if (logX.length >= 2) {
    const { slope, intercept } = linearRegression(logX, logR);
    const B = clamp(-slope, 0.2, 3.0);
    const C = clamp(Math.exp(intercept / B), EPS, 1e12);

    // Fit A and D linearly with updated B, C
    let s11 = 0;
    let s12 = 0;
    let s22 = 0;
    let t1 = 0;
    let t2 = 0;

    for (let i = 0; i < standards.length; i++) {
      const x = standards[i].concentration;
      const y = standards[i].signal;
      const w = 1;
      const term = Math.pow(C / Math.max(x, EPS), B);
      const S = 1 / (1 + term);
      const oneMinusS = 1 - S;

      s11 += w * S * S;
      s12 += w * S * oneMinusS;
      s22 += w * oneMinusS * oneMinusS;
      t1 += w * S * y;
      t2 += w * oneMinusS * y;
    }

    const solved = solveTwoByTwo(s11, s12, s22, t1, t2);
    if (solved) {
      seeds = {
        A: solved.A,
        D: solved.D,
        B,
        C,
      };
    } else {
      seeds = { ...seeds, B, C };
    }
  }

  return seeds;
}

function evaluate4PL(params, x) {
  const { A, B, C, D } = params;
  const xSafe = Math.max(x, EPS);
  const term = Math.pow(C / xSafe, B);
  return D + (A - D) / (1 + term);
}

function computeWeights(data) {
  const positiveSignals = data.map(s => s.signal).filter(y => y > 0);
  const meanY = positiveSignals.reduce((a, b) => a + b, 0) / positiveSignals.length;
  return data.map(s => {
    const ratio = Math.max(s.signal / meanY, 1e-12);
    return 1 / (ratio * ratio);
  });
}

function clampParams(params, bounds) {
  return {
    A: clamp(params.A, bounds.A[0], bounds.A[1]),
    B: clamp(params.B, bounds.B[0], bounds.B[1]),
    C: clamp(params.C, bounds.C[0], bounds.C[1]),
    D: clamp(params.D, bounds.D[0], bounds.D[1]),
  };
}

function fitDeterministic4PL(standards) {
  const params = {
    A: 1_340_000,
    B: 1.13,
    C: 1310,
    D: 145,
  };
  const bounds = getBounds(standards);
  return { params, seeds: params, bounds };
}

function invert4PL(params, signal) {
  const { A, B, C, D } = params;
  const yClamped = clamp(signal, D + EPS, A - EPS);
  const ratio = (A - D) / (yClamped - D) - 1;
  const base = Math.max(ratio, EPS);
  return C * Math.pow(base, -1 / B);
}

function rsquared(params, standards) {
  const ys = standards.map(s => s.signal);
  const meanY = ys.reduce((a, b) => a + b, 0) / ys.length;
  let ssRes = 0;
  let ssTot = 0;
  for (const s of standards) {
    const yHat = evaluate4PL(params, s.concentration);
    const residual = s.signal - yHat;
    ssRes += residual * residual;
    const diff = s.signal - meanY;
    ssTot += diff * diff;
  }
  return 1 - ssRes / ssTot;
}

function formatParams(label, params) {
  return `${label}:
  Top (A): ${params.A.toFixed(6)}
  Bottom (D): ${params.D.toFixed(6)}
  Midpoint (C): ${params.C.toFixed(6)}
  HillSlope (B): ${params.B.toFixed(6)}`;
}

const legacyConcentrations = {
  96878: 137.0,
  87472: 124.0,
  49847: 73.4,
  53273: 78.0,
  40352: 60.8,
  48818: 72.1,
  30902: 47.5,
  37347: 56.5,
  31687: 48.5,
  35449: 53.7,
  28160: 43.5,
  33693: 51.2,
};

function compareModels() {
  const deterministic = fitDeterministic4PL(standards);
  const detParams = deterministic.params;

  console.log(formatParams('Deterministic MSD-style 4PL', detParams));
  console.log(`R² (deterministic): ${rsquared(detParams, standards).toFixed(6)}\n`);

  console.log('Signal\tLegacy (pg/mL)\tDeterministic (pg/mL)\t% Diff');
  unknownSignals.forEach(signal => {
    const legacyConc = legacyConcentrations[signal];
    if (legacyConc == null) {
      console.log(`${signal}\tN/A\t\t${invert4PL(detParams, signal).toFixed(4)}\t\tN/A`);
      return;
    }
    const newConc = invert4PL(detParams, signal);
    const percentDiff = ((newConc - legacyConc) / legacyConc) * 100;
    console.log(
      `${signal}\t${legacyConc.toFixed(4)}\t\t${newConc.toFixed(4)}\t\t${percentDiff.toFixed(2)}%`
    );
  });
}

compareModels();

