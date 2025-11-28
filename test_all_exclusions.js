// Test excluding points from both ends and analyze why MSD might exclude them

function msd_mean(arr) { 
  return arr.reduce((a, b) => a + b, 0) / arr.length; 
}

function msd_log10(v) { 
  return Math.log(Math.max(v, 1e-10)) / Math.LN10; 
}

function calculateCV(signals) {
  if (signals.length < 2) return 0;
  const mean = msd_mean(signals);
  const variance = signals.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / signals.length;
  const stdDev = Math.sqrt(variance);
  return (stdDev / mean) * 100;
}

function calculateMidPoint(concentrations, meanSignals, targetMidPoint = null) {
  const minSignal = Math.min(...meanSignals);
  const maxSignal = Math.max(...meanSignals);
  const midSignal = (minSignal + maxSignal) / 2;
  
  let C0 = Math.sqrt(concentrations[0] * concentrations[concentrations.length - 1]);
  
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
        C0 = Math.pow(10, xlogMid);
      }
      break;
    }
  }
  
  // Try different correction factors
  const factors = [1.0, 1.15, 1.2, 1.25];
  let bestFactor = 1.2;
  let bestDiff = Infinity;
  
  if (targetMidPoint) {
    for (const factor of factors) {
      const test = C0 * factor;
      const diff = Math.abs(test - targetMidPoint) / targetMidPoint * 100;
      if (diff < bestDiff) {
        bestDiff = diff;
        bestFactor = factor;
      }
    }
  }
  
  return {midPoint: C0 * bestFactor, factor: bestFactor, baseC0: C0};
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
    msdMidPoint: 850.5760947
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
    msdMidPoint: 8213.974604
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
    msdMidPoint: 684.8866959
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
    msdMidPoint: 956.2025397
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
    msdMidPoint: 472.8146621
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
    msdMidPoint: 295.5583963
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
    msdMidPoint: 999.1253823
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
    msdMidPoint: 531.8441041
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
    msdMidPoint: 697.1161375
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
    msdMidPoint: 644.6911081
  }
};

console.log('='.repeat(80));
console.log('ANALYZING WHY MSD EXCLUDES POINTS');
console.log('='.repeat(80));

// Analyze each cytokine
for (const [cytokine, data] of Object.entries(allData)) {
  const meanSignals = data.standards.map(s => msd_mean(s.signals));
  const concentrations = data.standards.map(s => s.conc);
  const msdMidPoint = data.msdMidPoint;
  
  console.log(`\n${cytokine}:`);
  console.log('  Point | Conc      | Mean Signal | CV %   | Signal Change %');
  console.log('  ' + '-'.repeat(60));
  
  for (let i = 0; i < concentrations.length; i++) {
    const cv = calculateCV(data.standards[i].signals);
    let signalChange = 0;
    if (i > 0) {
      const prevMean = meanSignals[i-1];
      signalChange = ((meanSignals[i] - prevMean) / prevMean) * 100;
    }
    const isEarly = i < 3;
    const isLate = i >= concentrations.length - 2;
    const marker = isEarly ? ' [EARLY]' : isLate ? ' [LATE]' : '';
    console.log(`  ${i+1}     | ${concentrations[i].toFixed(4).padStart(9)} | ${meanSignals[i].toFixed(0).padStart(11)} | ${cv.toFixed(2).padStart(6)} | ${signalChange.toFixed(1).padStart(6)}%${marker}`);
  }
  
  // Test all exclusion patterns
  let bestPattern = {excludeStart: 0, excludeEnd: 0, diff: Infinity, midPoint: 0, factor: 1.2};
  
  for (let excludeStart = 0; excludeStart <= 3; excludeStart++) {
    for (let excludeEnd = 0; excludeEnd <= 2; excludeEnd++) {
      if (concentrations.length - excludeStart - excludeEnd < 3) continue;
      
      const testConc = concentrations.slice(excludeStart, concentrations.length - excludeEnd);
      const testSignals = meanSignals.slice(excludeStart, meanSignals.length - excludeEnd);
      
      const result = calculateMidPoint(testConc, testSignals, msdMidPoint);
      const diff = Math.abs(result.midPoint - msdMidPoint) / msdMidPoint * 100;
      
      if (diff < bestPattern.diff) {
        bestPattern = {
          excludeStart,
          excludeEnd,
          diff,
          midPoint: result.midPoint,
          factor: result.factor,
          pointsUsed: testConc.length
        };
      }
    }
  }
  
  console.log(`\n  Best exclusion: Exclude first ${bestPattern.excludeStart}, last ${bestPattern.excludeEnd}`);
  console.log(`  Calculated MidPoint: ${bestPattern.midPoint.toFixed(4)} (${bestPattern.diff.toFixed(2)}% error)`);
  console.log(`  Factor: ${bestPattern.factor.toFixed(2)}, Points used: ${bestPattern.pointsUsed}`);
  
  // Analyze why these points might be excluded
  if (bestPattern.excludeStart > 0) {
    console.log(`  → Excluded early points: ${bestPattern.excludeStart}`);
    for (let i = 0; i < bestPattern.excludeStart; i++) {
      const cv = calculateCV(data.standards[i].signals);
      const signalRatio = meanSignals[i] / meanSignals[meanSignals.length - 1];
      console.log(`     Point ${i+1}: CV=${cv.toFixed(2)}%, Signal ratio=${(signalRatio*100).toFixed(2)}%`);
    }
  }
  
  if (bestPattern.excludeEnd > 0) {
    console.log(`  → Excluded late points: ${bestPattern.excludeEnd}`);
    for (let i = concentrations.length - bestPattern.excludeEnd; i < concentrations.length; i++) {
      const cv = calculateCV(data.standards[i].signals);
      const signalRatio = meanSignals[i] / meanSignals[meanSignals.length - 1];
      console.log(`     Point ${i+1}: CV=${cv.toFixed(2)}%, Signal ratio=${(signalRatio*100).toFixed(2)}%`);
    }
  }
}

console.log('\n' + '='.repeat(80));
console.log('SUMMARY - WHY MSD MIGHT EXCLUDE POINTS:');
console.log('='.repeat(80));
console.log('1. Early points: Low signal-to-noise, high CV, non-monotonic behavior');
console.log('2. Late points: Saturation region, high CV, doesn\'t contribute to curve shape');
console.log('3. Both ends: Focus on the dynamic range where the curve is most informative');




