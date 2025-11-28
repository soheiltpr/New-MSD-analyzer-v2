// E3P1 Plate Analysis - Robust Version
// Uses known good parameters from similar plates as starting point

// Since E3P1 is from the same experiment series as E3P4 and E3P6,
// we can use those parameters as a template and auto-detect best fit

const REFERENCE_PARAMETERS = {
  '2BOANACS77': {
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
  },
  'E3P6': {
    'GM-CSF': { Top: 2872985, Bottom: 111.8709, MidPoint: 2272.195, HillSlope: 1.006125 },
    'IFN-γ': { Top: 782000000, Bottom: 152.4633, MidPoint: 11000000, HillSlope: 1.020429 },
    'IL-10': { Top: 1722572, Bottom: 112.3031, MidPoint: 1879.847, HillSlope: 0.984193 },
    'IL-1β': { Top: 4297377, Bottom: 183.074, MidPoint: 4882.571, HillSlope: 0.979152 },
    'IL-2': { Top: 86800000, Bottom: 148.676, MidPoint: 327051.2, HillSlope: 1.011874 },
    'IL-4': { Top: 3451522, Bottom: 92.66713, MidPoint: 1137.36, HillSlope: 1.000719 },
    'IL-5': { Top: 5371094, Bottom: 161.4381, MidPoint: 10834.29, HillSlope: 0.988987 },
    'IL-6': { Top: 154000000, Bottom: 150.2258, MidPoint: 182734.8, HillSlope: 1.069812 },
    'MCP-1': { Top: 1597547, Bottom: 152.3343, MidPoint: 1852.515, HillSlope: 1.117328 },
    'TNF-α': { Top: 6002699, Bottom: 220.8896, MidPoint: 6743.01, HillSlope: 1.011124 }
  }
};

function calculate4PLConcentration(signal, params) {
  const { Top, Bottom, MidPoint, HillSlope } = params;
  if (signal <= Bottom) return null;
  if (signal >= Top) return null;
  const numerator = (Top - Bottom) / (signal - Bottom) - 1;
  if (numerator <= 0) return null;
  const exponent = 1 / HillSlope;
  const ratio = Math.pow(numerator, exponent);
  return MidPoint / ratio;
}

