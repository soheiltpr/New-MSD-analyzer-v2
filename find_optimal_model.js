// Find optimal model that matches all 10 cytokines within 1% error
// Strategy: Use Initial parameters from MSD export as starting point

const data = {
  'GM-CSF': [[0,119,98],[1.127929688,1658,1591],[4.51171875,6241,5432],[18.046875,19341,21411],[72.1875,93083,77758],[288.75,301744,305792],[1155,1342780,1100625],[4620,1759497,1836747]],
  'IFN-γ': [[0,152,144],[3.918457031,395,427],[15.67382813,1082,1001],[62.6953125,3323,3386],[250.78125,14635,13093],[1003.125,53023,53393],[4012.5,245154,234980],[16050,1043736,1025604]],
  'IL-10': [[0,133,108],[0.491943359,703,673],[1.967773438,1993,2026],[7.87109375,7803,7321],[31.484375,30565,28324],[125.9375,111027,105891],[503.75,374657,351370],[2015,872573,808081]],
  'IL-1β': [[0,162,190],[0.541992188,818,729],[2.16796875,2593,2288],[8.671875,9093,8451],[34.6875,37320,32028],[138.75,128877,124146],[555,481817,441739],[2220,1408822,1296723]],
  'IL-2': [[0,175,150],[0.230712891,247,217],[0.922851563,384,369],[3.69140625,945,922],[14.765625,3596,3173],[59.0625,13072,12889],[236.25,58569,52704],[945,231142,213864]],
  'IL-4': [[0,107,77],[0.201416016,773,830],[0.805664063,2990,2443],[3.22265625,6213,9869],[12.890625,36929,35910],[51.5625,142259,152031],[206.25,607306,574872],[825,1407350,1436504]],
  'IL-5': [[0,132,143],[0.522460938,452,457],[2.08984375,1299,1237],[8.359375,4564,4486],[33.4375,18185,17361],[133.75,68551,67657],[535,261861,260724],[2140,902341,858971]],
  'IL-6': [[0,101,211],[0.25390625,230,201],[1.015625,599,529],[4.0625,1761,1794],[16.25,7888,6702],[65,30472,28715],[260,154951,130310],[1040,645084,580715]],
  'MCP-1': [[0,109,135],[0.659179688,412,429],[2.63671875,1247,1223],[10.546875,4595,4391],[42.1875,21770,19334],[168.75,109654,103190],[675,443179,404009],[2700,877523,835522]],
  'TNF-α': [[0,119,255],[0.330810547,473,421],[1.323242188,1299,1152],[5.29296875,4618,4352],[21.171875,19393,16579],[84.6875,68954,67522],[338.75,289520,269667],[1355,1016100,947486]]
};

// True answers from MSD export with Initial parameters
const msdData = {
  'GM-CSF': {
    initial: { Top: 1816103, Bottom: 97.65, MidPoint: 850.5761, HillSlope: 1 },
    target: { Top: 2905098, Bottom: 108.9687, MidPoint: 2356.392, HillSlope: 0.998426 }
  },
  'IFN-γ': {
    initial: { Top: 1045017, Bottom: 133.2, MidPoint: 8213.975, HillSlope: 1 },
    target: { Top: 592000000, Bottom: 154.7288, MidPoint: 9062275, HillSlope: 1.014541 }
  },
  'IL-10': {
    initial: { Top: 848730.3, Bottom: 108.45, MidPoint: 684.8867, HillSlope: 1 },
    target: { Top: 1686965, Bottom: 121.6305, MidPoint: 1978.757, HillSlope: 0.975056 }
  },
  'IL-1β': {
    initial: { Top: 1366300, Bottom: 158.4, MidPoint: 956.2025, HillSlope: 1 },
    target: { Top: 4328971, Bottom: 176.4038, MidPoint: 4958.583, HillSlope: 0.97629 }
  },
  'IL-2': {
    initial: { Top: 224728, Bottom: 146.25, MidPoint: 472.8147, HillSlope: 1 },
    target: { Top: 173000000, Bottom: 170.6768, MidPoint: 667294.5, HillSlope: 1.015529 }
  },
  'IL-4': {
    initial: { Top: 1436146, Bottom: 82.8, MidPoint: 295.5584, HillSlope: 1 },
    target: { Top: 4213744, Bottom: 93.20236, MidPoint: 1537.592, HillSlope: 0.987318 }
  },
  'IL-5': {
    initial: { Top: 889462.6, Bottom: 123.75, MidPoint: 999.1254, HillSlope: 1 },
    target: { Top: 5666698, Bottom: 138.8998, MidPoint: 11912.52, HillSlope: 0.982633 }
  },
  'IL-6': {
    initial: { Top: 619028.5, Bottom: 140.4, MidPoint: 531.8441, HillSlope: 1 },
    target: { Top: 154000000, Bottom: 150.2258, MidPoint: 182734.8, HillSlope: 1.069812 }
  },
  'MCP-1': {
    initial: { Top: 865087.7, Bottom: 109.8, MidPoint: 697.1161, HillSlope: 1 },
    target: { Top: 1488603, Bottom: 127.2709, MidPoint: 1848.83, HillSlope: 1.105226 }
  },
  'TNF-α': {
    initial: { Top: 991610.9, Bottom: 168.3, MidPoint: 644.6911, HillSlope: 1 },
    target: { Top: 6051234, Bottom: 187.0038, MidPoint: 6841.159, HillSlope: 1.01245 }
  }
};

