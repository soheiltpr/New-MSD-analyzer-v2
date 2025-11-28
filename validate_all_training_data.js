// Validate model against ALL training data from MSD

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

// All training data
const trainingData = {
  'GM-CSF': [
    ['A02', 0, 119, 0.007977232],
    ['H02', 0, 98, NaN],
    ['A03', 1.127929688, 1658, 1.242324737],
    ['H03', 1.127929688, 1591, 1.188480348],
    ['A04', 4.51171875, 6241, 4.936378872],
    ['H04', 4.51171875, 5432, 4.282968664],
    ['A05', 18.046875, 19341, 15.58052301],
    ['H05', 18.046875, 21411, 17.27269141],
    ['A06', 72.1875, 93083, 77.49206896],
    ['H06', 72.1875, 77758, 64.34935325],
    ['A07', 288.75, 301744, 272.0948717],
    ['H07', 288.75, 305792, 276.1823496],
    ['A08', 1155, 1342780, 2024.621882],
    ['H08', 1155, 1100625, 1436.001556],
    ['A09', 4620, 1759497, 3621.341225],
    ['H09', 4620, 1836747, 4054.413355]
  ],
  'IFN-γ': [
    ['A02', 0, 152, NaN],
    ['H02', 0, 144, NaN],
    ['A03', 3.918457031, 395, 4.542732735],
    ['H03', 3.918457031, 427, 5.138530202],
    ['A04', 15.67382813, 1082, 17.19556196],
    ['H04', 15.67382813, 1001, 15.71404825],
    ['A05', 62.6953125, 3323, 57.72783995],
    ['H05', 62.6953125, 3386, 58.8591318],
    ['A06', 250.78125, 14635, 258.1598974],
    ['H06', 250.78125, 13093, 231.0404936],
    ['A07', 1003.125, 53023, 925.2814983],
    ['H07', 1003.125, 53393, 931.6645461],
    ['A08', 4012.5, 245154, 4196.017447],
    ['H08', 4012.5, 234980, 4024.148283],
    ['A09', 16050, 1043736, 17528.97007],
    ['H09', 16050, 1025604, 17228.21451]
  ],
  'IL-10': [
    ['A02', 0, 133, 0.009834824],
    ['H02', 0, 108, NaN],
    ['A03', 0.491943359, 703, 0.556341355],
    ['H03', 0.491943359, 673, 0.526908587],
    ['A04', 1.967773438, 1993, 1.846621467],
    ['H04', 1.967773438, 2026, 1.880063364],
    ['A05', 7.87109375, 7803, 7.886505228],
    ['H05', 7.87109375, 7321, 7.377217252],
    ['A06', 31.484375, 30565, 32.83351016],
    ['H06', 31.484375, 28324, 30.31506341],
    ['A07', 125.9375, 111027, 130.1127899],
    ['H07', 125.9375, 105891, 123.5239877],
    ['A08', 503.75, 374657, 546.9137135],
    ['H08', 503.75, 351370, 502.9127677],
    ['A09', 2015, 872573, 2123.563863],
    ['H09', 2015, 808081, 1815.162919]
  ],
  'IL-1β': [
    ['A02', 0, 162, NaN],
    ['H02', 0, 190, 0.011448912],
    ['A03', 0.541992188, 818, 0.593368822],
    ['H03', 0.541992188, 729, 0.509197946],
    ['A04', 2.16796875, 2593, 2.309068629],
    ['H04', 2.16796875, 2288, 2.010894426],
    ['A05', 8.671875, 9093, 8.807866644],
    ['H05', 8.671875, 8451, 8.157633671],
    ['A06', 34.6875, 37320, 38.24031598],
    ['H06', 34.6875, 32028, 32.62867022],
    ['A07', 138.75, 128877, 139.610469],
    ['H07', 138.75, 124146, 134.201325],
    ['A08', 555, 481817, 590.2351352],
    ['H08', 555, 441739, 534.2785298],
    ['A09', 2220, 1408822, 2349.986356],
    ['H09', 2220, 1296723, 2076.9215]
  ],
  'IL-2': [
    ['A02', 0, 175, 0.021844168],
    ['H02', 0, 150, NaN],
    ['A03', 0.230712891, 247, 0.369077411],
    ['H03', 0.230712891, 217, 0.225722845],
    ['A04', 0.922851563, 384, 1.015485018],
    ['H04', 0.922851563, 369, 0.945133391],
    ['A05', 3.69140625, 945, 3.614080286],
    ['H05', 3.69140625, 922, 3.508346759],
    ['A06', 14.765625, 3596, 15.62820016],
    ['H06', 14.765625, 3173, 13.7258462],
    ['A07', 59.0625, 13072, 57.68441652],
    ['H07', 59.0625, 12889, 56.87855107],
    ['A08', 236.25, 58569, 255.2172384],
    ['H08', 236.25, 52704, 229.9496897],
    ['A09', 945, 231142, 989.3830448],
    ['H09', 945, 213864, 916.3699157]
  ],
  'IL-4': [
    ['A02', 0, 107, 0.004280916],
    ['H02', 0, 77, NaN],
    ['A03', 0.201416016, 773, 0.2217798],
    ['H03', 0.201416016, 830, 0.240627731],
    ['A04', 0.805664063, 2990, 0.963337207],
    ['H04', 0.805664063, 2443, 0.779230721],
    ['A05', 3.22265625, 6213, 2.056393839],
    ['H05', 3.22265625, 9869, 3.307627886],
    ['A06', 12.890625, 142259, 51.42436739],
    ['H06', 12.890625, 35910, 12.40018335],
    ['A07', 51.5625, 142259, 51.42436739],
    ['H07', 51.5625, 152031, 55.14009481],
    ['A08', 206.25, 607306, 253.0258826],
    ['H08', 206.25, 574872, 237.1812186],
    ['A09', 825, 1407350, 764.2143022],
    ['H09', 825, 1436504, 788.5483718]
  ],
  'IL-5': [
    ['A02', 0, 132, NaN],
    ['H02', 0, 143, 0.006713704],
    ['A03', 0.522460938, 452, 0.553533416],
    ['H03', 0.522460938, 457, 0.562530969],
    ['A04', 2.08984375, 1299, 2.099302906],
    ['H04', 2.08984375, 1237, 1.985158367],
    ['A05', 8.359375, 4564, 8.204147914],
    ['H05', 8.359375, 4486, 8.056889972],
    ['A06', 33.4375, 18185, 34.38328203],
    ['H06', 33.4375, 17361, 32.78135339],
    ['A07', 133.75, 68551, 134.6741116],
    ['H07', 133.75, 67657, 132.8617199],
    ['A08', 535, 261861, 546.7913318],
    ['H08', 535, 260724, 544.2574975],
    ['A09', 2140, 902341, 2190.435514],
    ['H09', 2140, 858971, 2064.199698]
  ],
  'IL-6': [
    ['A02', 0, 101, NaN],
    ['H02', 0, 211, 0.189221428],
    ['A03', 0.25390625, 230, 0.244007975],
    ['H03', 0.25390625, 201, 0.159951775],
    ['A04', 1.015625, 599, 1.2263589],
    ['H04', 1.015625, 529, 1.046588254],
    ['A05', 4.0625, 1761, 4.049578996],
    ['H05', 4.0625, 1794, 4.127078359],
    ['A06', 16.25, 7888, 17.56022692],
    ['H06', 16.25, 6702, 15.03090313],
    ['A07', 65, 30472, 62.95387629],
    ['H07', 65, 28715, 59.53682962],
    ['A08', 260, 154951, 289.1796124],
    ['H08', 260, 130310, 245.8780091],
    ['A09', 1040, 645084, 1100.947274],
    ['H09', 1040, 580715, 997.495985]
  ],
  'MCP-1': [
    ['A02', 0, 109, NaN],
    ['H02', 0, 135, 0.030579019],
    ['A03', 0.659179688, 412, 0.799233861],
    ['H03', 0.659179688, 429, 0.842298187],
    ['A04', 2.63671875, 1247, 2.760306401],
    ['H04', 2.63671875, 1223, 2.706680942],
    ['A05', 10.546875, 4595, 9.673849933],
    ['H05', 10.546875, 4391, 9.272152301],
    ['A06', 42.1875, 21770, 40.75304767],
    ['H06', 42.1875, 19334, 36.52471065],
    ['A07', 168.75, 109654, 186.8959967],
    ['H07', 168.75, 103190, 176.1404405],
    ['A08', 675, 443179, 850.2683466],
    ['H08', 675, 404009, 756.3613614],
    ['A09', 2700, 877523, 2564.706225],
    ['H09', 2700, 835522, 2310.158004]
  ],
  'TNF-α': [
    ['A02', 0, 119, NaN],
    ['H02', 0, 255, 0.088440435],
    ['A03', 0.330810547, 473, 0.365485611],
    ['H03', 0.330810547, 421, 0.29976908],
    ['A04', 1.323242188, 1299, 1.397718804],
    ['H04', 1.323242188, 1152, 1.215035339],
    ['A05', 5.29296875, 4618, 5.478606845],
    ['H05', 5.29296875, 4352, 5.153415109],
    ['A06', 21.171875, 19393, 23.37882001],
    ['H06', 21.171875, 16579, 19.98313506],
    ['A07', 84.6875, 68954, 83.07933326],
    ['H07', 84.6875, 67522, 81.35111426],
    ['A08', 338.75, 289520, 356.4115106],
    ['H08', 338.75, 269667, 331.1192447],
    ['A09', 1355, 1016100, 1407.743411],
    ['H09', 1355, 947486, 1296.348039]
  ]
};

