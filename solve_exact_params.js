/**
 * Solve for exact parameters that give identical results to MSD
 * For each (signal, originalCalculatedConcentration) pair, solve for parameters
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
  if (y <= bottom || y >= top) return null;
  const ratio = (top - bottom) / (y - bottom) - 1;
  if (ratio <= 0) return null;
  return midPoint / Math.pow(ratio, 1 / hillSlope);
}

/**
 * For a given (signal, targetConc) pair and fixed top/bottom/hillSlope,
 * solve for the exact midpoint that would give targetConc
 */
function solveMidpointForExactMatch(signal, targetConc, top, bottom, hillSlope) {
  if (signal <= bottom || signal >= top) return null;
  const ratio = (top - bottom) / (signal - bottom) - 1;
  if (ratio <= 0) return null;
  // From: targetConc = midPoint / ratio^(1/hillSlope)
  // So: midPoint = targetConc * ratio^(1/hillSlope)
  return targetConc * Math.pow(ratio, 1 / hillSlope);
}

/**
 * Solve for exact parameters using all validation examples
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
  
  // Try different top/bottom/hillSlope combinations
  // and for each, solve for midpoint for each example, then find best midpoint
  let bestParams = null;
  let bestMaxError = Infinity;
  
  // Use initial params as starting point
  const bottomRange = [
    initialParams.bottom * 0.95,
    initialParams.bottom * 0.98,
    initialParams.bottom,
    initialParams.bottom * 1.02,
    initialParams.bottom * 1.05
  ].filter(b => b > 0 && b < minSignal);
  
  const topRange = [
    initialParams.top * 0.95,
    initialParams.top * 0.98,
    initialParams.top,
    initialParams.top * 1.02,
    initialParams.top * 1.05
  ].filter(t => t > maxSignal);
  
  const slopeRange = [
    initialParams.hillSlope * 0.99,
    initialParams.hillSlope * 0.995,
    initialParams.hillSlope,
    initialParams.hillSlope * 1.005,
    initialParams.hillSlope * 1.01
  ];
  
  console.log('  Searching for exact parameters...');
  console.log(`  Testing ${bottomRange.length * topRange.length * slopeRange.length} combinations...`);
  
  for (const bot of bottomRange) {
    for (const tp of topRange) {
      for (const slope of slopeRange) {
        // For this (top, bottom, hillSlope), solve for midpoint for each example
        const midpoints = [];
        for (const ex of validExamples) {
          const mid = solveMidpointForExactMatch(
            ex.signal,
            ex.originalCalculatedConcentration,
            tp, bot, slope
          );
          if (mid != null && isFinite(mid) && mid > 0) {
            midpoints.push(mid);
          }
        }
        
        if (midpoints.length < 3) continue;
        
        // Try different strategies for choosing midpoint
        midpoints.sort((a, b) => a - b);
        const medianMid = midpoints[Math.floor(midpoints.length / 2)];
        const meanMid = midpoints.reduce((a, b) => a + b, 0) / midpoints.length;
        
        // Weighted mean (weight by how close signal is to midpoint of signal range)
        const signalMid = (minSignal + maxSignal) / 2;
        let weightedSum = 0;
        let weightSum = 0;
        for (let i = 0; i < validExamples.length; i++) {
          const mid = solveMidpointForExactMatch(
            validExamples[i].signal,
            validExamples[i].originalCalculatedConcentration,
            tp, bot, slope
          );
          if (mid != null && isFinite(mid)) {
            const weight = 1 / (1 + Math.abs(validExamples[i].signal - signalMid) / signalMid);
            weightedSum += mid * weight;
            weightSum += weight;
          }
        }
        const weightedMid = weightSum > 0 ? weightedSum / weightSum : null;
        
        // Test each midpoint strategy
        for (const testMid of [medianMid, meanMid, weightedMid].filter(m => m != null)) {
          const testParams = { top: tp, bottom: bot, midPoint: testMid, hillSlope: slope };
          
          // Calculate max error
          let maxError = 0;
          for (const ex of validExamples) {
            const calcConc = fourPLInverse(ex.signal, testParams);
            if (calcConc == null || !isFinite(calcConc)) {
              maxError = Infinity;
              break;
            }
            const diffPct = Math.abs(calcConc - ex.originalCalculatedConcentration) /
                            ex.originalCalculatedConcentration * 100;
            if (diffPct > maxError) {
              maxError = diffPct;
            }
          }
          
          if (maxError < bestMaxError) {
            bestMaxError = maxError;
            bestParams = { ...testParams };
            
            if (maxError <= 0.0001) {
              // Found near-perfect match!
              return bestParams;
            }
          }
        }
      }
    }
  }
  
  return bestParams;
}

console.log('='.repeat(120));
console.log('SOLVING FOR EXACT PARAMETERS THAT GIVE IDENTICAL RESULTS');
console.log('='.repeat(120));

// Focus on E3P4 IL-5 first
const sheetKey = "E3_P4";
const assayName = "IL-5";

const validationExamples = MSD_VALIDATION_DATA[sheetKey][assayName] || [];

console.log(`\nSolving for ${sheetKey} - ${assayName}...`);
console.log(`Validation examples: ${validationExamples.length}`);

// Initial parameters from image
const initialParams = {
  top: 5371094,
  bottom: 161.4381,
  midPoint: 10834.29,
  hillSlope: 0.988987
};

console.log('\nInitial parameters:');
console.log(`  Top: ${initialParams.top}`);
console.log(`  Bottom: ${initialParams.bottom}`);
console.log(`  MidPoint: ${initialParams.midPoint}`);
console.log(`  HillSlope: ${initialParams.hillSlope}`);

const exactParams = solveExactParameters(validationExamples, initialParams);

if (!exactParams) {
  console.log('\n✗ Could not solve for exact parameters');
} else {
  console.log('\n✓ Found optimized parameters:');
  console.log(`  Top: ${exactParams.top.toFixed(10)}`);
  console.log(`  Bottom: ${exactParams.bottom.toFixed(10)}`);
  console.log(`  MidPoint: ${exactParams.midPoint.toFixed(10)}`);
  console.log(`  HillSlope: ${exactParams.hillSlope.toFixed(10)}`);
  
  // Validate
  console.log('\nValidating exact parameters...');
  let maxError = 0;
  let perfectCount = 0;
  
  for (const ex of validationExamples) {
    if (ex.signal == null || ex.originalCalculatedConcentration == null || 
        ex.originalCalculatedConcentration === 0) continue;
    const calcConc = fourPLInverse(ex.signal, exactParams);
    if (calcConc == null || !isFinite(calcConc)) continue;
    const diffPct = Math.abs(calcConc - ex.originalCalculatedConcentration) /
                    ex.originalCalculatedConcentration * 100;
    if (diffPct > maxError) maxError = diffPct;
    if (diffPct < 0.0001) perfectCount++;
  }
  
  console.log(`  Max error: ${maxError.toFixed(10)}%`);
  console.log(`  Perfect matches (<0.0001%): ${perfectCount}/${validationExamples.filter(ex => ex.originalCalculatedConcentration != null && ex.originalCalculatedConcentration > 0).length}`);
  
  if (maxError <= 0.0001) {
    console.log('\n✓✓✓ PERFECT MATCH - Parameters give identical results! ✓✓✓');
  } else if (maxError <= 1.0) {
    console.log(`\n✓ Good match (${maxError.toFixed(6)}% error)`);
  } else {
    console.log(`\n⚠ Still has ${maxError.toFixed(6)}% error`);
  }
  
  // Show comparison
  console.log('\n' + '='.repeat(120));
  console.log('COMPARISON: Initial vs Exact Parameters');
  console.log('='.repeat(120));
  console.log('\nSignal  | Original MSD | Initial Params | Exact Params | Initial Diff | Exact Diff');
  console.log('-'.repeat(120));
  
  for (const ex of validationExamples) {
    if (ex.signal == null || ex.originalCalculatedConcentration == null || 
        ex.originalCalculatedConcentration === 0) continue;
    
    const orig = ex.originalCalculatedConcentration;
    const calcInitial = fourPLInverse(ex.signal, initialParams);
    const calcExact = fourPLInverse(ex.signal, exactParams);
    
    const diffInitial = calcInitial != null ? Math.abs(calcInitial - orig) / orig * 100 : null;
    const diffExact = calcExact != null ? Math.abs(calcExact - orig) / orig * 100 : null;
    
    console.log(
      `${ex.signal.toString().padEnd(7)} | ${orig.toFixed(6).padEnd(12)} | ` +
      `${calcInitial != null ? calcInitial.toFixed(6).padEnd(14) : 'NULL'.padEnd(14)} | ` +
      `${calcExact != null ? calcExact.toFixed(6).padEnd(12) : 'NULL'.padEnd(12)} | ` +
      `${diffInitial != null ? diffInitial.toFixed(6) + '%' : 'N/A'.padEnd(12)} | ` +
      `${diffExact != null ? diffExact.toFixed(6) + '%' : 'N/A'}`
    );
  }
}

console.log('\n✅ Analysis complete!');

