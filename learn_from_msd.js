// Learn from MSD's results and calculate remaining cytokines

function msd_mean(arr) { 
  return arr.reduce((a, b) => a + b, 0) / arr.length; 
}

function msd_log10(v) { 
  return Math.log(Math.max(v, 1e-10)) / Math.LN10; 
}

// MSD's actual results
const msdResults = {
  'GM-CSF': {
    initial: {Top: 1843197.48, Bottom: 100.35, MidPoint: 907.0416648, HillSlope: 1},
    final: {Top: 2872984.579, Bottom: 111.8709399, MidPoint: 2272.194663, HillSlope: 1.006124995, R2: 0.9864277}
  },
  'IFN-γ': {
    initial: {Top: 1054040.545, Bottom: 134.1, MidPoint: 8171.417512, HillSlope: 1},
    final: {Top: 782000000, Bottom: 152.4633088, MidPoint: 11000000, HillSlope: 1.020428582, R2: 0.999922717}
  },
  'IL-10': {
    initial: {Top: 899008.575, Bottom: 100.8, MidPoint: 722.801293, HillSlope: 1},
    final: {Top: 1722572.074, Bottom: 112.303111, MidPoint: 1879.847053, HillSlope: 0.984193073, R2: 0.999996608}
  },
  'IL-1β': {
    initial: {Top: 1364411.525, Bottom: 163.8, MidPoint: 950.4921655, HillSlope: 1},
    final: {Top: 4297377.307, Bottom: 183.0740022, MidPoint: 4882.57102, HillSlope: 0.979151601, R2: 0.999938246}
  },
  'IL-2': {
    initial: {Top: 237773.19, Bottom: 137.7, MidPoint: 476.1007947, HillSlope: 1},
    final: {Top: 86800000, Bottom: 148.6760184, MidPoint: 327051.1635, HillSlope: 1.011873945, R2: 0.999991694}
  }
};

// User's data
const allData = {
  'GM-CSF': {
    zero: [97, 126],
    standards: [
      {conc: 1.127929688, signals: [1565, 1539]},
      {conc: 4.51171875, signals: [5608, 5499]},
      {conc: 18.046875, signals: [21685, 21238]},
      {conc: 72.1875, signals: [84356, 81394]},
      {conc: 288.75, signals: [316293, 303440]},
      {conc: 1155, signals: [1187641, 1120800]},
      {conc: 4620, signals: [1783080, 1866816]}
    ]
  },
  'IFN-γ': {
    zero: [150, 148],
    standards: [
      {conc: 3.918457031, signals: [391, 365]},
      {conc: 15.67382813, signals: [1048, 1000]},
      {conc: 62.6953125, signals: [3607, 3399]},
      {conc: 250.78125, signals: [14542, 14201]},
      {conc: 1003.125, signals: [56429, 54196]},
      {conc: 4012.5, signals: [245673, 247265]},
      {conc: 16050, signals: [1051645, 1035564]}
    ]
  },
  'IL-10': {
    zero: [104, 120],
    standards: [
      {conc: 0.491943359, signals: [635, 648]},
      {conc: 1.967773438, signals: [2069, 2039]},
      {conc: 7.87109375, signals: [7924, 8153]},
      {conc: 31.484375, signals: [30565, 29476]},
      {conc: 125.9375, signals: [113116, 115140]},
      {conc: 503.75, signals: [375135, 364214]},
      {conc: 2015, signals: [878108, 902107]}
    ]
  },
  'IL-1β': {
    zero: [165, 199],
    standards: [
      {conc: 0.541992188, signals: [787, 781]},
      {conc: 2.16796875, signals: [2430, 2379]},
      {conc: 8.671875, signals: [8732, 8405]},
      {conc: 34.6875, signals: [34437, 33837]},
      {conc: 138.75, signals: [128211, 126988]},
      {conc: 555, signals: [471110, 459182]},
      {conc: 2220, signals: [1392601, 1309204]}
    ]
  },
  'IL-2': {
    zero: [132, 174],
    standards: [
      {conc: 0.230712891, signals: [183, 200]},
      {conc: 0.922851563, signals: [360, 369]},
      {conc: 3.69140625, signals: [999, 1047]},
      {conc: 14.765625, signals: [3660, 3675]},
      {conc: 59.0625, signals: [14047, 13776]},
      {conc: 236.25, signals: [58124, 57105]},
      {conc: 945, signals: [231453, 239385]}
    ]
  },
  'IL-4': {
    zero: [88, 96],
    standards: [
      {conc: 0.201416016, signals: [787, 734]},
      {conc: 0.805664063, signals: [2447, 2327]},
      {conc: 3.22265625, signals: [9827, 9557]},
      {conc: 12.890625, signals: [38279, 36754]},
      {conc: 51.5625, signals: [149440, 149013]},
      {conc: 206.25, signals: [571725, 558238]},
      {conc: 825, signals: [1386830, 1458066]}
    ]
  },
  'IL-5': {
    zero: [152, 167],
    standards: [
      {conc: 0.522460938, signals: [472, 472]},
      {conc: 2.08984375, signals: [1316, 1230]},
      {conc: 8.359375, signals: [4678, 4438]},
      {conc: 33.4375, signals: [18326, 16898]},
      {conc: 133.75, signals: [70241, 67645]},
      {conc: 535, signals: [273830, 260724]},
      {conc: 2140, signals: [916569, 870606]}
    ]
  },
  'IL-6': {
    zero: [117, 126],
    standards: [
      {conc: 0.25390625, signals: [239, 257]},
      {conc: 1.015625, signals: [553, 612]},
      {conc: 4.0625, signals: [1832, 1850]},
      {conc: 16.25, signals: [7349, 7109]},
      {conc: 65, signals: [30599, 30087]},
      {conc: 260, signals: [142686, 134401]},
      {conc: 1040, signals: [597631, 600164]}
    ]
  },
  'MCP-1': {
    zero: [111, 178],
    standards: [
      {conc: 0.659179688, signals: [420, 499]},
      {conc: 2.63671875, signals: [1239, 1189]},
      {conc: 10.546875, signals: [4670, 4625]},
      {conc: 42.1875, signals: [21550, 20053]},
      {conc: 168.75, signals: [112796, 110921]},
      {conc: 675, signals: [454545, 437231]},
      {conc: 2700, signals: [916556, 927463]}
    ]
  },
  'TNF-α': {
    zero: [200, 240],
    standards: [
      {conc: 0.330810547, signals: [492, 491]},
      {conc: 1.323242188, signals: [1354, 1191]},
      {conc: 5.29296875, signals: [4657, 4579]},
      {conc: 21.171875, signals: [18170, 17121]},
      {conc: 84.6875, signals: [71400, 71792]},
      {conc: 338.75, signals: [285538, 272065]},
      {conc: 1355, signals: [969965, 1008205]}
    ]
  }
};

