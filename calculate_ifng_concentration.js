// Calculate concentration from signal using MSD 4PL parameters for IFN-γ
// Inverse 4PL equation for increasing curves:
// x = EC50 / ((top - bottom) / (y - bottom) - 1)^(1 / hillSlope)

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
  const { Top, Bottom, MidPoint, HillSlope, DetectionLimits } = params;
  
  // Check if signal is within valid range
  if (signal <= Bottom) {
    return {
      concentration: 0,
      flag: 'Below LLOQ (signal at or below bottom asymptote)',
      withinRange: false
    };
  }
  
  if (signal >= Top) {
    return {
      concentration: null,
      flag: 'Above ULOQ (signal at or above top asymptote)',
      withinRange: false
    };
  }
  
  // Calculate inverse 4PL
  const numerator = (Top - Bottom) / (signal - Bottom) - 1;
  
  if (numerator <= 0) {
    return {
      concentration: null,
      flag: 'Invalid calculation (numerator <= 0)',
      withinRange: false
    };
  }
  
  const exponent = 1 / HillSlope;
  const ratio = Math.pow(numerator, exponent);
  const concentration = MidPoint / ratio;
  
  // Check detection limits
  let flag = '';
  let withinRange = true;
  
  if (concentration < DetectionLimits.Low) {
    flag = 'Below LLOQ';
    withinRange = false;
  } else if (concentration > DetectionLimits.High) {
    flag = 'Above ULOQ';
    withinRange = false;
  } else {
    flag = 'Within range';
  }
  
  return {
    concentration,
    flag,
    withinRange,
    lloq: DetectionLimits.Low,
    uloq: DetectionLimits.High
  };
}

// Calculate for signal 245673
const signal = 245673;
const cytokine = 'IFN-γ';
const params = MSD_PARAMETERS[cytokine];

console.log('='.repeat(80));
console.log(`Calculating concentration for ${cytokine}`);
console.log('='.repeat(80));
console.log(`\n4PL Parameters:`);
console.log(`  Top:        ${params.Top.toLocaleString()}`);
console.log(`  Bottom:     ${params.Bottom.toFixed(4)}`);
console.log(`  MidPoint:   ${params.MidPoint.toLocaleString()}`);
console.log(`  HillSlope:  ${params.HillSlope.toFixed(6)}`);
console.log(`  LLOQ:       ${params.DetectionLimits.Low.toFixed(6)} pg/mL`);
console.log(`  ULOQ:       ${params.DetectionLimits.High.toFixed(2)} pg/mL`);

console.log(`\nInput Signal: ${signal.toLocaleString()}`);

const result = calculateConcentrationFromSignal(signal, params);

console.log('\n' + '='.repeat(80));
console.log('RESULT:');
console.log('='.repeat(80));
console.log(`\nCalculated Concentration: ${result.concentration ? result.concentration.toFixed(6) : 'N/A'} pg/mL`);
console.log(`Status: ${result.flag}`);
console.log(`Within Detection Range: ${result.withinRange ? 'Yes' : 'No'}`);

if (result.withinRange) {
  console.log(`\n✅ This concentration is within the valid detection range.`);
} else {
  console.log(`\n⚠️  This concentration is outside the valid detection range.`);
}

// Show calculation steps
console.log('\n' + '='.repeat(80));
console.log('Calculation Steps:');
console.log('='.repeat(80));

const { Top, Bottom, MidPoint, HillSlope } = params;

console.log(`\n1. Calculate numerator:`);
console.log(`   numerator = (Top - Bottom) / (Signal - Bottom) - 1`);
console.log(`   numerator = (${Top.toLocaleString()} - ${Bottom.toFixed(4)}) / (${signal.toLocaleString()} - ${Bottom.toFixed(4)}) - 1`);
const num = (Top - Bottom) / (signal - Bottom) - 1;
console.log(`   numerator = ${num.toFixed(6)}`);

console.log(`\n2. Calculate ratio:`);
console.log(`   ratio = numerator^(1/HillSlope)`);
console.log(`   ratio = ${num.toFixed(6)}^(1/${HillSlope.toFixed(6)})`);
const exponent = 1 / HillSlope;
const ratio = Math.pow(num, exponent);
console.log(`   ratio = ${num.toFixed(6)}^${exponent.toFixed(6)}`);
console.log(`   ratio = ${ratio.toFixed(6)}`);

console.log(`\n3. Calculate concentration:`);
console.log(`   concentration = MidPoint / ratio`);
console.log(`   concentration = ${MidPoint.toLocaleString()} / ${ratio.toFixed(6)}`);
console.log(`   concentration = ${result.concentration.toFixed(6)} pg/mL`);

console.log('\n' + '='.repeat(80));

// Also check if this signal is from the standard curve
console.log('\nNote: Signal 245673 appears in the standard curve data at:');
console.log('  Concentration: 4012.5 pg/mL');
console.log('  Replicate signals: [245673, 247265]');
console.log('  Mean signal: 246469');
console.log(`  Back-calculated: ${result.concentration.toFixed(2)} pg/mL`);
console.log(`  Expected: 4012.5 pg/mL`);
console.log(`  Difference: ${((result.concentration - 4012.5) / 4012.5 * 100).toFixed(4)}%`);

// Calculate for all the provided signals
console.log('\n' + '='.repeat(80));
console.log('Calculating concentrations for all provided signals:');
console.log('='.repeat(80));

const standardData = [
  { conc: 0, signals: [150, 148] },
  { conc: 3.918457031, signals: [391, 365] },
  { conc: 15.67382813, signals: [1048, 1000] },
  { conc: 62.6953125, signals: [3607, 3399] },
  { conc: 250.78125, signals: [14542, 14201] },
  { conc: 1003.125, signals: [56429, 54196] },
  { conc: 4012.5, signals: [245673, 247265] },
  { conc: 16050, signals: [1051645, 1035564] }
];

console.log('\nConc (pg/mL)'.padEnd(20) + 'Signal'.padEnd(15) + 'Calc. Conc (pg/mL)'.padEnd(25) + 'Diff (%)');
console.log('-'.repeat(80));

for (const std of standardData) {
  for (const sig of std.signals) {
    const res = calculateConcentrationFromSignal(sig, params);
    const calcConc = res.concentration ? res.concentration.toFixed(4) : 'N/A';
    const diff = res.concentration ? ((res.concentration - std.conc) / std.conc * 100).toFixed(4) : 'N/A';
    console.log(
      std.conc.toFixed(6).padEnd(20) +
      sig.toString().padEnd(15) +
      calcConc.padEnd(25) +
      diff
    );
  }
}

