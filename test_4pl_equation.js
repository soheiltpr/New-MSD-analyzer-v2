// Test the 4PL equation to see if it's correct

function msd_log10(v) { 
  return Math.log(Math.max(v, 1e-10)) / Math.LN10; 
}

// Current equation
function msd_y4pl_logx_current(params, xlog) {
  const {A, D, Clog, B} = params;
  const t = Math.pow(10, (xlog - Clog));
  return A + (D - A) / (1 + Math.pow(t, B));
}

// Alternative equation (reversed)
function msd_y4pl_logx_reversed(params, xlog) {
  const {A, D, Clog, B} = params;
  const t = Math.pow(10, (Clog - xlog));  // Note: Clog - xlog instead of xlog - Clog
  return A + (D - A) / (1 + Math.pow(t, B));
}

// Test with GM-CSF data
const concentrations = [1.127929688, 4.51171875, 18.046875, 72.1875, 288.75, 1155, 4620];
const meanSignals = [1552, 5553.5, 21461.5, 82875, 309866.5, 1154220.5, 1824948];

const A = 100.35;  // Bottom
const D = 1843197.48;  // Top
const Clog = msd_log10(777.6);  // MidPoint
const B = 1.0;  // HillSlope

const params = {A, D, Clog, B};

console.log('Testing 4PL equations:');
console.log('A (Bottom):', A);
console.log('D (Top):', D);
console.log('C (MidPoint):', Math.pow(10, Clog));
console.log('B (HillSlope):', B);
console.log('');

console.log('Current equation (t = 10^(xlog - Clog)):');
const xlog = concentrations.map(c => msd_log10(c));
for (let i = 0; i < concentrations.length; i++) {
  const pred = msd_y4pl_logx_current(params, xlog[i]);
  console.log(`  Conc ${concentrations[i].toFixed(2)}: Observed=${meanSignals[i].toFixed(0)}, Predicted=${pred.toFixed(0)}`);
}

console.log('');
console.log('Reversed equation (t = 10^(Clog - xlog)):');
for (let i = 0; i < concentrations.length; i++) {
  const pred = msd_y4pl_logx_reversed(params, xlog[i]);
  console.log(`  Conc ${concentrations[i].toFixed(2)}: Observed=${meanSignals[i].toFixed(0)}, Predicted=${pred.toFixed(0)}`);
}

console.log('');
console.log('For an INCREASING curve:');
console.log('  Low concentration → Low signal (should be near A/Bottom)');
console.log('  High concentration → High signal (should be near D/Top)');
console.log('');
console.log('Which equation gives this behavior?');




