// Test if MSD swaps A and D (A=Top, D=Bottom)

function msd_log10(v) { 
  return Math.log(Math.max(v, 1e-10)) / Math.LN10; 
}

// Original: y = A + (D - A) / (1 + t^B) where A=Bottom, D=Top, t = 10^(xlog - Clog)
function msd_y4pl_original(params, xlog) {
  const {A, D, Clog, B} = params;
  const t = Math.pow(10, (xlog - Clog));
  return A + (D - A) / (1 + Math.pow(t, B));
}

// Swapped: y = D + (A - D) / (1 + t^B) where A=Top, D=Bottom, t = 10^(xlog - Clog)
function msd_y4pl_swapped(params, xlog) {
  const {A, D, Clog, B} = params;
  const t = Math.pow(10, (xlog - Clog));
  return D + (A - D) / (1 + Math.pow(t, B));
}

// Test with GM-CSF
const concentrations = [1.127929688, 4.51171875, 18.046875, 72.1875, 288.75, 1155, 4620];
const meanSignals = [1552, 5553.5, 21461.5, 82875, 309866.5, 1154220.5, 1824948];

// MSD's final parameters for GM-CSF
const msdParams = {
  A: 111.8709399,  // MSD calls this "Bottom"
  D: 2872984.579,  // MSD calls this "Top"
  Clog: msd_log10(2272.194663),
  B: 1.006124995
};

console.log('Testing with MSD GM-CSF parameters:');
console.log('A (MSD Bottom):', msdParams.A);
console.log('D (MSD Top):', msdParams.D);
console.log('C (MidPoint):', Math.pow(10, msdParams.Clog));
console.log('B (HillSlope):', msdParams.B);
console.log('');

const xlog = concentrations.map(c => msd_log10(c));

console.log('Original equation (A=Bottom, D=Top):');
for (let i = 0; i < concentrations.length; i++) {
  const pred = msd_y4pl_original(msdParams, xlog[i]);
  console.log(`  Conc ${concentrations[i].toFixed(2)}: Observed=${meanSignals[i].toFixed(0)}, Predicted=${pred.toFixed(0)}`);
}

console.log('');
console.log('Swapped equation (A=Top, D=Bottom):');
const swappedParams = {A: msdParams.D, D: msdParams.A, Clog: msdParams.Clog, B: msdParams.B};
for (let i = 0; i < concentrations.length; i++) {
  const pred = msd_y4pl_swapped(swappedParams, xlog[i]);
  console.log(`  Conc ${concentrations[i].toFixed(2)}: Observed=${meanSignals[i].toFixed(0)}, Predicted=${pred.toFixed(0)}`);
}