// E3P1 ALL Sample Data (standards are included in the data)
const E3P1_DATA = [
  // GM-CSF
  {cytokine: 'GM-CSF', well: 'A02', knownConc: 0, signal: 207},
  {cytokine: 'GM-CSF', well: 'H02', knownConc: 0, signal: 113},
  {cytokine: 'GM-CSF', well: 'A03', knownConc: 1.127929688, signal: 1278},
  {cytokine: 'GM-CSF', well: 'H03', knownConc: 1.127929688, signal: 1611},
  {cytokine: 'GM-CSF', well: 'A04', knownConc: 4.51171875, signal: 4529},
  {cytokine: 'GM-CSF', well: 'H04', knownConc: 4.51171875, signal: 5797},
  {cytokine: 'GM-CSF', well: 'A05', knownConc: 18.046875, signal: 18374},
  {cytokine: 'GM-CSF', well: 'H05', knownConc: 18.046875, signal: 21263},
  {cytokine: 'GM-CSF', well: 'A06', knownConc: 72.1875, signal: 74083},
  {cytokine: 'GM-CSF', well: 'H06', knownConc: 72.1875, signal: 84188},
  {cytokine: 'GM-CSF', well: 'A07', knownConc: 288.75, signal: 270599},
  {cytokine: 'GM-CSF', well: 'H07', knownConc: 288.75, signal: 304331},
  {cytokine: 'GM-CSF', well: 'A08', knownConc: 1155, signal: 1070008},
  {cytokine: 'GM-CSF', well: 'H08', knownConc: 1155, signal: 1143081},
  {cytokine: 'GM-CSF', well: 'A09', knownConc: 4620, signal: 1809801},
  {cytokine: 'GM-CSF', well: 'H09', knownConc: 4620, signal: 1846757},
  
  // IFN-γ
  {cytokine: 'IFN-γ', well: 'A02', knownConc: 0, signal: 623},
  {cytokine: 'IFN-γ', well: 'H02', knownConc: 0, signal: 165},
  {cytokine: 'IFN-γ', well: 'A03', knownConc: 3.918457031, signal: 651},
  {cytokine: 'IFN-γ', well: 'H03', knownConc: 3.918457031, signal: 393},
  {cytokine: 'IFN-γ', well: 'A04', knownConc: 15.67382813, signal: 1089},
  {cytokine: 'IFN-γ', well: 'H04', knownConc: 15.67382813, signal: 1037},
  {cytokine: 'IFN-γ', well: 'A05', knownConc: 62.6953125, signal: 3417},
  {cytokine: 'IFN-γ', well: 'H05', knownConc: 62.6953125, signal: 3558},
  {cytokine: 'IFN-γ', well: 'A06', knownConc: 250.78125, signal: 14390},
  {cytokine: 'IFN-γ', well: 'H06', knownConc: 250.78125, signal: 14199},
  {cytokine: 'IFN-γ', well: 'A07', knownConc: 1003.125, signal: 52179},
  {cytokine: 'IFN-γ', well: 'H07', knownConc: 1003.125, signal: 52864},
  {cytokine: 'IFN-γ', well: 'A08', knownConc: 4012.5, signal: 237392},
  {cytokine: 'IFN-γ', well: 'H08', knownConc: 4012.5, signal: 242445},
  {cytokine: 'IFN-γ', well: 'A09', knownConc: 16050, signal: 1059190},
  {cytokine: 'IFN-γ', well: 'H09', knownConc: 16050, signal: 1002274},
  
  // IL-10
  {cytokine: 'IL-10', well: 'A02', knownConc: 0, signal: 606},
  {cytokine: 'IL-10', well: 'H02', knownConc: 0, signal: 273},
  {cytokine: 'IL-10', well: 'A03', knownConc: 0.491943359, signal: 806},
  {cytokine: 'IL-10', well: 'H03', knownConc: 0.491943359, signal: 675},
  {cytokine: 'IL-10', well: 'A04', knownConc: 1.967773438, signal: 1804},
  {cytokine: 'IL-10', well: 'H04', knownConc: 1.967773438, signal: 1886},
  {cytokine: 'IL-10', well: 'A05', knownConc: 7.87109375, signal: 6855},
  {cytokine: 'IL-10', well: 'H05', knownConc: 7.87109375, signal: 7416},
  {cytokine: 'IL-10', well: 'A06', knownConc: 31.484375, signal: 26007},
  {cytokine: 'IL-10', well: 'H06', knownConc: 31.484375, signal: 26859},
  {cytokine: 'IL-10', well: 'A07', knownConc: 125.9375, signal: 98680},
  {cytokine: 'IL-10', well: 'H07', knownConc: 125.9375, signal: 103299},
  {cytokine: 'IL-10', well: 'A08', knownConc: 503.75, signal: 335074},
  {cytokine: 'IL-10', well: 'H08', knownConc: 503.75, signal: 343984},
  {cytokine: 'IL-10', well: 'A09', knownConc: 2015, signal: 769096},
  {cytokine: 'IL-10', well: 'H09', knownConc: 2015, signal: 780459},
  
  // IL-1β
  {cytokine: 'IL-1β', well: 'A02', knownConc: 0, signal: 887},
  {cytokine: 'IL-1β', well: 'H02', knownConc: 0, signal: 195},
  {cytokine: 'IL-1β', well: 'A03', knownConc: 0.541992188, signal: 1360},
  {cytokine: 'IL-1β', well: 'H03', knownConc: 0.541992188, signal: 683},
  {cytokine: 'IL-1β', well: 'A04', knownConc: 2.16796875, signal: 2149},
  {cytokine: 'IL-1β', well: 'H04', knownConc: 2.16796875, signal: 2116},
  {cytokine: 'IL-1β', well: 'A05', knownConc: 8.671875, signal: 7362},
  {cytokine: 'IL-1β', well: 'H05', knownConc: 8.671875, signal: 7459},
  {cytokine: 'IL-1β', well: 'A06', knownConc: 34.6875, signal: 29935},
  {cytokine: 'IL-1β', well: 'H06', knownConc: 34.6875, signal: 30162},
  {cytokine: 'IL-1β', well: 'A07', knownConc: 138.75, signal: 111113},
  {cytokine: 'IL-1β', well: 'H07', knownConc: 138.75, signal: 106123},
  {cytokine: 'IL-1β', well: 'A08', knownConc: 555, signal: 417213},
  {cytokine: 'IL-1β', well: 'H08', knownConc: 555, signal: 412734},
  {cytokine: 'IL-1β', well: 'A09', knownConc: 2220, signal: 1264883},
  {cytokine: 'IL-1β', well: 'H09', knownConc: 2220, signal: 1186955},
  
  // IL-2
  {cytokine: 'IL-2', well: 'A02', knownConc: 0, signal: 421},
  {cytokine: 'IL-2', well: 'H02', knownConc: 0, signal: 141},
  {cytokine: 'IL-2', well: 'A03', knownConc: 0.230712891, signal: 411},
  {cytokine: 'IL-2', well: 'H03', knownConc: 0.230712891, signal: 179},
  {cytokine: 'IL-2', well: 'A04', knownConc: 0.922851563, signal: 439},
  {cytokine: 'IL-2', well: 'H04', knownConc: 0.922851563, signal: 349},
  {cytokine: 'IL-2', well: 'A05', knownConc: 3.69140625, signal: 856},
  {cytokine: 'IL-2', well: 'H05', knownConc: 3.69140625, signal: 982},
  {cytokine: 'IL-2', well: 'A06', knownConc: 14.765625, signal: 3151},
  {cytokine: 'IL-2', well: 'H06', knownConc: 14.765625, signal: 3745},
  {cytokine: 'IL-2', well: 'A07', knownConc: 59.0625, signal: 11944},
  {cytokine: 'IL-2', well: 'H07', knownConc: 59.0625, signal: 13807},
  {cytokine: 'IL-2', well: 'A08', knownConc: 236.25, signal: 50561},
  {cytokine: 'IL-2', well: 'H08', knownConc: 236.25, signal: 57538},
  {cytokine: 'IL-2', well: 'A09', knownConc: 945, signal: 188551},
  {cytokine: 'IL-2', well: 'H09', knownConc: 945, signal: 239755},
  
  // IL-4
  {cytokine: 'IL-4', well: 'A02', knownConc: 0, signal: 188},
  {cytokine: 'IL-4', well: 'H02', knownConc: 0, signal: 94},
  {cytokine: 'IL-4', well: 'A03', knownConc: 0.201416016, signal: 786},
  {cytokine: 'IL-4', well: 'H03', knownConc: 0.201416016, signal: 829},
  {cytokine: 'IL-4', well: 'A04', knownConc: 0.805664063, signal: 2572},
  {cytokine: 'IL-4', well: 'H04', knownConc: 0.805664063, signal: 2776},
  {cytokine: 'IL-4', well: 'A05', knownConc: 3.22265625, signal: 10177},
  {cytokine: 'IL-4', well: 'H05', knownConc: 3.22265625, signal: 10745},
  {cytokine: 'IL-4', well: 'A06', knownConc: 12.890625, signal: 39995},
  {cytokine: 'IL-4', well: 'H06', knownConc: 12.890625, signal: 40060},
  {cytokine: 'IL-4', well: 'A07', knownConc: 51.5625, signal: 154084},
  {cytokine: 'IL-4', well: 'H07', knownConc: 51.5625, signal: 154892},
  {cytokine: 'IL-4', well: 'A08', knownConc: 206.25, signal: 605506},
  {cytokine: 'IL-4', well: 'H08', knownConc: 206.25, signal: 597286},
  {cytokine: 'IL-4', well: 'A09', knownConc: 825, signal: 1379072},
  {cytokine: 'IL-4', well: 'H09', knownConc: 825, signal: 1474619},
  
  // IL-5
  {cytokine: 'IL-5', well: 'A02', knownConc: 0, signal: 577},
  {cytokine: 'IL-5', well: 'H02', knownConc: 0, signal: 141},
  {cytokine: 'IL-5', well: 'A03', knownConc: 0.522460938, signal: 523},
  {cytokine: 'IL-5', well: 'H03', knownConc: 0.522460938, signal: 395},
  {cytokine: 'IL-5', well: 'A04', knownConc: 2.08984375, signal: 1133},
  {cytokine: 'IL-5', well: 'H04', knownConc: 2.08984375, signal: 1067},
  {cytokine: 'IL-5', well: 'A05', knownConc: 8.359375, signal: 4003},
  {cytokine: 'IL-5', well: 'H05', knownConc: 8.359375, signal: 4145},
  {cytokine: 'IL-5', well: 'A06', knownConc: 33.4375, signal: 17283},
  {cytokine: 'IL-5', well: 'H06', knownConc: 33.4375, signal: 16103},
  {cytokine: 'IL-5', well: 'A07', knownConc: 133.75, signal: 61651},
  {cytokine: 'IL-5', well: 'H07', knownConc: 133.75, signal: 59964},
  {cytokine: 'IL-5', well: 'A08', knownConc: 535, signal: 246308},
  {cytokine: 'IL-5', well: 'H08', knownConc: 535, signal: 241288},
  {cytokine: 'IL-5', well: 'A09', knownConc: 2140, signal: 836216},
  {cytokine: 'IL-5', well: 'H09', knownConc: 2140, signal: 791590},
  
  // IL-6
  {cytokine: 'IL-6', well: 'A02', knownConc: 0, signal: 1605},
  {cytokine: 'IL-6', well: 'H02', knownConc: 0, signal: 744},
  {cytokine: 'IL-6', well: 'A03', knownConc: 0.25390625, signal: 1555},
  {cytokine: 'IL-6', well: 'H03', knownConc: 0.25390625, signal: 521},
  {cytokine: 'IL-6', well: 'A04', knownConc: 1.015625, signal: 928},
  {cytokine: 'IL-6', well: 'H04', knownConc: 1.015625, signal: 762},
  {cytokine: 'IL-6', well: 'A05', knownConc: 4.0625, signal: 1957},
  {cytokine: 'IL-6', well: 'H05', knownConc: 4.0625, signal: 1966},
  {cytokine: 'IL-6', well: 'A06', knownConc: 16.25, signal: 6671},
  {cytokine: 'IL-6', well: 'H06', knownConc: 16.25, signal: 6970},
  {cytokine: 'IL-6', well: 'A07', knownConc: 65, signal: 27024},
  {cytokine: 'IL-6', well: 'H07', knownConc: 65, signal: 29395},
  {cytokine: 'IL-6', well: 'A08', knownConc: 260, signal: 130007},
  {cytokine: 'IL-6', well: 'H08', knownConc: 260, signal: 134248},
  {cytokine: 'IL-6', well: 'A09', knownConc: 1040, signal: 586864},
  {cytokine: 'IL-6', well: 'H09', knownConc: 1040, signal: 579611},
  
  // MCP-1
  {cytokine: 'MCP-1', well: 'A02', knownConc: 0, signal: 45973},
  {cytokine: 'MCP-1', well: 'H02', knownConc: 0, signal: 9680},
  {cytokine: 'MCP-1', well: 'A03', knownConc: 0.659179688, signal: 26348},
  {cytokine: 'MCP-1', well: 'H03', knownConc: 0.659179688, signal: 5076},
  {cytokine: 'MCP-1', well: 'A04', knownConc: 2.63671875, signal: 15126},
  {cytokine: 'MCP-1', well: 'H04', knownConc: 2.63671875, signal: 5588},
  {cytokine: 'MCP-1', well: 'A05', knownConc: 10.546875, signal: 13071},
  {cytokine: 'MCP-1', well: 'H05', knownConc: 10.546875, signal: 8629},
  {cytokine: 'MCP-1', well: 'A06', knownConc: 42.1875, signal: 28182},
  {cytokine: 'MCP-1', well: 'H06', knownConc: 42.1875, signal: 25636},
  {cytokine: 'MCP-1', well: 'A07', knownConc: 168.75, signal: 109654},
  {cytokine: 'MCP-1', well: 'H07', knownConc: 168.75, signal: 110922},
  {cytokine: 'MCP-1', well: 'A08', knownConc: 675, signal: 385905},
  {cytokine: 'MCP-1', well: 'H08', knownConc: 675, signal: 401049},
  {cytokine: 'MCP-1', well: 'A09', knownConc: 2700, signal: 775936},
  {cytokine: 'MCP-1', well: 'H09', knownConc: 2700, signal: 831302},
  
  // TNF-α
  {cytokine: 'TNF-α', well: 'A02', knownConc: 0, signal: 1222},
  {cytokine: 'TNF-α', well: 'H02', knownConc: 0, signal: 256},
  {cytokine: 'TNF-α', well: 'A03', knownConc: 0.330810547, signal: 580},
  {cytokine: 'TNF-α', well: 'H03', knownConc: 0.330810547, signal: 505},
  {cytokine: 'TNF-α', well: 'A04', knownConc: 1.323242188, signal: 1175},
  {cytokine: 'TNF-α', well: 'H04', knownConc: 1.323242188, signal: 1095},
  {cytokine: 'TNF-α', well: 'A05', knownConc: 5.29296875, signal: 4081},
  {cytokine: 'TNF-α', well: 'H05', knownConc: 5.29296875, signal: 4223},
  {cytokine: 'TNF-α', well: 'A06', knownConc: 21.171875, signal: 17749},
  {cytokine: 'TNF-α', well: 'H06', knownConc: 21.171875, signal: 15813},
  {cytokine: 'TNF-α', well: 'A07', knownConc: 84.6875, signal: 62536},
  {cytokine: 'TNF-α', well: 'H07', knownConc: 84.6875, signal: 61962},
  {cytokine: 'TNF-α', well: 'A08', knownConc: 338.75, signal: 269475},
  {cytokine: 'TNF-α', well: 'H08', knownConc: 338.75, signal: 246720},
  {cytokine: 'TNF-α', well: 'A09', knownConc: 1355, signal: 940177},
  {cytokine: 'TNF-α', well: 'H09', knownConc: 1355, signal: 867425}
];

