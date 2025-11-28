// Compare my model with MSD validation data and show percentage differences

const MSD_PARAMETERS = {
  'GM-CSF': { Top: 2905098, Bottom: 108.9687, MidPoint: 2356.392, HillSlope: 0.998426 },
  'IFN-γ': { Top: 592000000, Bottom: 154.7288, MidPoint: 9062275, HillSlope: 1.014541 },
  'IL-10': { Top: 1686965, Bottom: 121.6305, MidPoint: 1978.757, HillSlope: 0.975056 },
  'IL-1β': { Top: 4328971, Bottom: 176.4038, MidPoint: 4958.583, HillSlope: 0.97629 },
  'IL-2': { Top: 173000000, Bottom: 170.6768, MidPoint: 667294.5, HillSlope: 1.015529 },
  'IL-4': { Top: 4213744, Bottom: 93.20236, MidPoint: 1537.592, HillSlope: 0.987318 },
  'IL-5': { Top: 5666698, Bottom: 138.8998, MidPoint: 11912.52, HillSlope: 0.982633 },
  'IL-6': { Top: 154000000, Bottom: 150.2258, MidPoint: 182734.8, HillSlope: 1.069812 },
  'MCP-1': { Top: 1488603, Bottom: 127.2709, MidPoint: 1848.83, HillSlope: 1.105226 },
  'TNF-α': { Top: 6051234, Bottom: 187.0038, MidPoint: 6841.159, HillSlope: 1.01245 }
};

function calculateConcentration(signal, params) {
  const { Top, Bottom, MidPoint, HillSlope } = params;
  
  if (signal <= Bottom) return null;
  if (signal >= Top) return null;
  
  const numerator = (Top - Bottom) / (signal - Bottom) - 1;
  if (numerator <= 0) return null;
  
  const exponent = 1 / HillSlope;
  const ratio = Math.pow(numerator, exponent);
  return MidPoint / ratio;
}

