// Analyze all cytokines to find the universal algorithm for initial guesses

function msd_mean(arr) { 
  return arr.reduce((a, b) => a + b, 0) / arr.length; 
}

function msd_log10(v) { 
  return Math.log(Math.max(v, 1e-10)) / Math.LN10; 
}

// Data for all cytokines
const allData = {
  'GM-CSF': {
    zero: [119, 98],
    standards: [
      {conc: 1.127929688, signals: [1658, 1591]},
      {conc: 4.51171875, signals: [6241, 5432]},
      {conc: 18.046875, signals: [19341, 21411]},
      {conc: 72.1875, signals: [93083, 77758]},
      {conc: 288.75, signals: [301744, 305792]},
      {conc: 1155, signals: [1342780, 1100625]},
      {conc: 4620, signals: [1759497, 1836747]}
    ],
    msdInitial: {Top: 1816103.22, Bottom: 97.65, MidPoint: 850.5760947, HillSlope: 1}
  },
  'IFN-γ': {
    zero: [152, 144],
    standards: [
      {conc: 3.918457031, signals: [395, 427]},
      {conc: 15.67382813, signals: [1082, 1001]},
      {conc: 62.6953125, signals: [3323, 3386]},
      {conc: 250.78125, signals: [14635, 13093]},
      {conc: 1003.125, signals: [53023, 53393]},
      {conc: 4012.5, signals: [245154, 234980]},
      {conc: 16050, signals: [1043736, 1025604]}
    ],
    msdInitial: {Top: 1045016.7, Bottom: 133.2, MidPoint: 8213.974604, HillSlope: 1}
  },
  'IL-10': {
    zero: [133, 108],
    standards: [
      {conc: 0.491943359, signals: [703, 673]},
      {conc: 1.967773438, signals: [1993, 2026]},
      {conc: 7.87109375, signals: [7803, 7321]},
      {conc: 31.484375, signals: [30565, 28324]},
      {conc: 125.9375, signals: [111027, 105891]},
      {conc: 503.75, signals: [374657, 351370]},
      {conc: 2015, signals: [872573, 808081]}
    ],
    msdInitial: {Top: 848730.27, Bottom: 108.45, MidPoint: 684.8866959, HillSlope: 1}
  },
  'IL-1β': {
    zero: [162, 190],
    standards: [
      {conc: 0.541992188, signals: [818, 729]},
      {conc: 2.16796875, signals: [2593, 2288]},
      {conc: 8.671875, signals: [9093, 8451]},
      {conc: 34.6875, signals: [37320, 32028]},
      {conc: 138.75, signals: [128877, 124146]},
      {conc: 555, signals: [481817, 441739]},
      {conc: 2220, signals: [1408822, 1296723]}
    ],
    msdInitial: {Top: 1366300.225, Bottom: 158.4, MidPoint: 956.2025397, HillSlope: 1}
  },
  'IL-2': {
    zero: [175, 150],
    standards: [
      {conc: 0.230712891, signals: [247, 217]},
      {conc: 0.922851563, signals: [384, 369]},
      {conc: 3.69140625, signals: [945, 922]},
      {conc: 14.765625, signals: [3596, 3173]},
      {conc: 59.0625, signals: [13072, 12889]},
      {conc: 236.25, signals: [58569, 52704]},
      {conc: 945, signals: [231142, 213864]}
    ],
    msdInitial: {Top: 224728.03, Bottom: 146.25, MidPoint: 472.8146621, HillSlope: 1}
  },
  'IL-4': {
    zero: [107, 77],
    standards: [
      {conc: 0.201416016, signals: [773, 830]},
      {conc: 0.805664063, signals: [2990, 2443]},
      {conc: 3.22265625, signals: [6213, 9869]},
      {conc: 12.890625, signals: [36929, 35910]},
      {conc: 51.5625, signals: [142259, 152031]},
      {conc: 206.25, signals: [607306, 574872]},
      {conc: 825, signals: [1407350, 1436504]}
    ],
    msdInitial: {Top: 1436146.27, Bottom: 82.8, MidPoint: 295.5583963, HillSlope: 1}
  },
  'IL-5': {
    zero: [132, 143],
    standards: [
      {conc: 0.522460938, signals: [452, 457]},
      {conc: 2.08984375, signals: [1299, 1237]},
      {conc: 8.359375, signals: [4564, 4486]},
      {conc: 33.4375, signals: [18185, 17361]},
      {conc: 133.75, signals: [68551, 67657]},
      {conc: 535, signals: [261861, 260724]},
      {conc: 2140, signals: [902341, 858971]}
    ],
    msdInitial: {Top: 889462.56, Bottom: 123.75, MidPoint: 999.1253823, HillSlope: 1}
  },
  'IL-6': {
    zero: [101, 211],
    standards: [
      {conc: 0.25390625, signals: [230, 201]},
      {conc: 1.015625, signals: [599, 529]},
      {conc: 4.0625, signals: [1761, 1794]},
      {conc: 16.25, signals: [7888, 6702]},
      {conc: 65, signals: [30472, 28715]},
      {conc: 260, signals: [154951, 130310]},
      {conc: 1040, signals: [645084, 580715]}
    ],
    msdInitial: {Top: 619028.495, Bottom: 140.4, MidPoint: 531.8441041, HillSlope: 1}
  },
  'MCP-1': {
    zero: [109, 135],
    standards: [
      {conc: 0.659179688, signals: [412, 429]},
      {conc: 2.63671875, signals: [1247, 1223]},
      {conc: 10.546875, signals: [4595, 4391]},
      {conc: 42.1875, signals: [21770, 19334]},
      {conc: 168.75, signals: [109654, 103190]},
      {conc: 675, signals: [443179, 404009]},
      {conc: 2700, signals: [877523, 835522]}
    ],
    msdInitial: {Top: 865087.725, Bottom: 109.8, MidPoint: 697.1161375, HillSlope: 1}
  },
  'TNF-α': {
    zero: [119, 255],
    standards: [
      {conc: 0.330810547, signals: [473, 421]},
      {conc: 1.323242188, signals: [1299, 1152]},
      {conc: 5.29296875, signals: [4618, 4352]},
      {conc: 21.171875, signals: [19393, 16579]},
      {conc: 84.6875, signals: [68954, 67522]},
      {conc: 338.75, signals: [289520, 269667]},
      {conc: 1355, signals: [1016100, 947486]}
    ],
    msdInitial: {Top: 991610.93, Bottom: 168.3, MidPoint: 644.6911081, HillSlope: 1}
  }
};

