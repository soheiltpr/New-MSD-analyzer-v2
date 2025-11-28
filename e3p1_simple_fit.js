// Simple E3P1 4PL fitting - exactly as requested
// Take standards, fit with 1/y² and 500 iterations, calculate concentrations

const msd_log10 = x => Math.log10(Math.max(x, 1e-10));

const msd_y4pl_logx = (p, xlog) => {
  const t = Math.pow(10, xlog - p.Clog);
  return p.A + (p.D - p.A) / (1 + Math.pow(t, p.B));
};

const msd_loss4pl = (p, xlog, y, w) => {
  let sse = 0;
  for (let i=0; i<xlog.length; i++){
    const yhat = msd_y4pl_logx(p, xlog[i]);
    sse += w[i]*Math.pow(y[i] - yhat, 2);
  }
  return sse;
};

const msd_nelderMead = (fn, start, maxIter=500) => {
  const n = start.length;
  let simplex = [start.slice()];
  for (let i=0; i<n; i++){
    const p = start.slice();
    p[i] = p[i] * 1.05;
    simplex.push(p);
  }
  
  let values = simplex.map(fn);
  
  for (let iter=0; iter<maxIter; iter++){
    const idx = values.map((v,i)=>[v,i]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
    simplex = idx.map(k=>simplex[k]);
    values = idx.map(k=>values[k]);
    
    if (Math.abs(values[values.length-1] - values[0]) < 1e-10) break;
    
    const worst = simplex.length-1;
    const c = new Array(n).fill(0);
    for (let i=0; i<simplex.length-1; i++){
      for (let j=0; j<n; j++) c[j] += simplex[i][j];
    }
    for (let j=0; j<n; j++) c[j] /= (simplex.length-1);
    
    const xr = c.map((ci, j)=> ci + (ci - simplex[worst][j]));
    const fr = fn(xr);
    
    if (fr < values[0]){
      const xe = c.map((ci, j)=> ci + 2*(xr[j] - ci));
      const fe = fn(xe);
      simplex[worst] = (fe < fr) ? xe : xr;
      values[worst] = (fe < fr) ? fe : fr;
    } else if (fr < values[worst-1]){
      simplex[worst] = xr;
      values[worst] = fr;
    } else {
      const xc = c.map((ci, j)=> ci + 0.5*(simplex[worst][j] - ci));
      const fc = fn(xc);
      if (fc < values[worst]){
        simplex[worst] = xc;
        values[worst] = fc;
      } else {
        for (let i=1; i<simplex.length; i++){
          simplex[i] = simplex[0].map((s0j, j)=> s0j + 0.5*(simplex[i][j]-s0j));
          values[i] = fn(simplex[i]);
        }
      }
    }
  }
  
  return simplex[values.indexOf(Math.min(...values))];
};

function calculate4PL(signal, top, bottom, midpoint, hillslope) {
  if (signal <= bottom) return null;
  if (signal >= top) return null;
  const numerator = (top - bottom) / (signal - bottom) - 1;
  if (numerator <= 0) return null;
  return midpoint / Math.pow(numerator, 1/hillslope);
}

// E3P1 All Data
const E3P1_DATA = {
  'GM-CSF': {
    standards: [[1.127929688,1278],[1.127929688,1611],[4.51171875,4529],[4.51171875,5797],[18.046875,18374],[18.046875,21263],[72.1875,74083],[72.1875,84188],[288.75,270599],[288.75,304331],[1155,1070008],[1155,1143081],[4620,1809801],[4620,1846757]],
    all: [[0,207],[0,113],[1.127929688,1278],[1.127929688,1611],[4.51171875,4529],[4.51171875,5797],[18.046875,18374],[18.046875,21263],[72.1875,74083],[72.1875,84188],[288.75,270599],[288.75,304331],[1155,1070008],[1155,1143081],[4620,1809801],[4620,1846757]]
  },
  'IFN-γ': {
    standards: [[3.918457031,651],[3.918457031,393],[15.67382813,1089],[15.67382813,1037],[62.6953125,3417],[62.6953125,3558],[250.78125,14390],[250.78125,14199],[1003.125,52179],[1003.125,52864],[4012.5,237392],[4012.5,242445],[16050,1059190],[16050,1002274]],
    all: [[0,623],[0,165],[3.918457031,651],[3.918457031,393],[15.67382813,1089],[15.67382813,1037],[62.6953125,3417],[62.6953125,3558],[250.78125,14390],[250.78125,14199],[1003.125,52179],[1003.125,52864],[4012.5,237392],[4012.5,242445],[16050,1059190],[16050,1002274]]
  },
  'IL-10': {
    standards: [[0.491943359,806],[0.491943359,675],[1.967773438,1804],[1.967773438,1886],[7.87109375,6855],[7.87109375,7416],[31.484375,26007],[31.484375,26859],[125.9375,98680],[125.9375,103299],[503.75,335074],[503.75,343984],[2015,769096],[2015,780459]],
    all: [[0,606],[0,273],[0.491943359,806],[0.491943359,675],[1.967773438,1804],[1.967773438,1886],[7.87109375,6855],[7.87109375,7416],[31.484375,26007],[31.484375,26859],[125.9375,98680],[125.9375,103299],[503.75,335074],[503.75,343984],[2015,769096],[2015,780459]]
  },
  'IL-1β': {
    standards: [[0.541992188,1360],[0.541992188,683],[2.16796875,2149],[2.16796875,2116],[8.671875,7362],[8.671875,7459],[34.6875,29935],[34.6875,30162],[138.75,111113],[138.75,106123],[555,417213],[555,412734],[2220,1264883],[2220,1186955]],
    all: [[0,887],[0,195],[0.541992188,1360],[0.541992188,683],[2.16796875,2149],[2.16796875,2116],[8.671875,7362],[8.671875,7459],[34.6875,29935],[34.6875,30162],[138.75,111113],[138.75,106123],[555,417213],[555,412734],[2220,1264883],[2220,1186955]]
  },
  'IL-2': {
    standards: [[0.230712891,411],[0.230712891,179],[0.922851563,439],[0.922851563,349],[3.69140625,856],[3.69140625,982],[14.765625,3151],[14.765625,3745],[59.0625,11944],[59.0625,13807],[236.25,50561],[236.25,57538],[945,188551],[945,239755]],
    all: [[0,421],[0,141],[0.230712891,411],[0.230712891,179],[0.922851563,439],[0.922851563,349],[3.69140625,856],[3.69140625,982],[14.765625,3151],[14.765625,3745],[59.0625,11944],[59.0625,13807],[236.25,50561],[236.25,57538],[945,188551],[945,239755]]
  },
  'IL-4': {
    standards: [[0.201416016,786],[0.201416016,829],[0.805664063,2572],[0.805664063,2776],[3.22265625,10177],[3.22265625,10745],[12.890625,39995],[12.890625,40060],[51.5625,154084],[51.5625,154892],[206.25,605506],[206.25,597286],[825,1379072],[825,1474619]],
    all: [[0,188],[0,94],[0.201416016,786],[0.201416016,829],[0.805664063,2572],[0.805664063,2776],[3.22265625,10177],[3.22265625,10745],[12.890625,39995],[12.890625,40060],[51.5625,154084],[51.5625,154892],[206.25,605506],[206.25,597286],[825,1379072],[825,1474619]]
  },
  'IL-5': {
    standards: [[0.522460938,523],[0.522460938,395],[2.08984375,1133],[2.08984375,1067],[8.359375,4003],[8.359375,4145],[33.4375,17283],[33.4375,16103],[133.75,61651],[133.75,59964],[535,246308],[535,241288],[2140,836216],[2140,791590]],
    all: [[0,577],[0,141],[0.522460938,523],[0.522460938,395],[2.08984375,1133],[2.08984375,1067],[8.359375,4003],[8.359375,4145],[33.4375,17283],[33.4375,16103],[133.75,61651],[133.75,59964],[535,246308],[535,241288],[2140,836216],[2140,791590]]
  },
  'IL-6': {
    standards: [[0.25390625,1555],[0.25390625,521],[1.015625,928],[1.015625,762],[4.0625,1957],[4.0625,1966],[16.25,6671],[16.25,6970],[65,27024],[65,29395],[260,130007],[260,134248],[1040,586864],[1040,579611]],
    all: [[0,1605],[0,744],[0.25390625,1555],[0.25390625,521],[1.015625,928],[1.015625,762],[4.0625,1957],[4.0625,1966],[16.25,6671],[16.25,6970],[65,27024],[65,29395],[260,130007],[260,134248],[1040,586864],[1040,579611]]
  },
  'MCP-1': {
    standards: [[0.659179688,26348],[0.659179688,5076],[2.63671875,15126],[2.63671875,5588],[10.546875,13071],[10.546875,8629],[42.1875,28182],[42.1875,25636],[168.75,109654],[168.75,110922],[675,385905],[675,401049],[2700,775936],[2700,831302]],
    all: [[0,45973],[0,9680],[0.659179688,26348],[0.659179688,5076],[2.63671875,15126],[2.63671875,5588],[10.546875,13071],[10.546875,8629],[42.1875,28182],[42.1875,25636],[168.75,109654],[168.75,110922],[675,385905],[675,401049],[2700,775936],[2700,831302]]
  },
  'TNF-α': {
    standards: [[0.330810547,580],[0.330810547,505],[1.323242188,1175],[1.323242188,1095],[5.29296875,4081],[5.29296875,4223],[21.171875,17749],[21.171875,15813],[84.6875,62536],[84.6875,61962],[338.75,269475],[338.75,246720],[1355,940177],[1355,867425]],
    all: [[0,1222],[0,256],[0.330810547,580],[0.330810547,505],[1.323242188,1175],[1.323242188,1095],[5.29296875,4081],[5.29296875,4223],[21.171875,17749],[21.171875,15813],[84.6875,62536],[84.6875,61962],[338.75,269475],[338.75,246720],[1355,940177],[1355,867425]]
  }
};

console.log('═'.repeat(120));
console.log('                              E3P1 SIMPLE 4PL FITTING');
console.log('═'.repeat(120));
console.log('\n✅ Method: 1/y² weighted 4PL');
console.log('✅ Iterations: 500');
console.log('✅ Data: E3P1 standards only\n');

const results = {};

for (const [cytokine, data] of Object.entries(E3P1_DATA)) {
  const standards = data.standards;
  const conc = standards.map(d => d[0]);
  const signals = standards.map(d => d[1]);
  
  const xlog = conc.map(x => msd_log10(x));
  const y = signals;
  const w = y.map(v => 1/Math.pow(v,2)); // 1/y²
  
  // Initial guess
  const A0 = Math.min(...y);
  const D0 = Math.max(...y);
  const C0log = (msd_log10(conc[0]) + msd_log10(conc[conc.length-1])) / 2;
  const B0 = 1.0;
  
  const start = [A0, D0, C0log, B0];
  const fn = (p) => msd_loss4pl({A:p[0], D:p[1], Clog:p[2], B:p[3]}, xlog, y, w);
  
  const fit = msd_nelderMead(fn, start, 500);
  
  const top = fit[1];
  const bottom = fit[0];
  const midpoint = Math.pow(10, fit[2]);
  const hillslope = fit[3];
  
  results[cytokine] = { top, bottom, midpoint, hillslope };
  
  console.log(`\n${cytokine}:`);
  console.log(`  Top:       ${top.toFixed(2)}`);
  console.log(`  Bottom:    ${bottom.toFixed(2)}`);
  console.log(`  MidPoint:  ${midpoint.toFixed(2)}`);
  console.log(`  HillSlope: ${hillslope.toFixed(6)}`);
}

console.log('\n' + '═'.repeat(120));
console.log('CALCULATED CONCENTRATIONS FOR ALL SAMPLES:');
console.log('═'.repeat(120));

let csvLines = ['Well,Cytokine,Signal,Calculated Concentration (pg/mL)'];
const wells = ['A02','H02','A03','H03','A04','H04','A05','H05','A06','H06','A07','H07','A08','H08','A09','H09'];

for (const [cytokine, data] of Object.entries(E3P1_DATA)) {
  const params = results[cytokine];
  const allData = data.all;
  
  console.log(`\n${cytokine}:`);
  console.log('Well'.padEnd(8) + 'Signal'.padEnd(12) + 'Calc. Conc (pg/mL)');
  console.log('-'.repeat(60));
  
  for (let i = 0; i < allData.length; i++) {
    const [knownConc, signal] = allData[i];
    const well = wells[i];
    const calcConc = calculate4PL(signal, params.top, params.bottom, params.midpoint, params.hillslope);
    const concStr = calcConc ? calcConc.toFixed(4) : 'N/A';
    
    console.log(well.padEnd(8) + signal.toString().padEnd(12) + concStr);
    csvLines.push(`${well},${cytokine},${signal},${calcConc ? calcConc.toFixed(4) : 'N/A'}`);
  }
}

console.log('\n' + '═'.repeat(120));
console.log('E3P1 PARAMETERS (for your application):');
console.log('═'.repeat(120));
console.log('\nconst E3P1_PARAMETERS = {');
for (const [cytokine, params] of Object.entries(results)) {
  console.log(`  '${cytokine}': { Top: ${params.top}, Bottom: ${params.bottom}, MidPoint: ${params.midpoint}, HillSlope: ${params.hillslope} },`);
}
console.log('};');

// Write CSV
const fs = require('fs');
fs.writeFileSync('E3P1_final_results.csv', csvLines.join('\n'));
console.log('\n✅ Results saved to E3P1_final_results.csv');