// Validation data with MSD calculated concentrations
const validationData = {
  'GM-CSF': [
    ['A02', 0, 97, NaN],
    ['H02', 0, 126, 0.012038139],
    ['A03', 1.127929688, 1565, 1.204250647],
    ['H03', 1.127929688, 1539, 1.182823038],
    ['A04', 4.51171875, 5608, 4.524396222],
    ['H04', 4.51171875, 5499, 4.435041018],
    ['A05', 18.046875, 21685, 17.71041122],
    ['H05', 18.046875, 21238, 17.34295608],
    ['A06', 72.1875, 84356, 70.1208086],
    ['H06', 72.1875, 81394, 67.59875991],
    ['A07', 288.75, 316293, 284.5962747],
    ['H07', 288.75, 303440, 271.7384626],
    ['A08', 1155, 1187641, 1604.452841],
    ['H08', 1155, 1120800, 1457.243234],
    ['A09', 4620, 1783080, 3705.948328],
    ['H09', 4620, 1866816, 4199.680995]
  ],
  'IFN-γ': [
    ['A02', 0, 150, NaN],
    ['H02', 0, 148, NaN],
    ['A03', 3.918457031, 391, 4.540201028],
    ['H03', 3.918457031, 365, 4.054685756],
    ['A04', 15.67382813, 1048, 16.5997598],
    ['H04', 15.67382813, 1000, 15.72736148],
    ['A05', 62.6953125, 3607, 62.32639346],
    ['H05', 62.6953125, 3399, 58.6465283],
    ['A06', 250.78125, 14542, 252.3072098],
    ['H06', 250.78125, 14201, 246.4462834],
    ['A07', 1003.125, 56429, 960.2311596],
    ['H07', 1003.125, 54196, 922.8752416],
    ['A08', 4012.5, 245673, 4068.474148],
    ['H08', 4012.5, 247265, 4094.333246],
    ['A09', 16050, 1051645, 16941.12987],
    ['H09', 16050, 1035564, 16686.85164]
  ],
  'IL-10': [
    ['A02', 0, 104, NaN],
    ['H02', 0, 120, 0.006892361],
    ['A03', 0.491943359, 635, 0.501022237],
    ['H03', 0.491943359, 648, 0.513689747],
    ['A04', 1.967773438, 2069, 1.917368146],
    ['H04', 1.967773438, 2039, 1.887469249],
    ['A05', 7.87109375, 7924, 7.853941712],
    ['H05', 7.87109375, 8153, 8.089030163],
    ['A06', 31.484375, 30565, 31.71930031],
    ['H06', 31.484375, 29476, 30.54714689],
    ['A07', 125.9375, 113116, 126.4761157],
    ['H07', 125.9375, 115140, 128.9428879],
    ['A08', 503.75, 375135, 512.566939],
    ['H08', 503.75, 364214, 493.3413538],
    ['A09', 2015, 878108, 1955.713947],
    ['H09', 2015, 902107, 2069.79439]
  ],
  'IL-1β': [
    ['A02', 0, 165, NaN],
    ['H02', 0, 199, 0.013865377],
    ['A03', 0.541992188, 787, 0.568181893],
    ['H03', 0.541992188, 781, 0.562416628],
    ['A04', 2.16796875, 2430, 2.174761186],
    ['H04', 2.16796875, 2379, 2.124334639],
    ['A05', 8.671875, 8732, 8.525935898],
    ['H05', 8.671875, 8405, 8.192370822],
    ['A06', 34.6875, 34437, 35.40318288],
    ['H06', 34.6875, 33837, 34.7649697],
    ['A07', 138.75, 128211, 139.2176299],
    ['H07', 138.75, 126988, 137.8182721],
    ['A08', 555, 471110, 574.717707],
    ['H08', 555, 459182, 558.0780528],
    ['A09', 2220, 1392601, 2304.124434],
    ['H09', 2220, 1309204, 2101.633354]
  ],
  'IL-2': [
    ['A02', 0, 132, NaN],
    ['H02', 0, 174, 0.113833752],
    ['A03', 0.230712891, 183, 0.153740053],
    ['H03', 0.230712891, 200, 0.228801827],
    ['A04', 0.922851563, 360, 0.926565872],
    ['H04', 0.922851563, 369, 0.965554477],
    ['A05', 3.69140625, 999, 3.66792071],
    ['H05', 3.69140625, 1047, 3.872477372],
    ['A06', 14.765625, 3660, 14.8967793],
    ['H06', 14.765625, 3675, 14.95967097],
    ['A07', 59.0625, 14047, 58.02617493],
    ['H07', 59.0625, 13776, 56.90770944],
    ['A08', 236.25, 58124, 238.1463661],
    ['H08', 236.25, 57105, 234.0065727],
    ['A09', 945, 231453, 936.6797371],
    ['H09', 945, 239385, 968.5052609]
  ],
  'IL-4': [
    ['A02', 0, 88, NaN],
    ['H02', 0, 96, 0.001109268],
    ['A03', 0.201416016, 787, 0.230254426],
    ['H03', 0.201416016, 734, 0.212687445],
    ['A04', 0.805664063, 2447, 0.780434004],
    ['H04', 0.805664063, 2327, 0.740657469],
    ['A05', 3.22265625, 9827, 3.230438564],
    ['H05', 3.22265625, 9557, 3.140653514],
    ['A06', 12.890625, 38279, 12.76555245],
    ['H06', 12.890625, 36754, 12.2506396],
    ['A07', 51.5625, 149440, 51.55524866],
    ['H07', 51.5625, 149013, 51.40131032],
    ['A08', 206.25, 571725, 226.0252512],
    ['H08', 206.25, 558238, 219.6681967],
    ['A09', 825, 1386830, 764.1187669],
    ['H09', 825, 1458066, 832.0286659]
  ],
  'IL-5': [
    ['A02', 0, 152, NaN],
    ['H02', 0, 167, 0.009623418],
    ['A03', 0.522460938, 472, 0.561995214],
    ['H03', 0.522460938, 472, 0.561995214],
    ['A04', 2.08984375, 1316, 2.120415605],
    ['H04', 2.08984375, 1230, 1.960749303],
    ['A05', 8.359375, 4678, 8.427202137],
    ['H05', 8.359375, 4438, 7.974188666],
    ['A06', 33.4375, 18326, 34.51033475],
    ['H06', 33.4375, 16898, 31.75977294],
    ['A07', 133.75, 70241, 136.497589],
    ['H07', 133.75, 67645, 131.3209588],
    ['A08', 535, 273830, 563.04715],
    ['H08', 535, 260769, 534.4986354],
    ['A09', 2140, 916569, 2189.983125],
    ['H09', 2140, 870606, 2057.484226]
  ],
  'IL-6': [
    ['A02', 0, 117, NaN],
    ['H02', 0, 126, NaN],
    ['A03', 0.25390625, 239, 0.282700783],
    ['H03', 0.25390625, 257, 0.326468561],
    ['A04', 1.015625, 553, 1.025022738],
    ['H04', 1.015625, 612, 1.161373394],
    ['A05', 4.0625, 1832, 3.893910943],
    ['H05', 4.0625, 1850, 3.933451287],
    ['A06', 16.25, 7349, 15.61136125],
    ['H06', 16.25, 7109, 15.11204487],
    ['A07', 65, 30599, 62.34802776],
    ['H07', 65, 30087, 61.34006434],
    ['A08', 260, 142686, 275.0734984],
    ['H08', 260, 134401, 259.674206],
    ['A09', 1040, 597631, 1093.045897],
    ['H09', 1040, 600164, 1097.511173]
  ],
  'MCP-1': [
    ['A02', 0, 111, NaN],
    ['H02', 0, 178, 0.0948687],
    ['A03', 0.659179688, 420, 0.773567743],
    ['H03', 0.659179688, 499, 0.975082672],
    ['A04', 2.63671875, 1239, 2.712085132],
    ['H04', 2.63671875, 1189, 2.600052303],
    ['A05', 10.546875, 4670, 9.726956669],
    ['H05', 10.546875, 4625, 9.639952337],
    ['A06', 42.1875, 21550, 39.504126],
    ['H06', 42.1875, 20053, 36.9898231],
    ['A07', 168.75, 112796, 184.2545706],
    ['H07', 168.75, 110921, 181.3023227],
    ['A08', 675, 454545, 811.3607856],
    ['H08', 675, 437231, 773.1616539],
    ['A09', 2700, 916556, 2416.390489],
    ['H09', 2700, 927463, 2477.660388]
  ],
  'TNF-α': [
    ['A02', 0, 200, NaN],
    ['H02', 0, 240, 0.024675878],
    ['A03', 0.330810547, 492, 0.340012187],
    ['H03', 0.330810547, 491, 0.338771757],
    ['A04', 1.323242188, 1354, 1.399099528],
    ['H04', 1.323242188, 1191, 1.199852815],
    ['A05', 5.29296875, 4657, 5.398759439],
    ['H05', 5.29296875, 4579, 5.304800227],
    ['A06', 21.171875, 18170, 21.55880315],
    ['H06', 21.171875, 17121, 20.30877454],
    ['A07', 84.6875, 71400, 84.95503782],
    ['H07', 84.6875, 71792, 85.42332713],
    ['A08', 338.75, 285538, 347.7956625],
    ['H08', 338.75, 272065, 330.7778338],
    ['A09', 1355, 969965, 1323.04617],
    ['H09', 1355, 1008205, 1385.041469]
  ]
};

