/**
 * Analysis engine for MSD plate data
 */

import { CONSTANTS, ERROR_MESSAGES } from './constants.js';
import { getWellKey, calculateStats, showNotification } from './utils.js';

export class AnalysisEngine {
  constructor(plateManager) {
    this.plateManager = plateManager;
  }

  /**
   * Parse standard concentrations from text
   */
  parseStandardConcentrations(text) {
    const lines = text.split(/\n/).map(s => s.trim()).filter(Boolean);
    const map = {};
    
    for (const line of lines) {
      const match = line.match(/^([^:]+):\s*(.+)$/);
      if (!match) continue;
      
      const name = match[1].trim();
      const vals = match[2].split(",")
        .map(s => parseFloat(s.trim()))
        .filter(v => !Number.isNaN(v));
      map[name] = vals;
    }
    
    return map;
  }

  /**
   * Collect standards data for analysis
   */
  collectStandardsData(spotIdx, mapping) {
    const analyte = mapping[spotIdx];
    const concMap = this.parseStandardConcentrations(
      document.getElementById("stdConcs").value
    );
    const concs = concMap[analyte] || [];
    
    const x_conc = [];
    const y_signal = [];
    const points = [];
    
    for (const row of CONSTANTS.ROWS) {
      for (const col of CONSTANTS.COLS) {
        const role = this.plateManager.getWellRole(getWellKey(row, col));
        if (role && role.role === "Std") {
          const lvlIdx = CONSTANTS.LEVEL_NAMES.indexOf(role.level || "");
          if (lvlIdx >= 0 && lvlIdx < concs.length) {
            const signal = this.plateManager.getValue(row, col, spotIdx);
            const conc = concs[lvlIdx];
            if (Number.isFinite(signal) && Number.isFinite(conc) && conc > 0) {
              x_conc.push(conc);
              y_signal.push(signal);
              points.push({
                well: getWellKey(row, col),
                signal,
                conc,
                level: role.level
              });
            }
          }
        }
      }
    }
    
    return { x_conc, y_signal, points, analyte };
  }

  /**
   * Detect curve orientation (increasing vs decreasing) with multiple methods
   */
  detectCurveOrientation(x_conc, y_signal) {
    if (x_conc.length < 2) return 'unknown';
    
    // Sort by concentration and calculate correlation
    const pairs = x_conc.map((c, i) => ({ conc: c, signal: y_signal[i] }))
      .filter(p => isFinite(p.conc) && isFinite(p.signal) && p.conc > 0)
      .sort((a, b) => a.conc - b.conc);
    
    if (pairs.length < 2) return 'unknown';
    
    console.log('Curve orientation detection for', pairs.length, 'standards:', pairs);
    
    // Method 1: Pearson correlation on log-transformed data
    const logConcs = pairs.map(p => Math.log10(p.conc));
    const logSignals = pairs.map(p => Math.log10(Math.max(p.signal, 1e-12)));
    
    const n = pairs.length;
    const meanLogConc = logConcs.reduce((a, b) => a + b, 0) / n;
    const meanLogSignal = logSignals.reduce((a, b) => a + b, 0) / n;
    
    let numerator = 0, denomConc = 0, denomSignal = 0;
    for (let i = 0; i < n; i++) {
      const concDev = logConcs[i] - meanLogConc;
      const signalDev = logSignals[i] - meanLogSignal;
      numerator += concDev * signalDev;
      denomConc += concDev * concDev;
      denomSignal += signalDev * signalDev;
    }
    
    const pearsonCorr = denomConc > 0 && denomSignal > 0 ? 
      numerator / Math.sqrt(denomConc * denomSignal) : 0;
    
    // Method 2: Simple slope check (most robust)
    let positiveSlopes = 0;
    let negativeSlopes = 0;
    let totalSlopes = 0;
    
    for (let i = 1; i < pairs.length; i++) {
      const deltaConc = Math.log10(pairs[i].conc) - Math.log10(pairs[i-1].conc);
      const deltaSignal = Math.log10(Math.max(pairs[i].signal, 1e-12)) - Math.log10(Math.max(pairs[i-1].signal, 1e-12));
      
      if (Math.abs(deltaConc) > 1e-6) { // Avoid division by near-zero
        const slope = deltaSignal / deltaConc;
        if (slope > 0.05) positiveSlopes++;
        else if (slope < -0.05) negativeSlopes++;
        totalSlopes++;
      }
    }
    
    // Method 3: End-to-end comparison
    const minConc = pairs[0];
    const maxConc = pairs[pairs.length - 1];
    const endToEndSlope = (Math.log10(Math.max(maxConc.signal, 1e-12)) - Math.log10(Math.max(minConc.signal, 1e-12))) / 
                         (Math.log10(maxConc.conc) - Math.log10(minConc.conc));
    
    console.log('Orientation detection metrics:', {
      pearsonCorr,
      positiveSlopes,
      negativeSlopes,
      totalSlopes,
      endToEndSlope,
      slopeRatio: totalSlopes > 0 ? positiveSlopes / totalSlopes : 0
    });
    
    // Decision logic (multiple criteria for robustness)
    let orientation = 'unknown';
    
    if (totalSlopes > 0) {
      const posRatio = positiveSlopes / totalSlopes;
      const negRatio = negativeSlopes / totalSlopes;
      
      // Strong evidence for increasing curve
      if ((posRatio > 0.6 && pearsonCorr > 0.1) || 
          (posRatio > 0.7) || 
          (endToEndSlope > 0.2 && pearsonCorr > 0)) {
        orientation = 'increasing';
      }
      // Strong evidence for decreasing curve  
      else if ((negRatio > 0.6 && pearsonCorr < -0.1) || 
               (negRatio > 0.7) || 
               (endToEndSlope < -0.2 && pearsonCorr < 0)) {
        orientation = 'decreasing';
      }
      // Weak evidence - use correlation as tiebreaker
      else if (Math.abs(pearsonCorr) > 0.05) {
        orientation = pearsonCorr > 0 ? 'increasing' : 'decreasing';
      }
    }
    
    console.log(`Detected ${orientation} curve (correlation: ${pearsonCorr.toFixed(3)}, pos slopes: ${positiveSlopes}/${totalSlopes})`);
    return orientation;
  }

