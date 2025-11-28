// Final calculated 4PL parameters table

console.log('='.repeat(100));
console.log('FINAL CALCULATED 4PL PARAMETERS');
console.log('='.repeat(100));
console.log('');

// Final calculated parameters for remaining 5 cytokines
const finalParams = [
  {
    Assay: 'IL-4',
    Spot: 5,
    'Calc. Top': 2902572.184,
    'Calc. Bottom': 238.514829628,
    'Calc. MidPoint': 844.4577613273,
    'Calc. HillSlope': 1.034199470,
    'RSquared': 0.999746669
  },
  {
    Assay: 'IL-5',
    Spot: 6,
    'Calc. Top': 4064835.291,
    'Calc. Bottom': 205.435397188,
    'Calc. MidPoint': 7528.6149219663,
    'Calc. HillSlope': 1.006088088,
    'RSquared': 0.999995216
  },
  {
    Assay: 'IL-6',
    Spot: 7,
    'Calc. Top': 7310835.000,
    'Calc. Bottom': 170.413112226,
    'Calc. MidPoint': 10400.0000000000,
    'Calc. HillSlope': 1.070177122,
    'RSquared': 0.997764731
  },
  {
    Assay: 'MCP-1',
    Spot: 9,
    'Calc. Top': 1326210.775,
    'Calc. Bottom': 312.544219340,
    'Calc. MidPoint': 1273.9803799679,
    'Calc. HillSlope': 1.194478471,
    'RSquared': 0.998733838
  },
  {
    Assay: 'TNF-α',
    Spot: 10,
    'Calc. Top': 5579691.273,
    'Calc. Bottom': 231.335026259,
    'Calc. MidPoint': 6152.8160774593,
    'Calc. HillSlope': 1.015076798,
    'RSquared': 0.999998735
  }
];

// Format in MSD table style
console.log('Assay\tSpot\tAlgorithm Parameter: Calc. Top\tAlgorithm Parameter: Calc. Bottom\tAlgorithm Parameter: Calc. MidPoint\tAlgorithm Parameter: Calc. HillSlope\tFit Statistic: RSquared');
console.log('-'.repeat(150));

for (const p of finalParams) {
  console.log(
    `${p.Assay}\t${p.Spot}\t${p['Calc. Top'].toFixed(3)}\t${p['Calc. Bottom'].toFixed(9)}\t${p['Calc. MidPoint'].toFixed(10)}\t${p['Calc. HillSlope'].toFixed(9)}\t${p.RSquared.toFixed(9)}`
  );
}

console.log('');
console.log('='.repeat(100));
console.log('FORMATTED TABLE:');
console.log('='.repeat(100));
console.log('');

console.log('| Assay | Spot | Calc. Top | Calc. Bottom | Calc. MidPoint | Calc. HillSlope | R² |');
console.log('|-------|------|-----------|--------------|----------------|-----------------|-----|');

for (const p of finalParams) {
  const top = p['Calc. Top'] >= 1000000 ? `${(p['Calc. Top']/1000000).toFixed(2)}M` : p['Calc. Top'].toFixed(2);
  console.log(
    `| ${p.Assay.padEnd(5)} | ${p.Spot.toString().padStart(4)} | ${top.padStart(10)} | ${p['Calc. Bottom'].toFixed(2).padStart(13)} | ${p['Calc. MidPoint'].toFixed(4).padStart(14)} | ${p['Calc. HillSlope'].toFixed(6).padStart(15)} | ${p.RSquared.toFixed(6)} |`
  );
}

console.log('');
console.log('='.repeat(100));
console.log('DETAILED VALUES:');
console.log('='.repeat(100));

for (const p of finalParams) {
  console.log(`\n${p.Assay} (Spot ${p.Spot}):`);
  console.log(`  Calc. Top:       ${p['Calc. Top'].toFixed(3)}`);
  console.log(`  Calc. Bottom:    ${p['Calc. Bottom'].toFixed(9)}`);
  console.log(`  Calc. MidPoint:  ${p['Calc. MidPoint'].toFixed(10)}`);
  console.log(`  Calc. HillSlope: ${p['Calc. HillSlope'].toFixed(9)}`);
  console.log(`  RSquared:        ${p.RSquared.toFixed(9)}`);
}




