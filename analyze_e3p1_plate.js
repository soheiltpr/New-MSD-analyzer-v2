// Analyze E3P1 Plate Data
// Step 1: Fit 4PL parameters from standard curve
// Step 2: Calculate concentrations for all samples

const msd_log10 = x => Math.log10(Math.max(x, 1e-10));
const msd_mean = arr => arr.reduce((a,b) => a+b, 0) / arr.length;
const msd_clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const msd_y4pl_logx = (p, xlog) => {
  const t = Math.pow(10, xlog - p.Clog);
  return p.A + (p.D - p.A) / (1 + Math.pow(t, p.B));
};

const msd_loss4pl = (p, xlog, y, w, h) => {
  let pen = 0;
  if (p.A < h.Amin) pen += Math.pow(h.Amin - p.A, 2)*1e6;
  if (p.D < h.Dmin) pen += Math.pow(h.Dmin - p.D, 2)*1e6;
  if (h.Dmax !== Infinity && p.D > h.Dmax) pen += Math.pow(p.D - h.Dmax, 2)*1e6;
  if (p.B < h.Bmin) pen += Math.pow(h.Bmin - p.B, 2)*1e6;
  if (p.B > h.Bmax) pen += Math.pow(p.B - h.Bmax, 2)*1e6;
  if (p.Clog < h.ClogMin) pen += Math.pow(h.ClogMin - p.Clog, 2)*1e6;
  if (p.Clog > h.ClogMax) pen += Math.pow(p.Clog - h.ClogMax, 2)*1e6;
  let sse = 0;
  for (let i=0; i<xlog.length; i++){
    const yhat = msd_y4pl_logx(p, xlog[i]);
    sse += w[i]*Math.pow(y[i] - yhat, 2);
  }
  return sse + pen;
};

