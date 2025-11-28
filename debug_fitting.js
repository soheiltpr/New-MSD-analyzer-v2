// Debug the fitting process

function msd_mean(arr) { 
  return arr.reduce((a, b) => a + b, 0) / arr.length; 
}

function msd_log10(v) { 
  return Math.log(Math.max(v, 1e-10)) / Math.LN10; 
}

function msd_y4pl_logx(params, xlog) {
  const {A, D, Clog, B} = params;
  const t = Math.pow(10, (xlog - Clog));
  return A + (D - A) / (1 + Math.pow(t, B));
}

// Test with GM-CSF data
const gmcsf = {
  zero: [97, 126],
  standards: [
    {conc: 1.127929688, signals: [1565, 1539]},
    {conc: 4.51171875, signals: [5608, 5499]},
    {conc: 18.046875, signals: [21685, 21238]},
    {conc: 72.1875, signals: [84356, 81394]},
    {conc: 288.75, signals: [316293, 303440]},
    {conc: 1155, signals: [1187641, 1120800]},
    {conc: 4620, signals: [1783080, 1866816]}
  ]
};

const zeroMean = msd_mean(gmcsf.zero);
const meanSignals = gmcsf.standards.map(s => msd_mean(s.signals));
const concentrations = gmcsf.standards.map(s => s.conc);

console.log('GM-CSF Data:');
console.log('Zero mean:', zeroMean);
console.log('Concentrations:', concentrations);
console.log('Mean Signals:', meanSignals);
console.log('');

// Calculate initial guesses
const A0 = zeroMean * 0.9;
const D0 = Math.max(...meanSignals) * 1.01;
const B0 = 1.0;

console.log('Initial Guesses:');
console.log('A0 (Bottom):', A0);
console.log('D0 (Top):', D0);
console.log('B0 (HillSlope):', B0);
console.log('');

// Check if Top > Bottom
if (D0 <= A0) {
  console.log('ERROR: Top <= Bottom!');
} else {
  console.log('✓ Top > Bottom');
}

// Check signal range
console.log('Signal range:', Math.min(...meanSignals), 'to', Math.max(...meanSignals));
console.log('Signal ratio (max/min):', Math.max(...meanSignals) / Math.min(...meanSignals));

// Test a simple MidPoint calculation
const minSignal = Math.min(...meanSignals);
const maxSignal = Math.max(...meanSignals);
const midSignal = (minSignal + maxSignal) / 2;
console.log('Mid signal:', midSignal);

// Find which points bracket the mid signal
for (let i = 0; i < meanSignals.length - 1; i++) {
  if ((meanSignals[i] <= midSignal && meanSignals[i+1] >= midSignal) || 
      (meanSignals[i] >= midSignal && meanSignals[i+1] <= midSignal)) {
    const y1 = meanSignals[i];
    const y2 = meanSignals[i+1];
    const x1 = msd_log10(concentrations[i]);
    const x2 = msd_log10(concentrations[i+1]);
    const fraction = (midSignal - y1) / (y2 - y1);
    const xlogMid = x1 + fraction * (x2 - x1);
    const C0 = Math.pow(10, xlogMid);
    console.log(`Interpolated C0: ${C0.toFixed(4)} (between points ${i+1} and ${i+2})`);
    break;
  }
}

// Test if the curve makes sense
console.log('');
console.log('Testing curve shape:');
const testParams = {A: A0, D: D0, Clog: msd_log10(concentrations[3]), B: B0};
const xlog = concentrations.map(c => msd_log10(c));
const predicted = xlog.map(x => msd_y4pl_logx(testParams, x));
console.log('Predicted signals with test params:');
for (let i = 0; i < concentrations.length; i++) {
  console.log(`  Conc ${concentrations[i].toFixed(2)}: Observed=${meanSignals[i].toFixed(0)}, Predicted=${predicted[i].toFixed(0)}`);
}