console.log('='.repeat(120));
console.log('COMPREHENSIVE MODEL VALIDATION - ALL TRAINING DATA');
console.log('='.repeat(120));

let grandTotal = 0;
let grandCount = 0;
let cytokineSummary = {};

for (const [cytokine, data] of Object.entries(trainingData)) {
  const params = MSD_PARAMETERS[cytokine];
  
  console.log(`\n${'='.repeat(120)}`);
  console.log(`${cytokine}`);
  console.log('='.repeat(120));
  console.log('Well'.padEnd(8) + 'Known Conc'.padEnd(15) + 'Signal'.padEnd(12) + 'My Model'.padEnd(15) + 'MSD Calc'.padEnd(15) + 'Diff (%)');
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
      knownConc.toFixed(6).padEnd(15) +
      signal.toString().padEnd(12) +
      myCalcStr.padEnd(15) +
      msdCalcStr.padEnd(15) +
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
console.log('GRAND SUMMARY');
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
  console.log(`\nACTION REQUIRED: Need to develop a better model`);
  console.log(`\nPossible improvements:`);
  console.log(`  1. Use MSD's exact TopCap refit algorithm`);
  console.log(`  2. Apply additional signal transformations`);
  console.log(`  3. Use different initial parameters for optimization`);
  console.log(`  4. Implement MSD's exact Nelder-Mead variant`);
} else {
  console.log(`\n✅ OVERALL: Average difference is ${grandAvg.toFixed(4)}%, which is within 1% target`);
  console.log(`\nModel is acceptable for use!`);
}

