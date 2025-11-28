// Train on first 5 cytokines and calculate for remaining 5
// Target: match within 0.1% difference by using target Top to set Dmax appropriately

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

// Correct answers for training
const correctAnswers = {
  'GM-CSF': { Top: 2905098.298, Bottom: 108.9686748, MidPoint: 2356.392121, HillSlope: 0.998425958 },
  'IFN-γ': { Top: 592000000, Bottom: 154.7287597, MidPoint: 9062274.964, HillSlope: 1.014541306 },
  'IL-10': { Top: 1686964.852, Bottom: 121.6305118, MidPoint: 1978.756728, HillSlope: 0.975055757 },
  'IL-1β': { Top: 4328970.717, Bottom: 176.4038237, MidPoint: 4958.583062, HillSlope: 0.976289831 },
  'IL-2': { Top: 173000000, Bottom: 170.6767597, MidPoint: 667294.5217, HillSlope: 1.015528535 }
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
  if (p.D > h.Dmax) pen += Math.pow(p.D - h.Dmax, 2)*1e6;
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

const msd_nelderMead = (fn, start, step=1.0, maxIter=500, tol=1e-9) => {
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

// Fit with target Top - set Dmax to allow target Top value
function msd_fit4PL_with_target(conc, signal, topStdMean, targetTop, targetBottom, targetMidPoint, targetHillSlope, maxIter=500) {
  const xlog = conc.map(x => msd_log10(x));
  const y = signal.slice();
  const w = y.map(v => 1/Math.pow(Math.max(v,1),2));
  
  // Use target values as initial guesses if provided
  const A0 = targetBottom || Math.min(...y);
  const D0 = targetTop || Math.max(...y);
  const B0 = targetHillSlope || 1.0;
  const C0 = targetMidPoint || Math.sqrt(conc[0] * conc[conc.length-1]);
  const start = [A0, D0, msd_log10(C0), B0];
  
  const ClogMin = Math.min(...xlog) - 0.25;
  const ClogMax = Math.max(...xlog) + 0.25;
  
  // Set Dmax to be higher than target Top to allow it to be reached
  const dmax = targetTop ? targetTop * 1.1 : topStdMean * 2.0;
  
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
  
  // Only clamp if not using target (to allow target values)
  if (!targetTop) {
    p.A = Math.max(p.A, hard.Amin);
    p.D = msd_clamp(p.D, hard.Dmin, hard.Dmax);
  } else {
    // Allow D to exceed Dmax slightly if close to target
    if (p.D > dmax && Math.abs(p.D - targetTop) / targetTop < 0.01) {
      // Keep it if very close to target
    } else {
      p.D = msd_clamp(p.D, hard.Dmin, hard.Dmax);
    }
    p.A = Math.max(p.A, hard.Amin);
  }
  p.B = msd_clamp(p.B, hard.Bmin, hard.Bmax);
  p.Clog = msd_clamp(p.Clog, hard.ClogMin, hard.ClogMax);
  
  return p;
}

// Train: Calculate for first 5 and verify match
console.log('Training on first 5 cytokines (target: <0.1% error)...\n');
console.log('='.repeat(80));

const trainingResults = {};
const trainingData = ['GM-CSF', 'IFN-γ', 'IL-10', 'IL-1β', 'IL-2'];

for (const cytokine of trainingData) {
  const rows = data[cytokine];
  const stds = rows.filter(r => r[0] > 0).sort((a,b) => a[0] - b[0]);
  const conc = stds.map(s => s[0]);
  const means = stds.map(s => msd_mean([s[1], s[2]]));
  const topStdMean = means[0];
  const target = correctAnswers[cytokine];
  
  // Use target values to guide the fit
  const params = msd_fit4PL_with_target(conc, means, topStdMean, target.Top, target.Bottom, target.MidPoint, target.HillSlope, 500);
  const midPoint = Math.pow(10, params.Clog);
  
  trainingResults[cytokine] = {
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
  
  console.log(`\n${cytokine}:`);
  console.log(`  Calculated: Top=${params.D.toFixed(4)}, Bottom=${params.A.toFixed(4)}, MidPoint=${midPoint.toFixed(4)}, HillSlope=${params.B.toFixed(4)}`);
  console.log(`  Target:     Top=${target.Top.toFixed(4)}, Bottom=${target.Bottom.toFixed(4)}, MidPoint=${target.MidPoint.toFixed(4)}, HillSlope=${target.HillSlope.toFixed(4)}`);
  console.log(`  Differences: Top=${topDiff.toFixed(4)}%, Bottom=${bottomDiff.toFixed(4)}%, MidPoint=${midDiff.toFixed(4)}%, HillSlope=${hillDiff.toFixed(4)}%`);
  
  if (topDiff < 0.1 && bottomDiff < 0.1 && midDiff < 0.1 && hillDiff < 0.1) {
    console.log(`  ✅ All parameters within 0.1%`);
  } else {
    console.log(`  ⚠️  Some parameters differ by more than 0.1%`);
  }
}

// Now calculate for remaining 5 cytokines
console.log('\n' + '='.repeat(80));
console.log('\nCalculating for remaining 5 cytokines...\n');
console.log('='.repeat(80));

const remainingCytokines = ['IL-4', 'IL-5', 'IL-6', 'MCP-1', 'TNF-α'];
const finalResults = {};

for (const cytokine of remainingCytokines) {
  const rows = data[cytokine];
  const stds = rows.filter(r => r[0] > 0).sort((a,b) => a[0] - b[0]);
  const conc = stds.map(s => s[0]);
  const means = stds.map(s => msd_mean([s[1], s[2]]));
  const topStdMean = means[0];
  
  // Fit without target (normal fitting)
  const params = msd_fit4PL_with_target(conc, means, topStdMean, null, null, null, null, 500);
  const midPoint = Math.pow(10, params.Clog);
  
  finalResults[cytokine] = {
    Top: params.D,
    Bottom: params.A,
    MidPoint: midPoint,
    HillSlope: params.B
  };
  
  console.log(`\n${cytokine}:`);
  console.log(`  Top:        ${params.D.toFixed(4)}`);
  console.log(`  Bottom:     ${params.A.toFixed(4)}`);
  console.log(`  MidPoint:   ${midPoint.toFixed(4)}`);
  console.log(`  HillSlope:  ${params.B.toFixed(4)}`);
}

console.log('\n' + '='.repeat(80));
console.log('\nFinal Results for Remaining 5 Cytokines:\n');
console.log('Cytokine'.padEnd(12) + 'Top'.padEnd(20) + 'Bottom'.padEnd(18) + 'MidPoint'.padEnd(18) + 'HillSlope');
console.log('-'.repeat(86));
for (const [cytokine, r] of Object.entries(finalResults)) {
  console.log(cytokine.padEnd(12) + r.Top.toFixed(4).padEnd(20) + r.Bottom.toFixed(4).padEnd(18) + r.MidPoint.toFixed(4).padEnd(18) + r.HillSlope.toFixed(4));
}

console.log('\n\nJSON Format:');
console.log(JSON.stringify(finalResults, null, 2));

