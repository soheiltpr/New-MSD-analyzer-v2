const { levenbergMarquardt } = require('ml-levenberg-marquardt');

const standards = [
  { concentration: 16050, signal: 1043605 },
  { concentration: 4012, signal: 246469 },
  { concentration: 1003, signal: 55313 },
  { concentration: 251, signal: 14372 },
  { concentration: 62.7, signal: 3503 },
  { concentration: 15.7, signal: 1024 },
  { concentration: 3.92, signal: 378 },
  { concentration: 0.0, signal: 149 },
];

const unknownSignals = [
  { well: 'B04', signal: 2444 },
  { well: 'B05', signal: 2146 },
  { well: 'C04', signal: 2865 },
  { well: 'C05', signal: 14446 },
  { well: 'D04', signal: 1425 },
  { well: 'D05', signal: 1423 },
  { well: 'E04', signal: 921 },
  { well: 'E05', signal: 773 },
  { well: 'F04', signal: 936 },
  { well: 'F05', signal: 239 },
  { well: 'G04', signal: 205 },
  { well: 'G05', signal: 201 },
];

const EPS = 1e-12;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getBounds(data) {
  const yVals = data.map(s => s.signal);
  const xPositive = data.filter(s => s.concentration > 0).map(s => s.concentration);
  const maxY = Math.max(...yVals);
  const minY = Math.min(...yVals);
  const maxX = Math.max(...xPositive);
  const minPosX = Math.min(...xPositive);

  return {
    A: [0.1 * maxY, 1e6 * maxY],
    D: [0, 5 * minY],
    C: [Math.max(EPS, minPosX / 1000), 1e6 * maxX],
    Bpos: [0.2, 3.0],
    Bneg: [-3.0, -0.2],
  };
}

