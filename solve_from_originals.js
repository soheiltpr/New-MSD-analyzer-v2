/**
 * Solve for exact parameters by working backwards from original calculated concentrations
 * For each (signal, originalConc) pair, determine what parameters would give that exact result
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
  // Don't restrict y <= bottom - allow calculation
  if (y >= top) return null;
  const ratio = (top - bottom) / (y - bottom) - 1;
  if (ratio <= 0) {
    // For very low signals, still try to calculate
    if (y <= bottom) {
      // Use extrapolation: assume very small concentration
      return 0;
    }
    return null;
  }
  return midPoint / Math.pow(ratio, 1 / hillSlope);
}

/**
 * For a given (signal, targetConc), solve for what parameters would give exact match
 * We have 4 unknowns but only 1 equation, so we need to fix 3 and solve for 1
 */
function solveForExactMatch(signal, targetConc, fixedTop, fixedBottom, fixedHillSlope) {
  if (signal >= fixedTop) return null;
  if (targetConc <= 0) return null;
  
  // From: targetConc = midPoint / ((top - bottom) / (signal - bottom) - 1)^(1/hillSlope)
  // Solve for midPoint: midPoint = targetConc * ((top - bottom) / (signal - bottom) - 1)^(1/hillSlope)
  
  const ratio = (fixedTop - fixedBottom) / (signal - fixedBottom) - 1;
  if (ratio <= 0) return null;
  
  const exponent = 1 / fixedHillSlope;
  const denominator = Math.pow(ratio, exponent);
  const requiredMidPoint = targetConc * denominator;
  
  return requiredMidPoint;
}

/**
 * Find optimal parameters that minimize max error
 */
