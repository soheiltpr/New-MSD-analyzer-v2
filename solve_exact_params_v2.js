/**
 * Solve for exact parameters that give identical results
 * Handle all signals including those below bottom
 */

const fs = require('fs');
const path = require('path');

// Read validation data
const validationDataPath = path.join(__dirname, 'js', 'msd-validation-data.js');
let validationDataContent = fs.readFileSync(validationDataPath, 'utf8');
const validationMatch = validationDataContent.match(/export const MSD_VALIDATION_DATA = ({[\s\S]*});/);
const MSD_VALIDATION_DATA = eval('(' + validationMatch[1] + ')');

function fourPLInverse(y, { top, bottom, midPoint, hillSlope }) {
  if (!isFinite(y) || !isFinite(top) || !isFinite(bottom) ||
      !isFinite(midPoint) || !isFinite(hillSlope)) return NaN;
  // Allow calculation even if y <= bottom (MSD might do this)
  if (y >= top) return null;
  const ratio = (top - bottom) / (y - bottom) - 1;
  if (ratio <= 0) {
    // For signals at or below bottom, return a small value or 0
    return 0;
  }
  return midPoint / Math.pow(ratio, 1 / hillSlope);
}

/**
 * Solve for exact midpoint for each example, then find optimal parameters
 */
function solveExactParameters(validationExamples, initialParams) {
  const validExamples = validationExamples.filter(ex =>
    ex.signal != null &&
    ex.originalCalculatedConcentration != null &&
    ex.originalCalculatedConcentration > 0 &&
    ex.signal > 0
  );
  
  if (validExamples.length < 4) return null;
  
  validExamples.sort((a, b) => a.signal - b.signal);
  
  const signals = validExamples.map(ex => ex.signal);
  const minSignal = Math.min(...signals);
  const maxSignal = Math.max(...signals);
  
  console.log(`  Signal range: ${minSignal} to ${maxSignal}`);
  console.log(`  Initial bottom: ${initialParams.bottom} (${initialParams.bottom < minSignal ? 'OK' : 'TOO HIGH - signals below bottom!'})`);
  
  // If bottom is too high, we need to lower it
  const adjustedBottom = Math.min(initialParams.bottom, minSignal * 0.9);
  
  // Try a wider range of parameters
  const bottomCandidates = [];
  for (let i = 0; i <= 20; i++) {
    const bot = minSignal * (0.5 + i * 0.02);
    if (bot < minSignal) bottomCandidates.push(bot);
  }
  bottomCandidates.push(adjustedBottom);
  bottomCandidates.sort((a, b) => a - b);
  
  const topCandidates = [];
  for (let i = 0; i <= 10; i++) {
    const tp = maxSignal * (1.0 + i * 0.05);
    topCandidates.push(tp);
  }
  topCandidates.push(initialParams.top);
  topCandidates.sort((a, b) => a - b);
  
  const slopeCandidates = [];
  for (let i = 0; i <= 20; i++) {
    const slope = initialParams.hillSlope * (0.95 + i * 0.005);
    slopeCandidates.push(slope);
  }
  
  console.log(`  Testing ${bottomCandidates.length * topCandidates.length * slopeCandidates.length} combinations...`);
  
  let bestParams = null;
  let bestMaxError = Infinity;
  let tested = 0;
  const maxTests = 1000; // Limit to avoid too long
  
  for (const bot of bottomCandidates) {
    for (const tp of topCandidates) {
      for (const slope of slopeCandidates) {
        if (tested++ > maxTests) break;
        
        // For this (top, bottom, hillSlope), solve for midpoint for each example
        const midpoints = [];
        for (const ex of validExamples) {
          if (ex.signal <= bot || ex.signal >= tp) continue;
          const ratio = (tp - bot) / (ex.signal - bot) - 1;
          if (ratio <= 0) continue;
          const mid = ex.originalCalculatedConcentration * Math.pow(ratio, 1 / slope);
          if (isFinite(mid) && mid > 0) {
            midpoints.push(mid);
          }
        }
        
        if (midpoints.length < 3) continue;
        
        // Try median, mean, and weighted mean
        midpoints.sort((a, b) => a - b);
        const medianMid = midpoints[Math.floor(midpoints.length / 2)];
        const meanMid = midpoints.reduce((a, b) => a + b, 0) / midpoints.length;
        
        for (const testMid of [medianMid, meanMid]) {
          const testParams = { top: tp, bottom: bot, midPoint: testMid, hillSlope: slope };
          
          // Calculate max error
          let maxError = 0;
          let validCount = 0;
          for (const ex of validExamples) {
            const calcConc = fourPLInverse(ex.signal, testParams);
            if (calcConc == null || !isFinite(calcConc)) {
              // Check if original is also 0 or very small
              if (ex.originalCalculatedConcentration > 0.001) {
                maxError = Infinity;
                break;
              }
              continue;
            }
            validCount++;
            const diffPct = Math.abs(calcConc - ex.originalCalculatedConcentration) /
                            ex.originalCalculatedConcentration * 100;
            if (diffPct > maxError) {
              maxError = diffPct;
            }
          }
          
          if (validCount >= validExamples.length * 0.8 && maxError < bestMaxError) {
            bestMaxError = maxError;
            bestParams = { ...testParams };
            
            if (maxError <= 0.0001) {
              return bestParams;
            }
          }
        }
      }
      if (tested > maxTests) break;
    }
    if (tested > maxTests) break;
  }
  
  return bestParams;
}