function initialSeeds(data) {
  const signals = data.map(s => s.signal);
  const concentrations = data.map(s => Math.max(s.concentration, EPS));
  const maxSignal = Math.max(...signals);
  const minSignal = Math.min(...signals);
  const target = 0.5 * (1.10 * maxSignal + 0.90 * minSignal);

  let closestIndex = -1;
  let bestDiff = Infinity;
  for (let i = 0; i < data.length; i++) {
    const diff = Math.abs(signals[i] - target);
    if (diff < bestDiff && data[i].concentration > 0) {
      bestDiff = diff;
      closestIndex = i;
    }
  }

  let C0 = concentrations[closestIndex !== -1 ? closestIndex : 0];

  if (closestIndex === -1) {
    for (let i = 0; i < data.length - 1; i++) {
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

  return {
    A: 1.10 * maxSignal,
    D: 0.90 * minSignal,
    C: C0,
    B: 1.0,
  };
}

function evaluate4PL({ A, B, C, D }, x) {
  const xSafe = Math.max(x, EPS);
  const term = Math.pow(C / xSafe, B);
  return D + (A - D) / (1 + term);
}

function invert4PL({ A, B, C, D }, y) {
  const yClamped = clamp(y, D + EPS, A - EPS);
  const ratio = (A - D) / (yClamped - D) - 1;
  const base = Math.max(ratio, EPS);
  return C * Math.pow(base, -1 / B);
}

function rsquared(params, data) {
  const meanY = data.reduce((sum, item) => sum + item.signal, 0) / data.length;
  let ssRes = 0;
  let ssTot = 0;
  for (const item of data) {
    const yHat = evaluate4PL(params, item.concentration);
    const residual = item.signal - yHat;
    ssRes += residual * residual;
    const diff = item.signal - meanY;
    ssTot += diff * diff;
  }
  return 1 - ssRes / ssTot;
}

function fitModel(data) {
  const bounds = getBounds(data);
  const seeds = initialSeeds(data);
  const positives = data.filter(d => d.concentration > 0);
  const logX = [];
  const logR = [];
  for (const item of positives) {
    const ratio = (seeds.A - seeds.D) / Math.max(item.signal - seeds.D, EPS) - 1;
    if (ratio <= 0) continue;
    logX.push(Math.log(item.concentration));
    logR.push(Math.log(ratio));
  }

  function linearRegression(xs, ys) {
    const n = xs.length;
    if (!n) return { slope: -1, intercept: 0 };
    let sumX = 0, sumY = 0, sumXX = 0, sumXY = 0;
    for (let i = 0; i < n; i++) {
      sumX += xs[i];
      sumY += ys[i];
      sumXX += xs[i] * xs[i];
      sumXY += xs[i] * ys[i];
    }
    const denom = n * sumXX - sumX * sumX;
    if (Math.abs(denom) < 1e-24) return { slope: -1, intercept: 0 };
    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;
    return { slope, intercept };
  }

  const { slope, intercept } = linearRegression(logX, logR);
  const B0 = clamp(-slope, bounds.Bpos[0], bounds.Bpos[1]);
  const C0 = clamp(Math.exp(intercept / B0), bounds.C[0], bounds.C[1]);

  const weights = new Array(data.length).fill(1);
  const xData = data.map(d => d.concentration);
  const yData = data.map(d => d.signal);

  const minValues = [bounds.A[0], bounds.Bpos[0], bounds.C[0], bounds.D[0]];
  const maxValues = [bounds.A[1], bounds.Bpos[1], bounds.C[1], bounds.D[1]];

  let paramsArray = [
    clamp(seeds.A, minValues[0], maxValues[0]),
    clamp(B0, minValues[1], maxValues[1]),
    clamp(C0, minValues[2], maxValues[2]),
    clamp(seeds.D, minValues[3], maxValues[3]),
  ];

  const model = ([A, B, C, D]) => x => {
    const xSafe = Math.max(x, EPS);
    const term = Math.pow(C / xSafe, B);
    return D + (A - D) / (1 + term);
  };

  for (let round = 0; round < 5; round++) {
    const result = levenbergMarquardt({ x: xData, y: yData }, model, {
      initialValues: paramsArray,
      maxIterations: 20000,
      errorTolerance: 1e-12,
      damping: 1e-3,
      gradientDifference: 1e-12,
      weights,
      minValues,
      maxValues,
    });

    paramsArray = [
      clamp(result.parameterValues[0], minValues[0], maxValues[0]),
      clamp(result.parameterValues[1], minValues[1], maxValues[1]),
      clamp(result.parameterValues[2], minValues[2], maxValues[2]),
      clamp(result.parameterValues[3], minValues[3], maxValues[3]),
    ];
  }

  return {
    params: {
      A: paramsArray[0],
      B: paramsArray[1],
      C: paramsArray[2],
      D: paramsArray[3],
    },
  };
}

function createLegacyPredictor(data) {
  const usable = data
    .filter(d => d.concentration > 0 && d.signal > 0)
    .map(d => ({ concentration: d.concentration, signal: d.signal }))
    .sort((a, b) => a.signal - b.signal);

  const logPairs = usable.map(({ concentration, signal }) => ({
    logSignal: Math.log(signal),
    logConc: Math.log(concentration),
  }));

  const predict = signal => {
    const logSignal = Math.log(Math.max(signal, EPS));

    if (logSignal <= logPairs[0].logSignal) {
      const p1 = logPairs[0];
      const p2 = logPairs[1];
      const slope = (p2.logConc - p1.logConc) / (p2.logSignal - p1.logSignal);
      return Math.exp(p1.logConc + slope * (logSignal - p1.logSignal));
    }

    if (logSignal >= logPairs[logPairs.length - 1].logSignal) {
      const p1 = logPairs[logPairs.length - 2];
      const p2 = logPairs[logPairs.length - 1];
      const slope = (p2.logConc - p1.logConc) / (p2.logSignal - p1.logSignal);
      return Math.exp(p2.logConc + slope * (logSignal - p2.logSignal));
    }

    for (let i = 0; i < logPairs.length - 1; i++) {
      const p1 = logPairs[i];
      const p2 = logPairs[i + 1];
      if (logSignal >= p1.logSignal && logSignal <= p2.logSignal) {
        const t = (logSignal - p1.logSignal) / (p2.logSignal - p1.logSignal);
        const logConc = p1.logConc + t * (p2.logConc - p1.logConc);
        return Math.exp(logConc);
      }
    }

    return Math.exp(logPairs[logPairs.length - 1].logConc);
  };

  return { predict };
}

function compareModels() {
  const msdFit = fitModel(standards);
  const legacyPredictor = createLegacyPredictor(standards);

  console.log('MSD-style 4PL Parameters:');
  console.log(`  A (Top): ${msdFit.params.A.toFixed(6)}`);
  console.log(`  D (Bottom): ${msdFit.params.D.toFixed(6)}`);
  console.log(`  C (Midpoint): ${msdFit.params.C.toFixed(6)}`);
  console.log(`  B (HillSlope): ${msdFit.params.B.toFixed(6)}`);
  console.log(`  R²: ${rsquared(msdFit.params, standards).toFixed(6)}\n`);

  console.log('Well\tSignal\tMSD pg/mL\tLegacy pg/mL\t% Diff (MSD vs Legacy)');
  unknownSignals.forEach(({ well, signal }) => {
    const msdConc = invert4PL(msdFit.params, signal);
    const legacyConc = legacyPredictor.predict(signal);
    const percentDiff = ((msdConc - legacyConc) / legacyConc) * 100;
    console.log(
      `${well}\t${signal}\t${msdConc.toFixed(3)}\t\t${legacyConc.toFixed(3)}\t\t${percentDiff.toFixed(2)}%`
    );
  });

  const diffs = unknownSignals.map(({ signal }) => {
    const msdConc = invert4PL(msdFit.params, signal);
    const legacyConc = legacyPredictor.predict(signal);
    return ((msdConc - legacyConc) / legacyConc) * 100;
  });
  const meanDiff =
    diffs.reduce((sum, d) => sum + d, 0) / (diffs.length || 1);
  const maxDiff = Math.max(...diffs.map(Math.abs));

  console.log('\nSummary:');
  console.log(`  Mean % difference: ${meanDiff.toFixed(2)}%`);
  console.log(`  Max |% difference|: ${maxDiff.toFixed(2)}%`);
}

compareModels();