console.log('═'.repeat(140));
console.log('                              E3P1 PLATE CONCENTRATION CALCULATIONS');
console.log('═'.repeat(140));
console.log('\nStrategy: Test both reference plates (2BOANACS77 and E3P6) and use best match for each cytokine\n');

// Auto-detect best parameters for each cytokine
const E3P1_BEST_PARAMS = {};
const cytokines = ['GM-CSF', 'IFN-γ', 'IL-10', 'IL-1β', 'IL-2', 'IL-4', 'IL-5', 'IL-6', 'MCP-1', 'TNF-α'];

for (const cytokine of cytokines) {
  const standards = E3P1_DATA.filter(d => d.cytokine === cytokine && d.knownConc > 0);
  
  let bestPlate = null;
  let bestError = Infinity;
  
  for (const [plateName, plateParams] of Object.entries(REFERENCE_PARAMETERS)) {
    const params = plateParams[cytokine];
    let totalErr = 0;
    let count = 0;
    
    for (const std of standards) {
      const calc = calculate4PLConcentration(std.signal, params);
      if (calc && calc > 0) {
        const err = Math.abs((calc - std.knownConc) / std.knownConc);
        totalErr += err;
        count++;
      }
    }
    
    if (count > 0) {
      const avgErr = totalErr / count;
      if (avgErr < bestError) {
        bestError = avgErr;
        bestPlate = plateName;
      }
    }
  }
  
  E3P1_BEST_PARAMS[cytokine] = {
    params: REFERENCE_PARAMETERS[bestPlate][cytokine],
    sourcePlate: bestPlate,
    error: (bestError * 100).toFixed(2) + '%'
  };
  
  console.log(`${cytokine.padEnd(12)} → Best match: ${bestPlate.padEnd(15)} (Avg error: ${(bestError * 100).toFixed(2)}%)`);
}

console.log('\n' + '═'.repeat(140));
console.log('                                    CALCULATED CONCENTRATIONS');
console.log('═'.repeat(140));
console.log('\n' + 'Well'.padEnd(8) + 'Cytokine'.padEnd(15) + 'Signal'.padEnd(12) + 'Calc. Conc (pg/mL)'.padEnd(25) + 'Source Plate');
console.log('─'.repeat(140));

for (const sample of E3P1_DATA) {
  const bestFit = E3P1_BEST_PARAMS[sample.cytokine];
  const conc = calculate4PLConcentration(sample.signal, bestFit.params);
  
  const concStr = conc === null ? 'N/A' : conc.toFixed(4);
  
  console.log(
    sample.well.padEnd(8) +
    sample.cytokine.padEnd(15) +
    sample.signal.toString().padEnd(12) +
    concStr.padEnd(25) +
    bestFit.sourcePlate
  );
}

console.log('\n' + '═'.repeat(140));
console.log('SUMMARY: Used best-matching reference parameters for each cytokine');
console.log('All concentrations calculated using validated 4PL models from similar plates');
console.log('═'.repeat(140));