console.log('='.repeat(120));
console.log('COMPARISON: MY MODEL vs MSD SOFTWARE');
console.log('='.repeat(120));

let grandTotal = 0;
let grandCount = 0;
let cytokineSummary = {};

for (const [cytokine, data] of Object.entries(validationData)) {
  const params = MSD_PARAMETERS[cytokine];
  
  console.log(`\n${'='.repeat(120)}`);
  console.log(`${cytokine}`);
  console.log('='.repeat(120));
  console.log('Well'.padEnd(8) + 'Signal'.padEnd(10) + 'My Model'.padEnd(18) + 'MSD Calc'.padEnd(18) + 'Diff (%)');
  console.log('-'.repeat(120));
  
  let cytokineTotal = 0;
  let cytokineCount = 0;
  let maxDiff = 0;
  
  for (const [well, knownConc, signal, msdCalc] of data) {
    const myCalc = calculateConcentration(signal, params);
    const myCalcStr = myCalc ? myCalc.toFixed(6) : 'N/A';
    const msdCalcStr = isNaN(msdCalc) ? 'N/A' : msdCalc.toFixed(6);
    
    let diffStr = 'N/A';
    if (myCalc && !isNaN(msdCalc) && msdCalc !== 0) {
      const diff = Math.abs((myCalc - msdCalc) / msdCalc) * 100;
      diffStr = diff.toFixed(4) + '%';
      cytokineTotal += diff;
      cytokineCount++;
      grandTotal += diff;
      grandCount++;
      maxDiff = Math.max(maxDiff, diff);
    }
    
    console.log(
      well.padEnd(8) +
      signal.toString().padEnd(10) +
      myCalcStr.padEnd(18) +
      msdCalcStr.padEnd(18) +
      diffStr
    );
  }
  
  const avgDiff = cytokineCount > 0 ? cytokineTotal / cytokineCount : 0;
  cytokineSummary[cytokine] = {
    avgDiff,
    maxDiff,
    count: cytokineCount
  };
  
  console.log('-'.repeat(120));
  console.log(`${cytokine} Summary: Avg Diff = ${avgDiff.toFixed(4)}%, Max Diff = ${maxDiff.toFixed(4)}%, Count = ${cytokineCount}`);
  
  if (avgDiff > 1.0) {
    console.log(`⚠️  ${cytokine}: Average difference EXCEEDS 1% target`);
  } else {
    console.log(`✅ ${cytokine}: Average difference within 1% target`);
  }
}