  /**
   * Enforce monotonic standards for interpolation
   */
  enforceMonotonicStandards(x_conc, y_signal, orientation) {
    const pairs = x_conc.map((c, i) => ({ conc: c, signal: y_signal[i] }))
      .filter(p => isFinite(p.conc) && isFinite(p.signal) && p.conc > 0)
      .sort((a, b) => a.conc - b.conc);
    
    if (pairs.length < 2) return { x_conc: [], y_signal: [], pairs: [] };
    
    // For increasing curves: signal should increase with concentration
    // For decreasing curves: signal should decrease with concentration
    const monotonicPairs = [pairs[0]]; // Always keep first point
    
    for (let i = 1; i < pairs.length; i++) {
      const prev = monotonicPairs[monotonicPairs.length - 1];
      const curr = pairs[i];
      
      if (orientation === 'increasing') {
        // Signal should increase or stay same
        if (curr.signal >= prev.signal * 0.95) { // Allow 5% tolerance
          monotonicPairs.push(curr);
        } else {
          // Adjust signal to maintain monotonicity
          monotonicPairs.push({
            conc: curr.conc,
            signal: prev.signal * 1.01 // Small increase
          });
        }
      } else if (orientation === 'decreasing') {
        // Signal should decrease or stay same
        if (curr.signal <= prev.signal * 1.05) { // Allow 5% tolerance
          monotonicPairs.push(curr);
        } else {
          // Adjust signal to maintain monotonicity
          monotonicPairs.push({
            conc: curr.conc,
            signal: prev.signal * 0.99 // Small decrease
          });
        }
      } else {
        // Unknown orientation - keep all points but warn
        monotonicPairs.push(curr);
      }
    }
    
    return {
      x_conc: monotonicPairs.map(p => p.conc),
      y_signal: monotonicPairs.map(p => p.signal),
      pairs: monotonicPairs
    };
  }