function findOptimalParameters(validationExamples) {
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
  
  // Try many combinations of top/bottom/hillSlope
  // For each, solve for midpoint for each example, then find best midpoint
  
  let bestParams = null;
  let bestMaxError = Infinity;
  let bestAvgError = Infinity;
  
  // Bottom should be <= minSignal (to handle low signals)
  const bottomCandidates = [];
  for (let i = 0; i <= 30; i++) {
    bottomCandidates.push(minSignal * (0.3 + i * 0.02));
  }
  
  // Top should be > maxSignal
  const topCandidates = [];
  for (let i = 0; i <= 20; i++) {
    topCandidates.push(maxSignal * (1.0 + i * 0.05));
  }
  
  // HillSlope range
  const slopeCandidates = [];
  for (let i = 0; i <= 40; i++) {
    slopeCandidates.push(0.8 + i * 0.01);
  }
  
  console.log(`  Testing ${bottomCandidates.length * topCandidates.length * slopeCandidates.length} combinations...`);
  console.log(`  This may take a while...`);
  
  let tested = 0;
  const maxTests = 5000;
  
  for (const bot of bottomCandidates) {
    for (const tp of topCandidates) {
      for (const slope of slopeCandidates) {
        if (tested++ > maxTests) break;
        
        // For each example, solve for required midpoint
        const requiredMidpoints = [];
        for (const ex of validExamples) {
          if (ex.signal >= tp) continue;
          const reqMid = solveForExactMatch(ex.signal, ex.originalCalculatedConcentration, tp, bot, slope);
          if (reqMid != null && isFinite(reqMid) && reqMid > 0) {
            requiredMidpoints.push(reqMid);
          }
        }
        
        if (requiredMidpoints.length < validExamples.length * 0.8) continue;
        
        // Try median and mean of required midpoints
        requiredMidpoints.sort((a, b) => a - b);
        const medianMid = requiredMidpoints[Math.floor(requiredMidpoints.length / 2)];
        const meanMid = requiredMidpoints.reduce((a, b) => a + b, 0) / requiredMidpoints.length;
        
        for (const testMid of [medianMid, meanMid]) {
          const testParams = { top: tp, bottom: bot, midPoint: testMid, hillSlope: slope };
          
          // Calculate errors
          let maxError = 0;
          let totalError = 0;
          let count = 0;
          
          for (const ex of validExamples) {
            const calcConc = fourPLInverse(ex.signal, testParams);
            if (calcConc == null || !isFinite(calcConc)) {
              // If original is also very small, might be OK
              if (ex.originalCalculatedConcentration > 0.01) {
                maxError = Infinity;
                break;
              }
              continue;
            }
            count++;
            const diffPct = Math.abs(calcConc - ex.originalCalculatedConcentration) /
                            ex.originalCalculatedConcentration * 100;
            totalError += diffPct;
            if (diffPct > maxError) {
              maxError = diffPct;
            }
          }
          
          if (count >= validExamples.length * 0.8 && maxError < bestMaxError) {
            bestMaxError = maxError;
            bestAvgError = totalError / count;
            bestParams = { ...testParams };
            
            if (maxError <= 0.0001) {
              console.log(`  ✓ Found perfect match!`);
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
console.log('SOLVING FOR EXACT PARAMETERS FROM ORIGINAL CALCULATED CONCENTRATIONS');
console.log('Working backwards to find parameters that give identical results');
console.log('='.repeat(120));

const sheetKey = "E3_P4";
const assayName = "IL-5";

const validationExamples = MSD_VALIDATION_DATA[sheetKey][assayName] || [];

console.log(`\nSolving for ${sheetKey} - ${assayName}...`);
console.log(`Validation examples: ${validationExamples.length}`);

const optimalParams = findOptimalParameters(validationExamples);

if (!optimalParams) {
  console.log('\n✗ Could not find optimal parameters');
} else {
  console.log('\n✓ Found optimal parameters:');
  console.log(`  Top: ${optimalParams.top.toFixed(10)}`);
  console.log(`  Bottom: ${optimalParams.bottom.toFixed(10)}`);
  console.log(`  MidPoint: ${optimalParams.midPoint.toFixed(10)}`);
  console.log(`  HillSlope: ${optimalParams.hillSlope.toFixed(10)}`);
  
  // Validate
  console.log('\nValidating optimal parameters...');
  let maxError = 0;
  let perfectCount = 0;
  let nearPerfectCount = 0;
  
  console.log('\nSignal  | Original MSD | Calculated | Difference | Diff %');
  console.log('-'.repeat(80));
  
  for (const ex of validationExamples) {
    if (ex.signal == null || ex.originalCalculatedConcentration == null || 
        ex.originalCalculatedConcentration === 0) continue;
    
    const orig = ex.originalCalculatedConcentration;
    const calcConc = fourPLInverse(ex.signal, optimalParams);
    
    if (calcConc == null || !isFinite(calcConc)) {
      console.log(`${ex.signal.toString().padEnd(7)} | ${orig.toFixed(6).padEnd(12)} | NULL       | N/A        | N/A`);
      continue;
    }
    
    const diff = calcConc - orig;
    const diffPct = Math.abs(diff) / orig * 100;
    
    if (diffPct > maxError) maxError = diffPct;
    if (diffPct < 0.0001) perfectCount++;
    if (diffPct < 0.01) nearPerfectCount++;
    
    const status = diffPct < 0.0001 ? '✓' : diffPct < 0.01 ? '~' : '✗';
    
    console.log(
      `${ex.signal.toString().padEnd(7)} | ${orig.toFixed(6).padEnd(12)} | ${calcConc.toFixed(6).padEnd(10)} | ${diff.toFixed(6).padEnd(10)} | ${diffPct.toFixed(6)}% ${status}`
    );
  }
  
  console.log(`\nMax error: ${maxError.toFixed(10)}%`);
  console.log(`Perfect matches (<0.0001%): ${perfectCount}/${validationExamples.filter(ex => ex.originalCalculatedConcentration != null && ex.originalCalculatedConcentration > 0).length}`);
  console.log(`Near perfect (<0.01%): ${nearPerfectCount}`);
  
  if (maxError <= 0.0001) {
    console.log('\n✓✓✓ PERFECT MATCH - Parameters give identical results! ✓✓✓');
  } else if (maxError <= 1.0) {
    console.log(`\n✓ Good match (${maxError.toFixed(6)}% error)`);
  } else {
    console.log(`\n⚠ Still has ${maxError.toFixed(6)}% error`);
  }
}

console.log('\n✅ Analysis complete!');