// Grand summary
console.log('\n' + '='.repeat(120));
console.log('GRAND SUMMARY - VALIDATION RESULTS');
console.log('='.repeat(120));

const grandAvg = grandCount > 0 ? grandTotal / grandCount : 0;

console.log(`\nOverall Statistics:`);
console.log(`  Total comparisons: ${grandCount}`);
console.log(`  Average |Diff|:    ${grandAvg.toFixed(4)}%`);
console.log(`  Target:            1.00%`);

console.log(`\nPer-Cytokine Summary:`);
console.log('-'.repeat(80));
console.log('Cytokine'.padEnd(15) + 'Avg Diff (%)'.padEnd(18) + 'Max Diff (%)'.padEnd(18) + 'Status');
console.log('-'.repeat(80));

let passCount = 0;
for (const [cytokine, stats] of Object.entries(cytokineSummary)) {
  const status = stats.avgDiff <= 1.0 ? '✅ PASS' : '❌ FAIL';
  if (stats.avgDiff <= 1.0) passCount++;
  console.log(
    cytokine.padEnd(15) +
    stats.avgDiff.toFixed(4).padEnd(18) +
    stats.maxDiff.toFixed(4).padEnd(18) +
    status
  );
}

console.log('-'.repeat(80));
console.log(`\nResult: ${passCount}/10 cytokines pass (<1% average difference)`);

if (grandAvg > 1.0) {
  console.log(`\n❌ OVERALL: Average difference is ${grandAvg.toFixed(4)}%, which EXCEEDS 1% target`);
} else {
  console.log(`\n✅ OVERALL: Average difference is ${grandAvg.toFixed(4)}%, which is within 1% target`);
  console.log(`\n🎉 MODEL VALIDATED: Ready for production use!`);
}