console.log('='.repeat(80));
console.log('ANALYZING INITIAL PARAMETER ESTIMATION ALGORITHM');
console.log('='.repeat(80));

const results = [];

for (const [cytokine, data] of Object.entries(allData)) {
  // Calculate means
  const zeroMean = msd_mean(data.zero);
  const allSignals = data.standards.flatMap(s => s.signals);
  const meanSignals = data.standards.map(s => msd_mean(s.signals));
  const concentrations = data.standards.map(s => s.conc);
  
  const minSignal = Math.min(...allSignals);
  const maxSignal = Math.max(...allSignals);
  const minMeanSignal = Math.min(...meanSignals);
  const maxMeanSignal = Math.max(...meanSignals);
  
  // Calculate midpoint signal
  const midSignal = (minMeanSignal + maxMeanSignal) / 2;
  
  // Find concentration at midpoint signal by interpolation
  let estimatedMidPoint = Math.sqrt(concentrations[0] * concentrations[concentrations.length - 1]);
  
  for (let i = 0; i < meanSignals.length - 1; i++) {
    if ((meanSignals[i] <= midSignal && meanSignals[i+1] >= midSignal) || 
        (meanSignals[i] >= midSignal && meanSignals[i+1] <= midSignal)) {
      const y1 = meanSignals[i];
      const y2 = meanSignals[i+1];
      const x1 = msd_log10(concentrations[i]);
      const x2 = msd_log10(concentrations[i+1]);
      if (Math.abs(y2 - y1) > 1e-6) {
        const fraction = (midSignal - y1) / (y2 - y1);
        const xlogMid = x1 + fraction * (x2 - x1);
        estimatedMidPoint = Math.pow(10, xlogMid);
      }
      break;
    }
  }
  
  // Compare with MSD
  const msd = data.msdInitial;
  
  // Calculate differences
  const topDiff = Math.abs(maxMeanSignal - msd.Top) / msd.Top * 100;
  const bottomDiff = Math.abs(zeroMean - msd.Bottom) / msd.Bottom * 100;
  const midPointDiff = Math.abs(estimatedMidPoint - msd.MidPoint) / msd.MidPoint * 100;
  
  results.push({
    cytokine,
    zeroMean,
    minMeanSignal,
    maxMeanSignal,
    estimatedMidPoint,
    msdTop: msd.Top,
    msdBottom: msd.Bottom,
    msdMidPoint: msd.MidPoint,
    topDiff,
    bottomDiff,
    midPointDiff
  });
  
  console.log(`\n${cytokine}:`);
  console.log(`  Zero mean: ${zeroMean.toFixed(2)} | MSD Bottom: ${msd.Bottom.toFixed(2)} | Diff: ${bottomDiff.toFixed(2)}%`);
  console.log(`  Max mean: ${maxMeanSignal.toFixed(2)} | MSD Top: ${msd.Top.toFixed(2)} | Diff: ${topDiff.toFixed(2)}%`);
  console.log(`  Est. MidPoint: ${estimatedMidPoint.toFixed(4)} | MSD MidPoint: ${msd.MidPoint.toFixed(4)} | Diff: ${midPointDiff.toFixed(2)}%`);
}

console.log('\n' + '='.repeat(80));
console.log('SUMMARY STATISTICS');
console.log('='.repeat(80));

const avgTopDiff = results.reduce((sum, r) => sum + r.topDiff, 0) / results.length;
const avgBottomDiff = results.reduce((sum, r) => sum + r.bottomDiff, 0) / results.length;
const avgMidPointDiff = results.reduce((sum, r) => sum + r.midPointDiff, 0) / results.length;

console.log(`Average Top difference: ${avgTopDiff.toFixed(2)}%`);
console.log(`Average Bottom difference: ${avgBottomDiff.toFixed(2)}%`);
console.log(`Average MidPoint difference: ${avgMidPointDiff.toFixed(2)}%`);

console.log('\n' + '='.repeat(80));
console.log('DETAILED COMPARISON TABLE');
console.log('='.repeat(80));
console.log('Cytokine  | Zero→Bottom | Max→Top | EstMid→MSDMid');
console.log('-'.repeat(80));
results.forEach(r => {
  console.log(`${r.cytokine.padEnd(9)} | ${r.bottomDiff.toFixed(2).padStart(10)}% | ${r.topDiff.toFixed(2).padStart(7)}% | ${r.midPointDiff.toFixed(2).padStart(10)}%`);
});




