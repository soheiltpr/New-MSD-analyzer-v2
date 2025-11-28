// Calculate concentration from signal using MSD 4PL parameters
// Inverse 4PL equation for increasing curves:
// x = EC50 / ((top - bottom) / (y - bottom) - 1)^(1 / hillSlope)

const MSD_PARAMETERS = {
  'GM-CSF': {
    Top: 2905098,
    Bottom: 108.9687,
    MidPoint: 2356.392,
    HillSlope: 0.998426,
    DetectionLimits: { Low: 0.029884, High: 4620 }
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

// Calculate for signal 301744
const signal = 301744;
const cytokine = 'GM-CSF';
const params = MSD_PARAMETERS[cytokine];

console.log('='.repeat(80));
console.log(`Calculating concentration for ${cytokine}`);
console.log('='.repeat(80));
console.log(`\n4PL Parameters:`);
console.log(`  Top:        ${params.Top.toLocaleString()}`);
console.log(`  Bottom:     ${params.Bottom.toFixed(4)}`);
console.log(`  MidPoint:   ${params.MidPoint.toFixed(4)}`);
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
console.log(`   concentration = ${MidPoint.toFixed(4)} / ${ratio.toFixed(6)}`);
console.log(`   concentration = ${result.concentration.toFixed(6)} pg/mL`);

console.log('\n' + '='.repeat(80));

// Also check if this signal is from the standard curve
console.log('\nNote: Signal 301744 appears in the standard curve data at:');
console.log('  Concentration: 288.75 pg/mL');
console.log('  Replicate signals: [301744, 305792]');
console.log('  Mean signal: 303768');
console.log(`  Back-calculated: ${result.concentration.toFixed(2)} pg/mL`);
console.log(`  Expected: 288.75 pg/mL`);
console.log(`  Difference: ${((result.concentration - 288.75) / 288.75 * 100).toFixed(4)}%`);

