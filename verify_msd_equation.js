// Verify the exact equation MSD uses by testing with their known parameters

function msd_log10(v) { 
  return Math.log(Math.max(v, 1e-10)) / Math.LN10; 
}

// Test different equation forms
function test1(params, xlog) {
  // y = A + (D - A) / (1 + 10^((xlog - Clog) * B))
  const {A, D, Clog, B} = params;
  const t = Math.pow(10, (xlog - Clog) * B);
  return A + (D - A) / (1 + t);
}

function test2(params, xlog) {
  // y = A + (D - A) / (1 + (10^(xlog - Clog))^B)
  const {A, D, Clog, B} = params;
  const t = Math.pow(10, (xlog - Clog));
  return A + (D - A) / (1 + Math.pow(t, B));
}

function test3(params, xlog) {
  // y = A + (D - A) / (1 + 10^((Clog - xlog) * B))
  const {A, D, Clog, B} = params;
  const t = Math.pow(10, (Clog - xlog) * B);
  return A + (D - A) / (1 + t);
}

function test4(params, xlog) {
  // y = A + (D - A) / (1 + (10^(Clog - xlog))^B)
  const {A, D, Clog, B} = params;
  const t = Math.pow(10, (Clog - xlog));
  return A + (D - A) / (1 + Math.pow(t, B));
}

// GM-CSF data
const concentrations = [1.127929688, 4.51171875, 18.046875, 72.1875, 288.75, 1155, 4620];
const meanSignals = [1552, 5553.5, 21461.5, 82875, 309866.5, 1154220.5, 1824948];

// MSD's final parameters
const msdParams = {
  A: 111.8709399,  // Bottom
  D: 2872984.579,  // Top
  Clog: msd_log10(2272.194663),
  B: 1.006124995
};

const xlog = concentrations.map(c => msd_log10(c));

console.log('Testing different equation forms with MSD GM-CSF parameters:');
console.log('A (Bottom):', msdParams.A);
console.log('D (Top):', msdParams.D);
console.log('C (MidPoint):', Math.pow(10, msdParams.Clog));
console.log('B (HillSlope):', msdParams.B);
console.log('');

const tests = [
  {name: 'Test 1: t = 10^((xlog-Clog)*B)', fn: test1},
  {name: 'Test 2: t = (10^(xlog-Clog))^B', fn: test2},
  {name: 'Test 3: t = 10^((Clog-xlog)*B)', fn: test3},
  {name: 'Test 4: t = (10^(Clog-xlog))^B', fn: test4}
];

for (const test of tests) {
  console.log(test.name + ':');
  let totalError = 0;
  for (let i = 0; i < concentrations.length; i++) {
    const pred = test.fn(msdParams, xlog[i]);
    const error = Math.abs(pred - meanSignals[i]) / meanSignals[i] * 100;
    totalError += error;
    if (i < 3 || i >= concentrations.length - 2) {
      console.log(`  Conc ${concentrations[i].toFixed(2)}: Observed=${meanSignals[i].toFixed(0)}, Predicted=${pred.toFixed(0)}, Error=${error.toFixed(1)}%`);
    }
  }
  console.log(`  Average error: ${(totalError/concentrations.length).toFixed(2)}%`);
  console.log('');
}




