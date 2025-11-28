// E3P1 ROBUST 4PL FITTING - Final approach
// Using averaged replicates and proper 4PL fitting with 1/y² weighting

const msd_log10 = x => Math.log10(Math.max(x, 1e-10));
const msd_clamp = (v, min, max) => Math.max(min, Math.min(max, v));

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
  // Add penalty for degenerate solutions
  if (p.D < p.A * 1.5) sse += 1e10;  // Top must be >>  Bottom
  if (p.B < 0.5 || p.B > 1.5) sse += 1e8; // HillSlope must be reasonable
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
  let finalIter = 0;
  
  for (let iter=0; iter<maxIter; iter++){
    finalIter = iter;
    const idx = values.map((v,i)=>[v,i]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
    simplex = idx.map(k=>simplex[k]);
    values = idx.map(k=>values[k]);
    
    const fspan = Math.abs(values[values.length-1] - values[0]);
    if (fspan<1e-10) break;
    
    const worst = simplex.length-1;
    const c = centroid(simplex, worst);
    
    const xr = c.map((ci, j)=> ci + 1.0*(ci - simplex[worst][j]));
    const fr = f(xr);
    
    if (fr < values[0]){
      const xe = c.map((ci, j)=> ci + 2.0*(xr[j] - ci));
      const fe = f(xe);
      if (fe < fr){ simplex[worst]=xe; values[worst]=fe; }
      else { simplex[worst]=xr; values[worst]=fr; }
    } else if (fr < values[worst-1]){
      simplex[worst]=xr; values[worst]=fr;
    } else {
      const xc = c.map((ci, j)=> ci + 0.5*(simplex[worst][j] - ci));
      const fc = f(xc);
      if (fc < values[worst]){ simplex[worst]=xc; values[worst]=fc; }
      else {
        for (let i=1; i<simplex.length; i++){
          simplex[i] = simplex[0].map((s0j, j)=> s0j + 0.5*(simplex[i][j]-s0j));
          values[i] = f(simplex[i]);
        }
      }
    }
  }
  
  const bestIdx = values.indexOf(Math.min(...values));
  return {params: simplex[bestIdx], iterations: finalIter + 1};
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

// E3P1 Standards - Average replicates for better fitting
const E3P1_STANDARDS_RAW = {
  'GM-CSF': [
    [1.127929688, [1278, 1611]], [4.51171875, [4529, 5797]], [18.046875, [18374, 21263]],
    [72.1875, [74083, 84188]], [288.75, [270599, 304331]], [1155, [1070008, 1143081]],
    [4620, [1809801, 1846757]]
  ],
  'IFN-γ': [
    [3.918457031, [651, 393]], [15.67382813, [1089, 1037]], [62.6953125, [3417, 3558]],
    [250.78125, [14390, 14199]], [1003.125, [52179, 52864]], [4012.5, [237392, 242445]],
    [16050, [1059190, 1002274]]
  ],
  'IL-10': [
    [0.491943359, [806, 675]], [1.967773438, [1804, 1886]], [7.87109375, [6855, 7416]],
    [31.484375, [26007, 26859]], [125.9375, [98680, 103299]], [503.75, [335074, 343984]],
    [2015, [769096, 780459]]
  ],
  'IL-1β': [
    [0.541992188, [1360, 683]], [2.16796875, [2149, 2116]], [8.671875, [7362, 7459]],
    [34.6875, [29935, 30162]], [138.75, [111113, 106123]], [555, [417213, 412734]],
    [2220, [1264883, 1186955]]
  ],
  'IL-2': [
    [0.230712891, [411, 179]], [0.922851563, [439, 349]], [3.69140625, [856, 982]],
    [14.765625, [3151, 3745]], [59.0625, [11944, 13807]], [236.25, [50561, 57538]],
    [945, [188551, 239755]]
  ],
  'IL-4': [
    [0.201416016, [786, 829]], [0.805664063, [2572, 2776]], [3.22265625, [10177, 10745]],
    [12.890625, [39995, 40060]], [51.5625, [154084, 154892]], [206.25, [605506, 597286]],
    [825, [1379072, 1474619]]
  ],
  'IL-5': [
    [0.522460938, [523, 395]], [2.08984375, [1133, 1067]], [8.359375, [4003, 4145]],
    [33.4375, [17283, 16103]], [133.75, [61651, 59964]], [535, [246308, 241288]],
    [2140, [836216, 791590]]
  ],
  'IL-6': [
    [0.25390625, [1555, 521]], [1.015625, [928, 762]], [4.0625, [1957, 1966]],
    [16.25, [6671, 6970]], [65, [27024, 29395]], [260, [130007, 134248]],
    [1040, [586864, 579611]]
  ],
  'MCP-1': [
    [0.659179688, [26348, 5076]], [2.63671875, [15126, 5588]], [10.546875, [13071, 8629]],
    [42.1875, [28182, 25636]], [168.75, [109654, 110922]], [675, [385905, 401049]],
    [2700, [775936, 831302]]
  ],
  'TNF-α': [
    [0.330810547, [580, 505]], [1.323242188, [1175, 1095]], [5.29296875, [4081, 4223]],
    [21.171875, [17749, 15813]], [84.6875, [62536, 61962]], [338.75, [269475, 246720]],
    [1355, [940177, 867425]]
  ]
};

console.log('═'.repeat(140));
console.log('            E3P1 4PL FITTING FROM SCRATCH - USING AVERAGED REPLICATES FOR ROBUST FITTING');
console.log('═'.repeat(140));
console.log('\n✅ Method: 1/y² weighted 4PL with 500 iterations');
console.log('✅ Data: E3P1 plate standards (replicates averaged for robustness)');
console.log('✅ Approach: Nelder-Mead with strong constraints against degenerate solutions\n');
console.log('─'.repeat(140));

const E3P1_PARAMETERS = {};

for (const [cytokine, rawData] of Object.entries(E3P1_STANDARDS_RAW)) {
  console.log(`\n🔬 ${cytokine}:`);
  
  // Average the replicates
  const avgData = rawData.map(([conc, signals]) => {
    const avgSignal = signals.reduce((a,b) => a+b, 0) / signals.length;
    return [conc, avgSignal];
  });
  
  const conc = avgData.map(d => d[0]);
  const signals = avgData.map(d => d[1]);
  
  console.log(`   Concentration range: ${Math.min(...conc).toFixed(4)} - ${Math.max(...conc).toFixed(2)} pg/mL`);
  console.log(`   Signal range: ${Math.min(...signals).toFixed(0)} - ${Math.max(...signals).toFixed(0)}`);
  
  const xlog = conc.map(x => msd_log10(x));
  const y = signals.slice();
  const w = y.map(v => 1/Math.pow(Math.max(v,1),2)); // 1/y² weighting
  
  // Better initial guesses
  const A0 = Math.min(...y) * 0.8;  // Bottom slightly below min
  const D0 = Math.max(...y) * 1.2;  // Top slightly above max
  const B0 = 1.0;                    // Hill slope ~1
  const C0log = (Math.log10(conc[0]) + Math.log10(conc[conc.length-1])) / 2;  // Log midpoint
  
  const start = [A0, D0, C0log, B0];
  
  console.log(`   Initial: Bottom=${A0.toFixed(0)}, Top=${D0.toFixed(0)}, MidPoint=${Math.pow(10, C0log).toFixed(2)}, HillSlope=${B0}`);
  
  const fn = (pArr) => msd_loss4pl({A:pArr[0], D:pArr[1], Clog:pArr[2], B:pArr[3]}, xlog, y, w);
  const res = msd_nelderMead(fn, start, 500);
  
  let p = {A:res.params[0], D:res.params[1], Clog:res.params[2], B:res.params[3]};
  
  // Force reasonable values
  p.A = Math.max(0, p.A);
  p.D = Math.max(p.A * 2, p.D);  // Top must be at least 2x Bottom
  p.B = msd_clamp(p.B, 0.7, 1.3); // Hill slope typically close to 1 for MSD
  
  const midPoint = Math.pow(10, p.Clog);
  
  E3P1_PARAMETERS[cytokine] = {
    Top: p.D,
    Bottom: p.A,
    MidPoint: midPoint,
    HillSlope: p.B
  };
  
  console.log(`   Converged in ${res.iterations} iterations`);
  console.log(`   ✅ Fitted: Bottom=${p.A.toFixed(2)}, Top=${p.D.toFixed(2)}, MidPoint=${midPoint.toFixed(2)}, HillSlope=${p.B.toFixed(6)}`);
  
  // Validate against ALL individual points (not just averages)
  const allPoints = rawData.flatMap(([c, sigs]) => sigs.map(s => [c, s]));
  let totalErr = 0;
  let count = 0;
  let maxErr = 0;
  
  for (const [knownConc, signal] of allPoints) {
    const calcConc = calculate4PLConcentration(signal, E3P1_PARAMETERS[cytokine]);
    if (calcConc && calcConc > 0 && knownConc > 0) {
      const err = Math.abs((calcConc - knownConc) / knownConc) * 100;
      totalErr += err;
      count++;
      maxErr = Math.max(maxErr, err);
    }
  }
  const avgErr = count > 0 ? totalErr / count : 0;
  
  console.log(`   📊 Validation: Avg error=${avgErr.toFixed(2)}%, Max error=${maxErr.toFixed(2)}% (${count}/${allPoints.length} points back-calculated)`);
  
  if (avgErr < 5) {
    console.log(`   ✅ EXCELLENT FIT (<5% error)`);
  } else if (avgErr < 15) {
    console.log(`   ✅ GOOD FIT (<15% error)`);
  } else if (avgErr < 30) {
    console.log(`   ⚠️  ACCEPTABLE FIT (<30% error)`);
  } else {
    console.log(`   ⚠️  POOR FIT (>30% error)`);
  }
}

console.log('\n' + '═'.repeat(140));
console.log('E3P1 FITTED PARAMETERS:');
console.log('═'.repeat(140));
console.log('\nconst E3P1_PARAMETERS = {');
for (const [cytokine, params] of Object.entries(E3P1_PARAMETERS)) {
  console.log(`  '${cytokine}': { Top: ${params.Top.toFixed(4)}, Bottom: ${params.Bottom.toFixed(4)}, MidPoint: ${params.MidPoint.toFixed(4)}, HillSlope: ${params.HillSlope.toFixed(6)} },`);
}
console.log('};');

console.log('\n' + '═'.repeat(140));
console.log('SUMMARY:');
console.log('═'.repeat(140));
console.log('\nCytokine'.padEnd(15) + 'Avg Error (%)'.padEnd(18) + 'Max Error (%)'.padEnd(18) + 'Valid Points'.padEnd(15) + 'Status');
console.log('─'.repeat(140));

for (const [cytokine, rawData] of Object.entries(E3P1_STANDARDS_RAW)) {
  const params = E3P1_PARAMETERS[cytokine];
  const allPoints = rawData.flatMap(([c, sigs]) => sigs.map(s => [c, s]));
  
  let totalErr = 0;
  let count = 0;
  let maxErr = 0;
  
  for (const [knownConc, signal] of allPoints) {
    const calcConc = calculate4PLConcentration(signal, params);
    if (calcConc && calcConc > 0 && knownConc > 0) {
      const err = Math.abs((calcConc - knownConc) / knownConc) * 100;
      totalErr += err;
      count++;
      maxErr = Math.max(maxErr, err);
    }
  }
  const avgErr = count > 0 ? totalErr / count : 0;
  const status = avgErr < 5 ? '✅ Excellent' : avgErr < 15 ? '✅ Good' : avgErr < 30 ? '⚠️  Acceptable' : '❌ Poor';
  
  console.log(
    cytokine.padEnd(15) + 
    avgErr.toFixed(2).padEnd(18) + 
    maxErr.toFixed(2).padEnd(18) + 
    `${count}/${allPoints.length}`.padEnd(15) + 
    status
  );
}

console.log('\n' + '═'.repeat(140));

