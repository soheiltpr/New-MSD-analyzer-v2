// Test different Bottom formulas

const testCases = [
  {zero: [119, 98], msd: 97.65},
  {zero: [152, 144], msd: 133.2},
  {zero: [133, 108], msd: 108.45},
  {zero: [162, 190], msd: 158.4},
  {zero: [175, 150], msd: 146.25},
  {zero: [107, 77], msd: 82.8},
  {zero: [132, 143], msd: 123.75},
  {zero: [101, 211], msd: 140.4},
  {zero: [109, 135], msd: 109.8},
  {zero: [119, 255], msd: 168.3}
];

function msd_mean(arr) { 
  return arr.reduce((a, b) => a + b, 0) / arr.length; 
}

console.log('Testing Bottom (A0) formulas:');
console.log('='.repeat(80));

// Test various formulas
const formulas = [
  {name: 'zeroMean * 0.9', fn: (zm) => zm * 0.9},
  {name: 'zeroMean * 0.8889', fn: (zm) => zm * (8/9)},
  {name: 'zeroMean * 0.88', fn: (zm) => zm * 0.88},
  {name: 'zeroMean * 0.875', fn: (zm) => zm * 0.875},
  {name: 'zeroMean - (zeroMean * 0.1)', fn: (zm) => zm * 0.9},
  {name: 'zeroMean - (zeroMean / 9)', fn: (zm) => zm * (8/9)},
  {name: 'zeroMean * 0.89', fn: (zm) => zm * 0.89},
  {name: 'zeroMean * 0.895', fn: (zm) => zm * 0.895},
];

for (const formula of formulas) {
  let totalDiff = 0;
  let maxDiff = 0;
  let matches = 0;
  
  console.log(`\n${formula.name}:`);
  for (let i = 0; i < testCases.length; i++) {
    const zeroMean = msd_mean(testCases[i].zero);
    const msd = testCases[i].msd;
    const calculated = formula.fn(zeroMean);
    const diff = Math.abs(calculated - msd);
    totalDiff += diff;
    maxDiff = Math.max(maxDiff, diff);
    if (diff < 2) matches++;
    
    console.log(`  Case ${i+1}: ZeroMean=${zeroMean.toFixed(2)}, MSD=${msd.toFixed(2)}, Calc=${calculated.toFixed(2)}, Diff=${diff.toFixed(4)}`);
  }
  console.log(`  Average diff: ${(totalDiff/10).toFixed(4)}, Max diff: ${maxDiff.toFixed(4)}, Matches (<2): ${matches}/10`);
}

// Try to find the exact multiplier
console.log('\n' + '='.repeat(80));
console.log('Finding exact multiplier for each case:');
console.log('-'.repeat(80));
for (let i = 0; i < testCases.length; i++) {
  const zeroMean = msd_mean(testCases[i].zero);
  const msd = testCases[i].msd;
  const multiplier = msd / zeroMean;
  console.log(`Case ${i+1}: ZeroMean=${zeroMean.toFixed(2)}, MSD=${msd.toFixed(2)}, Multiplier=${multiplier.toFixed(6)}`);
}

const avgMultiplier = testCases.reduce((sum, tc, i) => {
  const zeroMean = msd_mean(tc.zero);
  return sum + (tc.msd / zeroMean);
}, 0) / testCases.length;

console.log(`\nAverage multiplier: ${avgMultiplier.toFixed(6)}`);
console.log(`As fraction: ~${Math.round(avgMultiplier * 1000)/1000}`);