console.log('='.repeat(120));
console.log('SOLVING FOR EXACT PARAMETERS - E3P4 IL-5');
console.log('='.repeat(120));

const sheetKey = "E3_P4";
const assayName = "IL-5";

const validationExamples = MSD_VALIDATION_DATA[sheetKey][assayName] || [];

console.log(`\nSolving for ${sheetKey} - ${assayName}...`);

// Initial parameters from image
const initialParams = {
  top: 5371094,
  bottom: 161.4381,
  midPoint: 10834.29,
  hillSlope: 0.988987
};

// Check current error
let initialMaxError = 0;
for (const ex of validationExamples) {
  if (ex.signal == null || ex.originalCalculatedConcentration == null || 
      ex.originalCalculatedConcentration === 0) continue;
  const calcConc = fourPLInverse(ex.signal, initialParams);
  if (calcConc == null || !isFinite(calcConc)) continue;
  const diffPct = Math.abs(calcConc - ex.originalCalculatedConcentration) /
                  ex.originalCalculatedConcentration * 100;
  if (diffPct > initialMaxError) initialMaxError = diffPct;
}

console.log(`Initial max error: ${initialMaxError.toFixed(6)}%`);

const exactParams = solveExactParameters(validationExamples, initialParams);

if (!exactParams) {
  console.log('\n✗ Could not solve for exact parameters');
  console.log('Trying to refine initial parameters instead...');
  
  // Try iterative refinement
  let params = { ...initialParams };
  let learningRate = 0.0001;
  let bestParams = { ...params };
  let bestError = initialMaxError;
  
  for (let iter = 0; iter < 10000; iter++) {
    let maxError = 0;
    const gradients = { top: 0, bottom: 0, midPoint: 0, hillSlope: 0 };
    const eps = 1e-6;
    
    for (const ex of validationExamples) {
      if (ex.signal == null || ex.originalCalculatedConcentration == null || 
          ex.originalCalculatedConcentration === 0) continue;
      
      const calcConc = fourPLInverse(ex.signal, params);
      if (calcConc == null || !isFinite(calcConc)) continue;
      
      const diff = calcConc - ex.originalCalculatedConcentration;
      const diffPct = Math.abs(diff) / ex.originalCalculatedConcentration * 100;
      if (diffPct > maxError) maxError = diffPct;
      
      const weight = 1 / (ex.originalCalculatedConcentration * ex.originalCalculatedConcentration);
      const residual = diff * weight;
      
      // Numerical derivatives
      const dTop = (fourPLInverse(ex.signal, {
        top: params.top + eps,
        bottom: params.bottom,
        midPoint: params.midPoint,
        hillSlope: params.hillSlope
      }) || ex.originalCalculatedConcentration) - calcConc;
      
      const dBottom = (fourPLInverse(ex.signal, {
        top: params.top,
        bottom: params.bottom + eps,
        midPoint: params.midPoint,
        hillSlope: params.hillSlope
      }) || ex.originalCalculatedConcentration) - calcConc;
      
      const dMidpoint = (fourPLInverse(ex.signal, {
        top: params.top,
        bottom: params.bottom,
        midPoint: params.midPoint + eps,
        hillSlope: params.hillSlope
      }) || ex.originalCalculatedConcentration) - calcConc;
      
      const dHillSlope = (fourPLInverse(ex.signal, {
        top: params.top,
        bottom: params.bottom,
        midPoint: params.midPoint,
        hillSlope: params.hillSlope + eps
      }) || ex.originalCalculatedConcentration) - calcConc;
      
      gradients.top += residual * dTop / eps;
      gradients.bottom += residual * dBottom / eps;
      gradients.midPoint += residual * dMidpoint / eps;
      gradients.hillSlope += residual * dHillSlope / eps;
    }
    
    if (maxError < bestError) {
      bestError = maxError;
      bestParams = { ...params };
      if (maxError <= 0.0001) {
        exactParams = bestParams;
        break;
      }
    }
    
    // Update
    const newParams = {
      top: params.top - learningRate * gradients.top,
      bottom: params.bottom - learningRate * gradients.bottom,
      midPoint: params.midPoint - learningRate * gradients.midPoint,
      hillSlope: params.hillSlope - learningRate * gradients.hillSlope
    };
    
    const signals = validationExamples.map(ex => ex.signal).filter(s => s != null);
    const minSignal = Math.min(...signals);
    const maxSignal = Math.max(...signals);
    
    newParams.top = Math.max(newParams.top, maxSignal * 1.001);
    newParams.bottom = Math.max(0, Math.min(newParams.bottom, minSignal * 0.99));
    newParams.midPoint = Math.max(0.0001, newParams.midPoint);
    newParams.hillSlope = Math.max(0.01, Math.min(10, newParams.hillSlope));
    
    const newMaxError = 0;
    for (const ex of validationExamples) {
      if (ex.signal == null || ex.originalCalculatedConcentration == null || 
          ex.originalCalculatedConcentration === 0) continue;
      const calcConc = fourPLInverse(ex.signal, newParams);
      if (calcConc == null || !isFinite(calcConc)) continue;
      const diffPct = Math.abs(calcConc - ex.originalCalculatedConcentration) /
                      ex.originalCalculatedConcentration * 100;
      if (diffPct > newMaxError) newMaxError = diffPct;
    }
    
    if (newMaxError < maxError) {
      params = newParams;
      learningRate = Math.min(learningRate * 1.1, 0.001);
    } else {
      learningRate *= 0.5;
      if (learningRate < 1e-15) break;
    }
    
    if (iter % 1000 === 0 && iter > 0) {
      console.log(`  Iteration ${iter}: Max error = ${maxError.toFixed(6)}%`);
    }
  }
  
  if (bestError < initialMaxError) {
    console.log(`\n✓ Refined parameters (error: ${bestError.toFixed(6)}%):`);
    console.log(`  Top: ${bestParams.top.toFixed(10)}`);
    console.log(`  Bottom: ${bestParams.bottom.toFixed(10)}`);
    console.log(`  MidPoint: ${bestParams.midPoint.toFixed(10)}`);
    console.log(`  HillSlope: ${bestParams.hillSlope.toFixed(10)}`);
    
    // Show comparison
    console.log('\nSignal  | Original MSD | Initial | Refined | Initial Diff | Refined Diff');
    console.log('-'.repeat(100));
    for (const ex of validationExamples.slice(0, 10)) {
      if (ex.signal == null || ex.originalCalculatedConcentration == null || 
          ex.originalCalculatedConcentration === 0) continue;
      const orig = ex.originalCalculatedConcentration;
      const calcInitial = fourPLInverse(ex.signal, initialParams);
      const calcRefined = fourPLInverse(ex.signal, bestParams);
      const diffInitial = calcInitial != null ? Math.abs(calcInitial - orig) / orig * 100 : null;
      const diffRefined = calcRefined != null ? Math.abs(calcRefined - orig) / orig * 100 : null;
      console.log(
        `${ex.signal.toString().padEnd(7)} | ${orig.toFixed(6).padEnd(12)} | ` +
        `${calcInitial != null ? calcInitial.toFixed(6).padEnd(8) : 'NULL'.padEnd(8)} | ` +
        `${calcRefined != null ? calcRefined.toFixed(6).padEnd(8) : 'NULL'.padEnd(8)} | ` +
        `${diffInitial != null ? diffInitial.toFixed(6) + '%' : 'N/A'.padEnd(12)} | ` +
        `${diffRefined != null ? diffRefined.toFixed(6) + '%' : 'N/A'}`
      );
    }
  }
} else {
  console.log('\n✓ Found exact parameters:');
  console.log(`  Top: ${exactParams.top.toFixed(10)}`);
  console.log(`  Bottom: ${exactParams.bottom.toFixed(10)}`);
  console.log(`  MidPoint: ${exactParams.midPoint.toFixed(10)}`);
  console.log(`  HillSlope: ${exactParams.hillSlope.toFixed(10)}`);
}

console.log('\n✅ Analysis complete!');

