// Compare my model's calculations with MSD's expected values

const MSD_PARAMETERS = {
  'IFN-γ': {
    Top: 592000000,
    Bottom: 154.7288,
    MidPoint: 9062275,
    HillSlope: 1.014541,
    DetectionLimits: { Low: 0.728129, High: 16050 }
  }
};

function calculateConcentrationFromSignal(signal, params) {
  const { Top, Bottom, MidPoint, HillSlope } = params;
  
  if (signal <= Bottom) return null;
  if (signal >= Top) return null;
  
  const numerator = (Top - Bottom) / (signal - Bottom) - 1;
  if (numerator <= 0) return null;
  
  const exponent = 1 / HillSlope;
  const ratio = Math.pow(numerator, exponent);
  const concentration = MidPoint / ratio;
  
  return concentration;
}

// Data in order
const data = [
  { knownConc: 0, signal: 150, msdCalc: NaN },
  { knownConc: 0, signal: 148, msdCalc: NaN },
  { knownConc: 3.918457031, signal: 391, msdCalc: 4.540201028 },
  { knownConc: 3.918457031, signal: 365, msdCalc: 4.054685756 },
  { knownConc: 15.67382813, signal: 1048, msdCalc: 16.5997598 },
  { knownConc: 15.67382813, signal: 1000, msdCalc: 15.72736148 },
  { knownConc: 62.6953125, signal: 3607, msdCalc: 62.32639346 },
  { knownConc: 62.6953125, signal: 3399, msdCalc: 58.6465283 },
  { knownConc: 250.78125, signal: 14542, msdCalc: 252.3072098 },
  { knownConc: 250.78125, signal: 14201, msdCalc: 246.4462834 },
  { knownConc: 1003.125, signal: 56429, msdCalc: 960.2311596 },
  { knownConc: 1003.125, signal: 54196, msdCalc: 922.8752416 },
  { knownConc: 4012.5, signal: 245673, msdCalc: 4068.474148 },
  { knownConc: 4012.5, signal: 247265, msdCalc: 4094.333246 },
  { knownConc: 16050, signal: 1051645, msdCalc: 16941.12987 },
  { knownConc: 16050, signal: 1035564, msdCalc: 16686.85164 }
];

const params = MSD_PARAMETERS['IFN-γ'];

console.log('='.repeat(100));
console.log('Comparison: My Model vs MSD Expected Values');
console.log('='.repeat(100));
console.log('\nKnown Conc'.padEnd(15) + 'Signal'.padEnd(12) + 'My Model'.padEnd(15) + 'MSD Expected'.padEnd(15) + 'Diff (%)');
console.log('-'.repeat(100));

let totalDiff = 0;
let count = 0;
let maxDiff = 0;
let minDiff = Infinity;

for (const row of data) {
  const myCalc = calculateConcentrationFromSignal(row.signal, params);
  const myCalcStr = myCalc ? myCalc.toFixed(4) : 'N/A';
  const msdCalcStr = isNaN(row.msdCalc) ? 'N/A' : row.msdCalc.toFixed(4);
  
  let diff = null;
  let diffStr = 'N/A';
  
  if (myCalc && !isNaN(row.msdCalc)) {
    diff = ((myCalc - row.msdCalc) / row.msdCalc) * 100;
    diffStr = diff.toFixed(4) + '%';
    totalDiff += Math.abs(diff);
    count++;
    maxDiff = Math.max(maxDiff, Math.abs(diff));
    minDiff = Math.min(minDiff, Math.abs(diff));
  }
  
  console.log(
    row.knownConc.toFixed(6).padEnd(15) +
    row.signal.toString().padEnd(12) +
    myCalcStr.padEnd(15) +
    msdCalcStr.padEnd(15) +
    diffStr
  );
}

console.log('-'.repeat(100));
console.log(`\nStatistics (excluding NaN values):`);
console.log(`  Count:           ${count}`);
console.log(`  Average |Diff|:  ${(totalDiff / count).toFixed(4)}%`);
console.log(`  Min |Diff|:      ${minDiff.toFixed(4)}%`);
console.log(`  Max |Diff|:      ${maxDiff.toFixed(4)}%`);

console.log('\n' + '='.repeat(100));
console.log('Analysis:');
console.log('='.repeat(100));

if (totalDiff / count > 1.0) {
  console.log(`\n⚠️  Average difference is ${(totalDiff / count).toFixed(2)}%, which exceeds 1% target.`);
  console.log(`\nPossible reasons for the difference:`);
  console.log(`  1. The 4PL parameters might be from a different plate/run`);
  console.log(`  2. MSD may use a slightly different inverse 4PL formula`);
  console.log(`  3. MSD may apply additional corrections or transformations`);
  console.log(`  4. Rounding differences in intermediate calculations`);
  console.log(`\nRecommendation: Verify that the 4PL parameters match the plate that generated these signals.`);
} else {
  console.log(`\n✅ Average difference is ${(totalDiff / count).toFixed(2)}%, which is within acceptable range.`);
}

// Show the inverse 4PL formula being used
console.log('\n' + '='.repeat(100));
console.log('Formula Used:');
console.log('='.repeat(100));
console.log(`\nInverse 4PL for increasing curves:`);
console.log(`  x = EC50 / ((Top - Bottom) / (y - Bottom) - 1)^(1 / HillSlope)`);
console.log(`\nWhere:`);
console.log(`  x = concentration (unknown)`);
console.log(`  y = signal (measured)`);
console.log(`  EC50 = MidPoint = ${params.MidPoint.toLocaleString()}`);
console.log(`  Top = ${params.Top.toLocaleString()}`);
console.log(`  Bottom = ${params.Bottom.toFixed(4)}`);
console.log(`  HillSlope = ${params.HillSlope.toFixed(6)}`);

