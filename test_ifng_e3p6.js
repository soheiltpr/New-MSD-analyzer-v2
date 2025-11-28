/**
 * Test calculation for IFN-γ E3_P6, signal 14446, then multiply by 3
 */

// E3_P6 IFN-γ parameters
const params = {
  top: 605509351.493248,
  bottom: 152.898538295933,
  midpoint: 8699635.58699664,
  hillSlope: 1.01420038216573
};

/**
 * CORRECT inverse 4PL formula
 */
function inverse4PL(signal, params) {
  const { top, bottom, midpoint, hillSlope } = params;
  
  if (signal <= bottom || signal >= top) {
    return null;
  }
  
  const numerator = (top - bottom) / (signal - bottom) - 1;
  if (numerator <= 0) {
    return null;
  }
  
  const ratio = Math.pow(numerator, 1 / hillSlope);
  return midpoint / ratio;
}

/**
 * Forward 4PL for verification
 */
function forward4PL(x, top, bottom, midpoint, hillSlope) {
  if (x <= 0) return bottom;
  return bottom + (top - bottom) / (1 + Math.pow(midpoint / x, hillSlope));
}

const signal = 14446;
const concentration = inverse4PL(signal, params);

console.log('='.repeat(80));
console.log('CALCULATION FOR IFN-γ (E3_P6) - SIGNAL = 14,446');
console.log('='.repeat(80));
console.log(`\nSignal: ${signal}`);
console.log(`Parameters:`);
console.log(`  Top: ${params.top.toFixed(2)}`);
console.log(`  Bottom: ${params.bottom.toFixed(2)}`);
console.log(`  MidPoint (EC50): ${params.midpoint.toFixed(2)}`);
console.log(`  HillSlope: ${params.hillSlope.toFixed(6)}`);

if (concentration === null) {
  console.log(`\n❌ Signal ${signal} is OUT OF RANGE`);
  console.log(`   Signal must be between ${params.bottom.toFixed(2)} and ${params.top.toFixed(2)}`);
} else {
  console.log(`\n✅ Calculated Concentration: ${concentration.toFixed(6)}`);
  
  const multiplied = concentration * 3;
  console.log(`\n📊 Concentration × 3 = ${multiplied.toFixed(6)}`);
  
  // Verify with forward calculation
  const verifySignal = forward4PL(concentration, params.top, params.bottom, params.midpoint, params.hillSlope);
  const verifySignal3x = forward4PL(multiplied, params.top, params.bottom, params.midpoint, params.hillSlope);
  
  console.log(`\n🔍 Verification:`);
  console.log(`   Forward calc for ${concentration.toFixed(6)} → Signal: ${verifySignal.toFixed(2)} (expected ${signal})`);
  console.log(`   Forward calc for ${multiplied.toFixed(6)} → Signal: ${verifySignal3x.toFixed(2)}`);
  
  // Check detection limits
  const lloq = 0.739036673560809;
  const uloq = 16050.0;
  
  console.log(`\n📋 Detection Limits:`);
  console.log(`   LLOQ: ${lloq.toFixed(4)}`);
  console.log(`   ULOQ: ${uloq.toFixed(4)}`);
  
  let status = '';
  if (concentration < lloq) {
    status = 'BELOW LLOQ';
  } else if (concentration > uloq) {
    status = 'ABOVE ULOQ';
  } else {
    status = 'WITHIN RANGE';
  }
  
  console.log(`   Status: ${status}`);
  
  let status3x = '';
  if (multiplied < lloq) {
    status3x = 'BELOW LLOQ';
  } else if (multiplied > uloq) {
    status3x = 'ABOVE ULOQ';
  } else {
    status3x = 'WITHIN RANGE';
  }
  
  console.log(`   3× Status: ${status3x}`);
}