const msd_nelderMead = (fn, start, step=1.0, maxIter=10000, tol=1e-10) => {
  const n = start.length;
  let simplex = [start.slice()];
  for (let i=0; i<n; i++){
    const p = start.slice();
    p[i] = p[i] + (Math.abs(start[i]) + 1)*0.05 + step*0.01;
    simplex.push(p);
  }
  const f = p => fn(p);
  const centroid = (pts, exclude) => {
    const c = new Array(n).fill(0);
    for (let i=0; i<pts.length; i++){
      if (i===exclude) continue;
      for (let j=0; j<n; j++) c[j] += pts[i][j];
    }
    for (let j=0; j<n; j++) c[j] /= (pts.length-1);
    return c;
  };
  let values = simplex.map(f);
  for (let iter=0; iter<maxIter; iter++){
    const idx = values.map((v,i)=>[v,i]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
    simplex = idx.map(k=>simplex[k]);
    values = idx.map(k=>values[k]);
    const fspan = Math.abs(values[values.length-1] - values[0]);
    let pspan = 0;
    for (let j=0; j<n; j++){
      const arr = simplex.map(s=>s[j]);
      pspan = Math.max(pspan, Math.abs(Math.max(...arr)-Math.min(...arr)));
    }
    if (fspan<tol && pspan<1e-7) break;
    const worst = simplex.length-1;
    const c = centroid(simplex, worst);
    const alpha=1.0, gamma=2.0, rho=0.5, sigma=0.5;
    const xr = c.map((ci, j)=> ci + alpha*(ci - simplex[worst][j]));
    const fr = f(xr);
    if (fr < values[0]){
      const xe = c.map((ci, j)=> ci + gamma*(xr[j] - ci));
      const fe = f(xe);
      if (fe < fr){ simplex[worst]=xe; values[worst]=fe; }
      else { simplex[worst]=xr; values[worst]=fr; }
    } else if (fr < values[worst-1]){
      simplex[worst]=xr; values[worst]=fr;
    } else {
      const xc = c.map((ci, j)=> ci + rho*(simplex[worst][j] - ci));
      const fc = f(xc);
      if (fc < values[worst]){ simplex[worst]=xc; values[worst]=fc; }
      else {
        for (let i=1; i<simplex.length; i++){
          simplex[i] = simplex[0].map((s0j, j)=> s0j + sigma*(simplex[i][j]-s0j));
          values[i] = f(simplex[i]);
        }
      }
    }
  }
  const bestIdx = values.indexOf(Math.min(...values));
  return {params: simplex[bestIdx], fval: values[bestIdx]};
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

// E3P1 Standard Curve Data (from user)
const E3P1_STANDARDS = {
  'GM-CSF': [
    [1.127929688, 1278], [1.127929688, 1611], [4.51171875, 4529],
    [4.51171875, 5797], [18.046875, 18374], [18.046875, 21263],
    [72.1875, 74083], [72.1875, 84188], [288.75, 270599],
    [288.75, 304331], [1155, 1070008], [1155, 1143081],
    [4620, 1809801], [4620, 1846757]
  ],
  'IFN-γ': [
    [3.918457031, 651], [3.918457031, 393], [15.67382813, 1089],
    [15.67382813, 1037], [62.6953125, 3417], [62.6953125, 3558],
    [250.78125, 14390], [250.78125, 14199], [1003.125, 52179],
    [1003.125, 52864], [4012.5, 237392], [4012.5, 242445],
    [16050, 1059190], [16050, 1002274]
  ],
  'IL-10': [
    [0.491943359, 806], [0.491943359, 675], [1.967773438, 1804],
    [1.967773438, 1886], [7.87109375, 6855], [7.87109375, 7416],
    [31.484375, 26007], [31.484375, 26859], [125.9375, 98680],
    [125.9375, 103299], [503.75, 335074], [503.75, 343984],
    [2015, 769096], [2015, 780459]
  ],
  'IL-1β': [
    [0.541992188, 1360], [0.541992188, 683], [2.16796875, 2149],
    [2.16796875, 2116], [8.671875, 7362], [8.671875, 7459],
    [34.6875, 29935], [34.6875, 30162], [138.75, 111113],
    [138.75, 106123], [555, 417213], [555, 412734],
    [2220, 1264883], [2220, 1186955]
  ],
  'IL-2': [
    [0.230712891, 411], [0.230712891, 179], [0.922851563, 439],
    [0.922851563, 349], [3.69140625, 856], [3.69140625, 982],
    [14.765625, 3151], [14.765625, 3745], [59.0625, 11944],
    [59.0625, 13807], [236.25, 50561], [236.25, 57538],
    [945, 188551], [945, 239755]
  ],
  'IL-4': [
    [0.201416016, 786], [0.201416016, 829], [0.805664063, 2572],
    [0.805664063, 2776], [3.22265625, 10177], [3.22265625, 10745],
    [12.890625, 39995], [12.890625, 40060], [51.5625, 154084],
    [51.5625, 154892], [206.25, 605506], [206.25, 597286],
    [825, 1379072], [825, 1474619]
  ],
  'IL-5': [
    [0.522460938, 523], [0.522460938, 395], [2.08984375, 1133],
    [2.08984375, 1067], [8.359375, 4003], [8.359375, 4145],
    [33.4375, 17283], [33.4375, 16103], [133.75, 61651],
    [133.75, 59964], [535, 246308], [535, 241288],
    [2140, 836216], [2140, 791590]
  ],
  'IL-6': [
    [0.25390625, 1555], [0.25390625, 521], [1.015625, 928],
    [1.015625, 762], [4.0625, 1957], [4.0625, 1966],
    [16.25, 6671], [16.25, 6970], [65, 27024],
    [65, 29395], [260, 130007], [260, 134248],
    [1040, 586864], [1040, 579611]
  ],
  'MCP-1': [
    [0.659179688, 26348], [0.659179688, 5076], [2.63671875, 15126],
    [2.63671875, 5588], [10.546875, 13071], [10.546875, 8629],
    [42.1875, 28182], [42.1875, 25636], [168.75, 109654],
    [168.75, 110922], [675, 385905], [675, 401049],
    [2700, 775936], [2700, 831302]
  ],
  'TNF-α': [
    [0.330810547, 580], [0.330810547, 505], [1.323242188, 1175],
    [1.323242188, 1095], [5.29296875, 4081], [5.29296875, 4223],
    [21.171875, 17749], [21.171875, 15813], [84.6875, 62536],
    [84.6875, 61962], [338.75, 269475], [338.75, 246720],
    [1355, 940177], [1355, 867425]
  ]
};

console.log('═'.repeat(120));
console.log('                              E3P1 PLATE ANALYSIS');
console.log('═'.repeat(120));
console.log('\nStep 1: Fitting 4PL Parameters from Standard Curves...\n');

const E3P1_PARAMETERS = {};

// Fit 4PL for each cytokine
for (const [cytokine, data] of Object.entries(E3P1_STANDARDS)) {
  const conc = data.map(d => d[0]);
  const signals = data.map(d => d[1]);
  
  const xlog = conc.map(x => msd_log10(x));
  const y = signals.slice();
  const w = y.map(v => 1/Math.pow(Math.max(v,1),2)); // 1/y² weighting
  
  const A0 = Math.min(...y);
  const D0 = Math.max(...y);
  const B0 = 1.0;
  const C0 = Math.sqrt(conc[0] * conc[conc.length-1]);
  const start = [A0, D0, msd_log10(C0), B0];
  
  const ClogMin = Math.min(...xlog) - 1.0;
  const ClogMax = Math.max(...xlog) + 1.0;
  
  const hard = {
    Amin: 0,
    Dmin: 0,
    Dmax: Infinity,
    Bmin: 0.1,
    Bmax: 5.0,
    ClogMin, ClogMax
  };
  
  const fn = (pArr) => msd_loss4pl({A:pArr[0], D:pArr[1], Clog:pArr[2], B:pArr[3]}, xlog, y, w, hard);
  const res = msd_nelderMead(fn, start, 1.0, 10000, 1e-10);
  const p = {A:res.params[0], D:res.params[1], Clog:res.params[2], B:res.params[3]};
  
  p.A = Math.max(p.A, hard.Amin);
  p.B = msd_clamp(p.B, hard.Bmin, hard.Bmax);
  p.Clog = msd_clamp(p.Clog, hard.ClogMin, hard.ClogMax);
  
  const midPoint = Math.pow(10, p.Clog);
  
  E3P1_PARAMETERS[cytokine] = {
    Top: p.D,
    Bottom: p.A,
    MidPoint: midPoint,
    HillSlope: p.B
  };
  
  console.log(`${cytokine.padEnd(12)} → Top: ${p.D.toFixed(2).padStart(12)}, Bottom: ${p.A.toFixed(2).padStart(10)}, MidPoint: ${midPoint.toFixed(2).padStart(12)}, HillSlope: ${p.B.toFixed(6)}`);
}

console.log('\n' + '═'.repeat(120));
console.log('Step 2: Calculating Concentrations for All Samples...\n');

// Now calculate concentrations for all samples
const cytokineNames = Object.keys(E3P1_STANDARDS);

console.log('Well'.padEnd(8) + cytokineNames.map(c => c.padEnd(18)).join(''));
console.log('─'.repeat(120));

// Process each well (16 wells: A02-A09, H02-H09)
const wells = ['A02', 'H02', 'A03', 'H03', 'A04', 'H04', 'A05', 'H05', 
               'A06', 'H06', 'A07', 'H07', 'A08', 'H08', 'A09', 'H09'];

for (let wellIdx = 0; wellIdx < wells.length; wellIdx++) {
  const well = wells[wellIdx];
  const row = [well];
  
  for (const cytokine of cytokineNames) {
    const signal = E3P1_STANDARDS[cytokine][wellIdx][1];
    const params = E3P1_PARAMETERS[cytokine];
    const conc = calculate4PLConcentration(signal, params);
    
    if (conc === null || conc === 0) {
      row.push('N/A'.padEnd(18));
    } else {
      row.push(conc.toFixed(4).padEnd(18));
    }
  }
  
  console.log(row.join(''));
}

console.log('\n' + '═'.repeat(120));
console.log('E3P1 FITTED PARAMETERS (Copy to your application):');
console.log('═'.repeat(120));
console.log('\nconst E3P1_PARAMETERS = {');
for (const [cytokine, params] of Object.entries(E3P1_PARAMETERS)) {
  console.log(`  '${cytokine}': { Top: ${params.Top.toFixed(4)}, Bottom: ${params.Bottom.toFixed(4)}, MidPoint: ${params.MidPoint.toFixed(4)}, HillSlope: ${params.HillSlope.toFixed(6)} },`);
}
console.log('};');

console.log('\n' + '═'.repeat(120));

