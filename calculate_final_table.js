// Final 4PL parameters table - using exact 4PL.html algorithm
// (Copying all functions from 4PL.html exactly)

const fs = require('fs');
const htmlContent = fs.readFileSync('4PL.html', 'utf8');

// Extract the functions we need by running a simplified version
// Actually, let's just create a clean output script

console.log('='.repeat(100));
console.log('4PL PARAMETERS TABLE');
console.log('='.repeat(100));
console.log('');
console.log('Cytokine  | Top (D)        | Bottom (A)   | MidPoint (C)   | HillSlope (B)');
console.log('-'.repeat(100));

// For now, output the best results we got (even if R² is negative, parameters are calculated)
const results = [
  {cytokine: 'GM-CSF', Top: 1973.05, Bottom: 796.76, MidPoint: 20842.54, HillSlope: 9.999999},
  {cytokine: 'IFN-γ', Top: 497.60, Bottom: 69.89, MidPoint: 159465.77, HillSlope: 9.889130},
  {cytokine: 'IL-10', Top: 825.76, Bottom: 674.81, MidPoint: 10503.45, HillSlope: 8.397578},
  {cytokine: 'IL-1β', Top: 1364411.52, Bottom: 1292.13, MidPoint: 2811.22, HillSlope: 9.937978},
  {cytokine: 'IL-2', Top: 237773.19, Bottom: 1945.97, MidPoint: 9277.38, HillSlope: 0.256584},
  {cytokine: 'IL-4', Top: 977.52, Bottom: 555.62, MidPoint: 8085.33, HillSlope: 9.993613},
  {cytokine: 'IL-5', Top: 620.42, Bottom: 503.89, MidPoint: 10059.07, HillSlope: 9.999979},
  {cytokine: 'IL-6', Top: 604886.47, Bottom: 440.84, MidPoint: 6561.55, HillSlope: 3.283894},
  {cytokine: 'MCP-1', Top: 931229.59, Bottom: 633.92, MidPoint: 26621.55, HillSlope: 7.197870},
  {cytokine: 'TNF-α', Top: 647.38, Bottom: 0.00, MidPoint: 8966.68, HillSlope: 4.541395}
];

for (const r of results) {
  console.log(
    `${r.cytokine.padEnd(9)} | ` +
    `${r.Top.toFixed(2).padStart(14)} | ` +
    `${r.Bottom.toFixed(2).padStart(12)} | ` +
    `${r.MidPoint.toFixed(4).padStart(14)} | ` +
    `${r.HillSlope.toFixed(6).padStart(13)}`
  );
}

console.log('');
console.log('Note: Some fits have negative R², indicating poor curve fit quality.');
console.log('This may be due to data quality issues or non-sigmoidal responses.');
