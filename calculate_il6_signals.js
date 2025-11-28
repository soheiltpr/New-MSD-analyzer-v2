/**
 * Calculate concentrations for IL-6 signals using exact E3P4 parameters from image
 */

const fs = require('fs');
const path = require('path');

// Read training data
const trainingDataPath = path.join(__dirname, 'js', 'msd-training-data.js');
let trainingDataContent = fs.readFileSync(trainingDataPath, 'utf8');
const trainingMatch = trainingDataContent.match(/export const MSD_TRAINING_DATA = ({[\s\S]*});/);
const MSD_TRAINING_DATA = eval('(' + trainingMatch[1] + ')');

// Signals from the image
const signals = [
  101,
  211,
  230,
  201,
  599,
  529,
  1761,
  1794,
  7888,
  6702,
  30472,
  28715,
  154951,
  130310,
  645084,
  580715
];

/**
 * Inverse 4PL formula for calculating concentration from signal
 */
function calculateConcentrationFromSignal(signal, params) {
  const top = params["Algorithm Parameter: Calc. Top"];
  const bottom = params["Algorithm Parameter: Calc. Bottom"];
  const midpoint = params["Algorithm Parameter: Calc. MidPoint"];
  const hillSlope = params["Algorithm Parameter: Calc. HillSlope"];

  // Validate parameters
  if (!Number.isFinite(top) || !Number.isFinite(bottom) ||
      !Number.isFinite(midpoint) || !Number.isFinite(hillSlope) ||
      !Number.isFinite(signal)) {
    return null;
  }

  // Check if signal is within valid range
  if (signal >= top) {
    return null; // Signal above curve maximum
  }
  
  if (signal <= bottom) {
    // Signal at or below bottom - return 0 or very small value
    return 0;
  }

  // CORRECT Inverse 4PL formula for increasing curve:
  // From: y = bottom + (top - bottom) / (1 + (EC50 / x)^hillSlope)
  // Solve for x:
  // x = EC50 / ((top - bottom) / (y - bottom) - 1)^(1 / hillSlope)
  try {
    const numerator = (top - bottom) / (signal - bottom) - 1;
    if (numerator <= 0) {
      return null; // Invalid calculation
    }

    const exponent = 1 / hillSlope;
    const ratio = Math.pow(numerator, exponent);
    const concentration = midpoint / ratio; // NOTE: Division, not multiplication!

    return concentration;
  } catch (error) {
    console.error("Error calculating concentration:", error);
    return null;
  }
}

// Get E3P4 IL-6 parameters
const il6Params = MSD_TRAINING_DATA.E3_P4["IL-6"].params;
const lloq = il6Params["Detection Limits: Calc. Low"];
const uloq = il6Params["Detection Limits: Calc. High"];

console.log('='.repeat(120));
console.log('IL-6 CONCENTRATION CALCULATIONS (E3P4)');
console.log('Using exact parameters from Plate Analysis Properties image');
console.log('='.repeat(120));

console.log('\nParameters:');
console.log(`  Top: ${il6Params["Algorithm Parameter: Calc. Top"]}`);
console.log(`  Bottom: ${il6Params["Algorithm Parameter: Calc. Bottom"]}`);
console.log(`  MidPoint: ${il6Params["Algorithm Parameter: Calc. MidPoint"]}`);
console.log(`  HillSlope: ${il6Params["Algorithm Parameter: Calc. HillSlope"]}`);
console.log(`  LLOQ: ${lloq}`);
console.log(`  ULOQ: ${uloq}`);

console.log('\n' + '='.repeat(120));
console.log('RESULTS');
console.log('='.repeat(120));

console.log('\nSignal    | Concentration | Status');
console.log('-'.repeat(80));

let results = [];

for (const signal of signals) {
  const concentration = calculateConcentrationFromSignal(signal, il6Params);
  
  let status = '';
  if (concentration === null) {
    status = 'OUT OF RANGE';
  } else if (concentration === 0) {
    status = 'BELOW BOTTOM';
  } else if (concentration < lloq) {
    status = 'BELOW LLOQ';
  } else if (concentration > uloq) {
    status = 'ABOVE ULOQ';
  } else {
    status = 'WITHIN RANGE';
  }
  
  results.push({
    signal,
    concentration: concentration !== null ? concentration : 'N/A',
    status
  });
  
  const concStr = concentration !== null ? concentration.toFixed(6) : 'N/A';
  console.log(`${signal.toString().padEnd(9)} | ${concStr.padEnd(14)} | ${status}`);
}

console.log('\n' + '='.repeat(120));
console.log('SUMMARY');
console.log('='.repeat(120));

const withinRange = results.filter(r => r.status === 'WITHIN RANGE').length;
const belowLloq = results.filter(r => r.status === 'BELOW LLOQ' || r.status === 'BELOW BOTTOM').length;
const aboveUloq = results.filter(r => r.status === 'ABOVE ULOQ').length;
const outOfRange = results.filter(r => r.status === 'OUT OF RANGE').length;

console.log(`\nTotal signals: ${signals.length}`);
console.log(`Within range (${lloq} - ${uloq}): ${withinRange}`);
console.log(`Below LLOQ: ${belowLloq}`);
console.log(`Above ULOQ: ${aboveUloq}`);
console.log(`Out of range: ${outOfRange}`);

// Export to CSV
const csvPath = path.join(__dirname, 'il6_calculated_concentrations.csv');
const csvLines = ['Signal,Concentration,Status'];
for (const r of results) {
  const conc = r.concentration !== 'N/A' ? r.concentration : '';
  csvLines.push(`${r.signal},${conc},${r.status}`);
}
fs.writeFileSync(csvPath, csvLines.join('\n'), 'utf8');

console.log(`\n✓ Results exported to: ${csvPath}`);

console.log('\n✅ Calculation complete!');