// Helper functions
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

const msd_nelderMead = (fn, start, step=1.0, maxIter=500, tol=1e-10) => {
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

// Fit using MSD Initial parameters as starting point
function msd_fit4PL_with_initial(conc, signal, initialParams, maxIter=500) {
  const xlog = conc.map(x => msd_log10(x));
  const y = signal.slice();
  const w = y.map(v => 1/Math.pow(Math.max(v,1),2)); // 1/y² weighting
  
  // Use MSD Initial parameters as starting point
  const A0 = initialParams.Bottom;
  const D0 = initialParams.Top;
  const B0 = initialParams.HillSlope;
  const C0 = initialParams.MidPoint;
  const start = [A0, D0, msd_log10(C0), B0];
  
  const ClogMin = Math.min(...xlog) - 0.25;
  const ClogMax = Math.max(...xlog) + 0.25;
  
  // Use very permissive Dmax to allow any Top value
  const dmax = Math.max(D0 * 1000, 1e12); // Very permissive
  
  const hard = {
    Amin: 0,
    Dmin: 0,
    Dmax: dmax,
    Bmin: 0.1,
    Bmax: 5.0,
    ClogMin, ClogMax
  };
  
  const fn = (pArr) => msd_loss4pl({A:pArr[0], D:pArr[1], Clog:pArr[2], B:pArr[3]}, xlog, y, w, hard);
  const res = msd_nelderMead(fn, start, 1.0, maxIter, 1e-10);
  const p = {A:res.params[0], D:res.params[1], Clog:res.params[2], B:res.params[3]};
  
  p.A = Math.max(p.A, hard.Amin);
  if (dmax !== Infinity) {
    p.D = msd_clamp(p.D, hard.Dmin, hard.Dmax);
  }
  p.B = msd_clamp(p.B, hard.Bmin, hard.Bmax);
  p.Clog = msd_clamp(p.Clog, hard.ClogMin, hard.ClogMax);
  
  return p;
}

// Test all cytokines
console.log('Testing model with MSD Initial parameters as starting point...\n');
console.log('Target: <1% error for all parameters\n');
console.log('='.repeat(100));

const results = {};
let allPass = true;
let passCount = 0;

const cytokines = ['GM-CSF', 'IFN-γ', 'IL-10', 'IL-1β', 'IL-2', 'IL-4', 'IL-5', 'IL-6', 'MCP-1', 'TNF-α'];

for (const cytokine of cytokines) {
  const rows = data[cytokine];
  const stds = rows.filter(r => r[0] > 0).sort((a,b) => a[0] - b[0]);
  const conc = stds.map(s => s[0]);
  const means = stds.map(s => msd_mean([s[1], s[2]]));
  
  const { initial, target } = msdData[cytokine];
  
  // Fit with MSD Initial parameters
  const params = msd_fit4PL_with_initial(conc, means, initial, 500);
  const midPoint = Math.pow(10, params.Clog);
  
  results[cytokine] = {
    Top: params.D,
    Bottom: params.A,
    MidPoint: midPoint,
    HillSlope: params.B
  };
  
  // Calculate differences
  const topDiff = Math.abs((params.D - target.Top) / target.Top) * 100;
  const bottomDiff = Math.abs((params.A - target.Bottom) / target.Bottom) * 100;
  const midDiff = Math.abs((midPoint - target.MidPoint) / target.MidPoint) * 100;
  const hillDiff = Math.abs((params.B - target.HillSlope) / target.HillSlope) * 100;
  
  const maxDiff = Math.max(topDiff, bottomDiff, midDiff, hillDiff);
  const pass = maxDiff < 1.0;
  
  if (pass) passCount++;
  else allPass = false;
  
  console.log(`\n${cytokine}:`);
  console.log(`  Calculated: Top=${params.D.toExponential(4)}, Bottom=${params.A.toFixed(4)}, MidPoint=${midPoint.toFixed(4)}, HillSlope=${params.B.toFixed(6)}`);
  console.log(`  Target:     Top=${target.Top.toExponential(4)}, Bottom=${target.Bottom.toFixed(4)}, MidPoint=${target.MidPoint.toFixed(4)}, HillSlope=${target.HillSlope.toFixed(6)}`);
  console.log(`  Differences: Top=${topDiff.toFixed(4)}%, Bottom=${bottomDiff.toFixed(4)}%, MidPoint=${midDiff.toFixed(4)}%, HillSlope=${hillDiff.toFixed(4)}%`);
  console.log(`  Max Diff: ${maxDiff.toFixed(4)}% ${pass ? '✅ PASS' : '❌ FAIL'}`);
}

console.log('\n' + '='.repeat(100));
console.log(`\nResults: ${passCount}/${cytokines.length} cytokines within 1% error`);

if (allPass) {
  console.log('✅ All cytokines match within 1% error!\n');
} else {
  console.log(`⚠️  ${cytokines.length - passCount} cytokines exceed 1% error\n`);
}

console.log('\nFinal Results (JSON):');
console.log(JSON.stringify(results, null, 2));

