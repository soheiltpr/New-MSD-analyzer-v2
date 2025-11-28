// Find exact formulas for initial parameter estimation

function msd_mean(arr) { 
  return arr.reduce((a, b) => a + b, 0) / arr.length; 
}

function msd_log10(v) { 
  return Math.log(Math.max(v, 1e-10)) / Math.LN10; 
}

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
    msdInitial: {Top: 1816103.22, Bottom: 97.65, MidPoint: 850.5760947}
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
    msdInitial: {Top: 1045016.7, Bottom: 133.2, MidPoint: 8213.974604}
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
    msdInitial: {Top: 848730.27, Bottom: 108.45, MidPoint: 684.8866959}
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
    msdInitial: {Top: 1366300.225, Bottom: 158.4, MidPoint: 956.2025397}
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
    msdInitial: {Top: 224728.03, Bottom: 146.25, MidPoint: 472.8146621}
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
    msdInitial: {Top: 1436146.27, Bottom: 82.8, MidPoint: 295.5583963}
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
    msdInitial: {Top: 889462.56, Bottom: 123.75, MidPoint: 999.1253823}
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
    msdInitial: {Top: 619028.495, Bottom: 140.4, MidPoint: 531.8441041}
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
    msdInitial: {Top: 865087.725, Bottom: 109.8, MidPoint: 697.1161375}
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
    msdInitial: {Top: 991610.93, Bottom: 168.3, MidPoint: 644.6911081}
  }
};

console.log('='.repeat(80));
console.log('FINDING EXACT FORMULAS FOR INITIAL PARAMETERS');
console.log('='.repeat(80));

// Test Bottom formula: zeroMean * (8/9) = zeroMean * 0.888888...
console.log('\n1. BOTTOM (A0) FORMULA:');
console.log('-'.repeat(80));
let bottomMatches = 0;
for (const [cytokine, data] of Object.entries(allData)) {
  const zeroMean = msd_mean(data.zero);
  const msdBottom = data.msdInitial.Bottom;
  
  // Test: zeroMean * (8/9)
  const testBottom = zeroMean * (8/9);
  const diff = Math.abs(testBottom - msdBottom);
  const match = diff < 0.1;
  if (match) bottomMatches++;
  
  console.log(`${cytokine.padEnd(8)}: ZeroMean=${zeroMean.toFixed(2)}, MSD=${msdBottom.toFixed(2)}, Formula=${testBottom.toFixed(2)}, Diff=${diff.toFixed(4)} ${match ? '✓' : '✗'}`);
}
console.log(`\nBottom formula matches: ${bottomMatches}/10`);

// Test Top formula: maxMeanSignal * 1.01 (or similar)
console.log('\n2. TOP (D0) FORMULA:');
console.log('-'.repeat(80));
let topMatches = 0;
for (const [cytokine, data] of Object.entries(allData)) {
  const meanSignals = data.standards.map(s => msd_mean(s.signals));
  const maxMeanSignal = Math.max(...meanSignals);
  const msdTop = data.msdInitial.Top;
  
  // Test: maxMeanSignal * 1.01
  const testTop = maxMeanSignal * 1.01;
  const diff = Math.abs(testTop - msdTop) / msdTop * 100;
  const match = diff < 0.5;
  if (match) topMatches++;
  
  console.log(`${cytokine.padEnd(8)}: MaxMean=${maxMeanSignal.toFixed(2)}, MSD=${msdTop.toFixed(2)}, Formula=${testTop.toFixed(2)}, Diff=${diff.toFixed(3)}% ${match ? '✓' : '✗'}`);
}
console.log(`\nTop formula matches: ${topMatches}/10`);

// Test MidPoint - try different methods
console.log('\n3. MIDPOINT (C0) FORMULA:');
console.log('-'.repeat(80));

for (const [cytokine, data] of Object.entries(allData)) {
  const meanSignals = data.standards.map(s => msd_mean(s.signals));
  const concentrations = data.standards.map(s => s.conc);
  const minMeanSignal = Math.min(...meanSignals);
  const maxMeanSignal = Math.max(...meanSignals);
  const msdMidPoint = data.msdInitial.MidPoint;
  
  // Method 1: Interpolation at (min + max) / 2
  const midSignal = (minMeanSignal + maxMeanSignal) / 2;
  let interpMidPoint = Math.sqrt(concentrations[0] * concentrations[concentrations.length - 1]);
  
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
        interpMidPoint = Math.pow(10, xlogMid);
      }
      break;
    }
  }
  
  // Method 2: Geometric mean of first and last
  const geoMean = Math.sqrt(concentrations[0] * concentrations[concentrations.length - 1]);
  
  // Method 3: Median concentration
  const medianConc = concentrations[Math.floor(concentrations.length / 2)];
  
  const interpDiff = Math.abs(interpMidPoint - msdMidPoint) / msdMidPoint * 100;
  const geoDiff = Math.abs(geoMean - msdMidPoint) / msdMidPoint * 100;
  const medianDiff = Math.abs(medianConc - msdMidPoint) / msdMidPoint * 100;
  
  console.log(`${cytokine.padEnd(8)}: MSD=${msdMidPoint.toFixed(4)}`);
  console.log(`         Interp: ${interpMidPoint.toFixed(4)} (${interpDiff.toFixed(2)}%)`);
  console.log(`         GeoMean: ${geoMean.toFixed(4)} (${geoDiff.toFixed(2)}%)`);
  console.log(`         Median: ${medianConc.toFixed(4)} (${medianDiff.toFixed(2)}%)`);
  console.log('');
}