  /**
   * Collect unknowns and controls data
   */
  collectUnknownsAndControls(spotIdx) {
    const unknowns = [];
    const pos = {};
    const neg = {};
    
    for (const row of CONSTANTS.ROWS) {
      for (const col of CONSTANTS.COLS) {
        const role = this.plateManager.getWellRole(getWellKey(row, col));
        if (!role) continue;
        
        const signal = this.plateManager.getValue(row, col, spotIdx);
        if (!Number.isFinite(signal)) continue;
        
        if (role.role === "Unk") {
          unknowns.push({
            well: getWellKey(row, col),
            group: role.group,
            color: role.color || this.plateManager.getGroupColor(role.group || "Group"),
            signal
          });
        } else if (role.role === "Pos") {
          const ctrl = role.ctrl || "Pos";
          if (!pos[ctrl]) pos[ctrl] = [];
          pos[ctrl].push(signal);
        } else if (role.role === "Neg") {
          const ctrl = role.ctrl || "Neg";
          if (!neg[ctrl]) neg[ctrl] = [];
          neg[ctrl].push(signal);
        }
      }
    }
    
    return { unknowns, pos, neg };
  }

  /**
   * 4PL inverse function
   */
  invert4PL(y, b1, b2, b3, b4) {
    if (y <= b1) return 0.0;
    const ratio = (b2 - b1) / (y - b1) - 1.0;
    if (ratio <= 0) return Infinity;
    const denom = Math.abs(b4) > 1e-12 ? b4 : (b4 < 0 ? -1e-12 : 1e-12);
    return b3 * Math.pow(ratio, 1.0 / denom);
  }

  /**
   * 4PL forward function
   */
  forward4PL(x, b1, b2, b3, b4) {
    const xb = Math.max(x / Math.max(b3, 1e-12), 1e-12);
    const t = Math.pow(xb, b4);
    return b1 + (b2 - b1) / (1 + t);
  }

  /**
   * Fit 4PL model to data
   */
  fit4PL(xArr, yArr, weightMode = "1/y2") {
    const n = xArr.length;
    if (n < 4) {
      throw new Error(ERROR_MESSAGES.INSUFFICIENT_STANDARDS);
    }

    const xs = xArr.slice();
    const ys = yArr.slice();
    
    // Initialize parameters
    let b1 = Math.min(...ys);
    let b2 = Math.max(...ys) * 1.1;
    
    // Find EC50 estimate
    const target = b1 + 0.5 * (b2 - b1);
    let idx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < ys.length; i++) {
      const d = Math.abs(ys[i] - target);
      if (d < minDiff) {
        minDiff = d;
        idx = i;
      }
    }
    let b3 = Math.max(xs[idx], 1e-9);
    let b4 = 1.0;

    // Adam optimizer parameters
    let m = [0, 0, 0, 0];
    let v = [0, 0, 0, 0];
    const { BETA1, BETA2, EPSILON, LEARNING_RATE } = CONSTANTS.FIT_PARAMS;
    let lastLoss = Infinity;

    // Weight function
    const W = (i) => (weightMode === "1/y2" ? 1 / Math.max(ys[i] * ys[i], 1e-9) : 1);

    // Gradient calculation
    const calculateGradients = (b1, b2, b3, b4) => {
      const xb = xs.map(x => Math.max(x / Math.max(b3, 1e-12), 1e-12));
      const lnxb = xb.map(x => Math.log(x));
      const t = lnxb.map(L => Math.exp(b4 * L));
      const D = t.map(tt => 1 + tt);
      const S = D.map(dd => 1 / dd);
      const yhat = xs.map((x, i) => b1 + (b2 - b1) * S[i]);
      const r = ys.map((y, i) => y - yhat[i]);

      const g1 = -2 * r.map((ri, i) => W(i) * ri * (1 - S[i])).reduce((a, b) => a + b, 0);
      const g2 = -2 * r.map((ri, i) => W(i) * ri * (S[i])).reduce((a, b) => a + b, 0);
      
      const dS_db3 = t.map((tt, i) => (tt * b4) / (Math.max(b3, 1e-12) * D[i] * D[i]));
      const g3 = -2 * r.map((ri, i) => W(i) * ri * ((b2 - b1) * dS_db3[i])).reduce((a, b) => a + b, 0);
      
      const dS_db4 = t.map((tt, i) => (-tt * lnxb[i]) / (D[i] * D[i]));
      const g4 = -2 * r.map((ri, i) => W(i) * ri * ((b2 - b1) * dS_db4[i])).reduce((a, b) => a + b, 0);

      const loss = r.map((ri, i) => W(i) * ri * ri).reduce((a, b) => a + b, 0);

      return { g: [g1, g2, g3, g4], loss };
    };

