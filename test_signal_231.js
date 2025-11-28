/**
 * Test calculation for signal 231, then multiply by 3
 */

const params = {
  top: 2730863.33378444,
  bottom: 107.957608734576,
  midpoint: 2262.91919423903,
  hillSlope: 1.00338440779492
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

const signal = 231;
const concentration = inverse4PL(signal, params);

console.log('='.repeat(80));
console.log('CALCULATION FOR SIGNAL = 231');
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
  function forward4PL(x, top, bottom, midpoint, hillSlope) {
    if (x <= 0) return bottom;
    return bottom + (top - bottom) / (1 + Math.pow(midpoint / x, hillSlope));
  }
  
  const verifySignal = forward4PL(concentration, params.top, params.bottom, params.midpoint, params.hillSlope);
  const verifySignal3x = forward4PL(multiplied, params.top, params.bottom, params.midpoint, params.hillSlope);
  
  console.log(`\n🔍 Verification:`);
  console.log(`   Forward calc for ${concentration.toFixed(6)} → Signal: ${verifySignal.toFixed(2)} (expected ${signal})`);
  console.log(`   Forward calc for ${multiplied.toFixed(6)} → Signal: ${verifySignal3x.toFixed(2)}`);
}