console.log('='.repeat(100));
console.log('ANALYZING MSD RESULTS');
console.log('='.repeat(100));

// Check if our initial guesses match MSD's
for (const [cytokine, msd] of Object.entries(msdResults)) {
  const data = allData[cytokine];
  const zeroMean = msd_mean(data.zero);
  const meanSignals = data.standards.map(s => msd_mean(s.signals));
  const maxSignal = Math.max(...meanSignals);
  
  const ourBottom = zeroMean * 0.9;
  const ourTop = maxSignal * 1.01;
  
  console.log(`\n${cytokine}:`);
  console.log(`  Our Bottom: ${ourBottom.toFixed(2)}, MSD Initial: ${msd.initial.Bottom.toFixed(2)}, Diff: ${Math.abs(ourBottom - msd.initial.Bottom).toFixed(2)}`);
  console.log(`  Our Top: ${ourTop.toFixed(2)}, MSD Initial: ${msd.initial.Top.toFixed(2)}, Diff: ${Math.abs(ourTop - msd.initial.Top).toFixed(2)}`);
  console.log(`  MSD Final Top: ${msd.final.Top.toFixed(2)}, Final Bottom: ${msd.final.Bottom.toFixed(2)}`);
  console.log(`  MSD Final MidPoint: ${msd.final.MidPoint.toFixed(4)}, HillSlope: ${msd.final.HillSlope.toFixed(6)}`);
}

console.log('\n' + '='.repeat(100));
console.log('OBSERVATIONS:');
console.log('1. Initial guesses match our algorithm (Bottom = zero*0.9, Top = max*1.01)');
console.log('2. Final Top is often much higher than initial (especially for IFN-γ and IL-2)');
console.log('3. Final Bottom is close to initial but slightly higher');
console.log('4. HillSlope stays close to 1.0 for most');
console.log('5. The equation must be: t = 10^(xlog - Clog) for increasing curves');
console.log('   (NOT Clog - xlog as I tried before)');