    // Optimization loop
    for (let it = 1; it <= CONSTANTS.FIT_PARAMS.MAX_ITERATIONS; it++) {
      const { g, loss } = calculateGradients(b1, b2, b3, b4);
      
      if (Math.abs(lastLoss - loss) < CONSTANTS.FIT_PARAMS.CONVERGENCE_THRESHOLD) {
        break;
      }
      lastLoss = loss;

      // Adam update
      for (let k = 0; k < 4; k++) {
        m[k] = BETA1 * m[k] + (1 - BETA1) * g[k];
        v[k] = BETA2 * v[k] + (1 - BETA2) * (g[k] * g[k]);
        const mhat = m[k] / (1 - Math.pow(BETA1, it));
        const vhat = v[k] / (1 - Math.pow(BETA2, it));
        const step = LEARNING_RATE * mhat / (Math.sqrt(vhat) + EPSILON);

        if (k === 0) b1 -= step;
        if (k === 1) b2 -= step;
        if (k === 2) b3 -= step;
        if (k === 3) b4 -= step;
      }

      // Ensure parameter constraints
      if (b2 <= b1 + 1e-9) b2 = b1 + 1e-9;
      if (b3 <= 1e-12) b3 = 1e-12;
    }

    return {
      b1, b2, b3, b4,
      predict: (x) => this.forward4PL(x, b1, b2, b3, b4),
      invert: (y) => this.invert4PL(y, b1, b2, b3, b4)
    };
  }

  /**
   * Interpolation-based prediction with proper curve orientation handling
   */
  createInterpolationModel(x_conc, y_signal, orientation = 'unknown') {
    // Detect orientation if not provided
    if (orientation === 'unknown') {
      orientation = this.detectCurveOrientation(x_conc, y_signal);
    }
    
    // Enforce monotonic standards
    const { pairs: monotonicPairs } = this.enforceMonotonicStandards(x_conc, y_signal, orientation);
    
    if (monotonicPairs.length < 2) {
      throw new Error("Insufficient monotonic standards for interpolation");
    }

    const predict = (x) => {
      const arr = monotonicPairs.filter(p => p.conc > 0 && p.signal > 0)
        .sort((a, b) => a.conc - b.conc);
      
      if (arr.length < 2) return NaN;
      
      const xs = arr.map(p => p.conc);
      const ys = arr.map(p => p.signal);
      const lx = xs.map(v => Math.log10(v));
      const ly = ys.map(v => Math.log10(Math.max(v, 1e-12)));
      
      if (x <= xs[0]) return Math.pow(10, ly[0]);
      if (x >= xs[xs.length - 1]) return Math.pow(10, ly[ly.length - 1]);
      
      const Lx = Math.log10(Math.max(x, xs[0]));
      let i = 0;
      while (i < lx.length - 1 && !(Lx >= lx[i] && Lx <= lx[i + 1])) i++;
      
      const t = (Lx - lx[i]) / Math.max(lx[i + 1] - lx[i], 1e-12);
      const Ly = ly[i] + t * (ly[i + 1] - ly[i]);
      return Math.pow(10, Ly);
    };

    const invert = (y) => {
      const arr = monotonicPairs.slice();
      
      // Sort based on curve orientation for proper inversion
      if (orientation === 'increasing') {
        arr.sort((a, b) => a.signal - b.signal); // Sort by increasing signal
      } else if (orientation === 'decreasing') {
        arr.sort((a, b) => b.signal - a.signal); // Sort by decreasing signal
      } else {
        // Unknown orientation - try to detect from data
        arr.sort((a, b) => a.signal - b.signal);
      }
      
      const sigs = arr.map(p => p.signal);
      const concs = arr.map(p => Math.max(p.conc, 1e-12));
      
      if (sigs.length < 2) return NaN;
      
      // Clamp signal to range
      const minSig = Math.min(...sigs);
      const maxSig = Math.max(...sigs);
      const s = Math.max(Math.min(y, maxSig), minSig);
      
      // Check for out-of-range
      if (y < minSig * 0.9 || y > maxSig * 1.1) {
        // Flag as out-of-range but still return a value
        console.warn(`Signal ${y} is outside standard range [${minSig}, ${maxSig}]`);
      }
      
      const logSigs = sigs.map(v => Math.log10(Math.max(v, 1e-12)));
      const logConc = concs.map(v => Math.log10(v));
      const Ls = Math.log10(Math.max(s, 1e-12));
      
      let i = 0;
      while (i < logSigs.length - 1 && !(Ls >= logSigs[i] && Ls <= logSigs[i + 1])) i++;
      
      const t = (Ls - logSigs[i]) / Math.max(logSigs[i + 1] - logSigs[i], 1e-12);
      const Lc = logConc[i] + t * (logConc[i + 1] - logConc[i]);
      return Math.pow(10, Lc);
    };

    return { 
      predict, 
      invert, 
      orientation,
      standardsCount: monotonicPairs.length,
      note: `Log-log interpolation (${orientation} curve)`
    };
  }

  /**
   * Validate monotonic relationship between standards and samples
   */
  validateMonotonicRelationship(standards, results, orientation) {
    const warnings = [];
    const errors = [];
    
    if (!standards.x_conc || !standards.y_signal || standards.x_conc.length < 2) {
      return { warnings, errors };
    }
    
    // Sort standards by concentration
    const stdPairs = standards.x_conc.map((c, i) => ({ 
      conc: c, 
      signal: standards.y_signal[i] 
    })).sort((a, b) => a.conc - b.conc);
    
    const minStdConc = stdPairs[0].conc;
    const maxStdConc = stdPairs[stdPairs.length - 1].conc;
    const minStdSignal = Math.min(...stdPairs.map(p => p.signal));
    const maxStdSignal = Math.max(...stdPairs.map(p => p.signal));
    
    // Check each unknown
    for (const result of results) {
      if (!Number.isFinite(result.signal) || !Number.isFinite(result.reported)) {
        continue;
      }
      
      // Check for out-of-range signals
      if (result.signal < minStdSignal * 0.8 || result.signal > maxStdSignal * 1.2) {
        warnings.push({
          well: result.well,
          type: 'out_of_range',
          message: `Signal ${result.signal.toFixed(0)} is outside standard range [${minStdSignal.toFixed(0)}, ${maxStdSignal.toFixed(0)}]`
        });
      }
      
      // Check monotonic relationship violations
      if (orientation === 'increasing') {
        // For increasing curves: higher signal should mean higher concentration
        const expectedHigher = stdPairs.filter(p => p.signal <= result.signal);
        const expectedLower = stdPairs.filter(p => p.signal >= result.signal);
        
        if (expectedHigher.length > 0 && expectedLower.length > 0) {
          const maxLowerConc = Math.max(...expectedHigher.map(p => p.conc));
          const minHigherConc = Math.min(...expectedLower.map(p => p.conc));
          
          if (result.reported < maxLowerConc * 0.5 || result.reported > minHigherConc * 2) {
            errors.push({
              well: result.well,
              type: 'monotonic_violation',
              message: `Monotonic violation: signal ${result.signal.toFixed(0)} suggests conc should be between ${maxLowerConc.toFixed(2)} and ${minHigherConc.toFixed(2)}, but got ${result.reported.toFixed(2)}`
            });
          }
        }
      } else if (orientation === 'decreasing') {
        // For decreasing curves: higher signal should mean lower concentration
        const expectedLower = stdPairs.filter(p => p.signal <= result.signal);
        const expectedHigher = stdPairs.filter(p => p.signal >= result.signal);
        
        if (expectedHigher.length > 0 && expectedLower.length > 0) {
          const minHigherConc = Math.min(...expectedHigher.map(p => p.conc));
          const maxLowerConc = Math.max(...expectedLower.map(p => p.conc));
          
          if (result.reported > minHigherConc * 2 || result.reported < maxLowerConc * 0.5) {
            errors.push({
              well: result.well,
              type: 'monotonic_violation',
              message: `Monotonic violation: signal ${result.signal.toFixed(0)} suggests conc should be between ${maxLowerConc.toFixed(2)} and ${minHigherConc.toFixed(2)}, but got ${result.reported.toFixed(2)}`
            });
          }
        }
      }
    }
    
    return { warnings, errors };
  }

  /**
   * Run complete analysis with curve orientation detection and validation
   */
  async runAnalysis(spotIdx, mapping, options = {}) {
    try {
      showNotification('Starting analysis...', 'info', 2000);
      
      const { x_conc, y_signal, points, analyte } = this.collectStandardsData(spotIdx, mapping);
      
      if (x_conc.filter(v => v > 0).length < 2) {
        throw new Error(ERROR_MESSAGES.INSUFFICIENT_STANDARDS);
      }

      // Detect curve orientation
      const orientation = this.detectCurveOrientation(x_conc, y_signal);
      showNotification(`Detected ${orientation} curve for ${analyte}`, 'info', 3000);

      const { unknowns, pos, neg } = this.collectUnknownsAndControls(spotIdx);
      
      // Create model based on selected mode
      let model;
      const mode = options.model || 'fit4pl';
      
      if (mode === '4pl') {
        const { b1, b2, b3, b4 } = options.fixedParams || {};
        if (![b1, b2, b3, b4].every(Number.isFinite)) {
          throw new Error(ERROR_MESSAGES.INVALID_4PL_PARAMS);
        }
        model = {
          predict: (x) => this.forward4PL(x, b1, b2, b3, b4),
          invert: (y) => this.invert4PL(y, b1, b2, b3, b4),
          orientation: orientation,
          note: "Fixed 4PL parameters"
        };
      } else if (mode === 'fit4pl') {
        model = this.fit4PL(x_conc, y_signal, options.weightMode || '1/y2');
        model.orientation = orientation;
        model.note = `Fitted 4PL (${orientation} curve)`;
      } else if (mode === 'interp') {
        model = this.createInterpolationModel(x_conc, y_signal, orientation);
      } else {
        throw new Error("Unknown calculation mode.");
      }

      // Calculate concentrations for unknowns
      const sampleDil = Math.max(options.sampleDilution || 1, 1e-12);
      const results = [];
      
      for (const u of unknowns) {
        const undiluted = model.invert ? model.invert(Math.max(u.signal, 1e-12)) : NaN;
        const reported = Number.isFinite(undiluted) ? undiluted / sampleDil : NaN;
        
        results.push({
          well: u.well,
          group: u.group,
          color: u.color,
          signal: u.signal,
          undiluted,
          dilution: sampleDil,
          reported
        });
      }

      // Validate monotonic relationships
      const validation = this.validateMonotonicRelationship(
        { x_conc, y_signal, points, analyte }, 
        results, 
        orientation
      );
      
      // Display validation warnings/errors
      if (validation.errors.length > 0) {
        const errorMsg = `⚠️ ${validation.errors.length} monotonic violations detected! Check your curve fit.`;
        showNotification(errorMsg, 'error', 5000);
        console.warn('Monotonic violations:', validation.errors);
      }
      
      if (validation.warnings.length > 0) {
        const warnMsg = `⚠️ ${validation.warnings.length} samples out of standard range.`;
        showNotification(warnMsg, 'warning', 4000);
        console.warn('Out-of-range warnings:', validation.warnings);
      }

      // Group results by group
      const byGroup = {};
      for (const r of results) {
        if (!byGroup[r.group]) byGroup[r.group] = [];
        byGroup[r.group].push(r);
      }

      showNotification(`Analysis complete - ${orientation} curve detected`, 'success');
      
      return {
        model,
        standards: { x_conc, y_signal, points, analyte },
        unknowns: { unknowns, pos, neg },
        results,
        byGroup,
        sampleDilution: sampleDil,
        orientation,
        validation
      };
      
    } catch (error) {
      showNotification(error.message, 'error');
      throw error;
    }
  }

  /**
   * Calculate mean of array
   */
  calculateMean(arr) {
    return arr.reduce((sum, v) => sum + v, 0) / arr.length;
  }

  /**
   * Generate curve data for plotting
   */
  generateCurveData(model, xMin, xMax, points = 160) {
    const curveData = [];
    for (let i = 0; i < points; i++) {
      const t = i / (points - 1);
      const x = Math.pow(10, Math.log10(xMin) + t * (Math.log10(xMax) - Math.log10(xMin)));
      curveData.push({ x, y: model.predict(x) });
    }
    return curveData;
  }
}
