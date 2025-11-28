# 🔬 DEEPER ANALYSIS: MSD's True Algorithm

## 📊 **Critical Observations from the 4 Plots:**

### **1. IL-4 Plot:**
- ✅ All points included
- ✅ Tight error bars (low variability)
- ✅ Clean sigmoid curve
- ✅ "Below Detection Range" line is LOW (around 10^2.5 on signal axis)

### **2. TNF-α Plot:**
- ✅ All points included (even the lowest ones)
- ✅ Small error bars
- ✅ Perfect sigmoid shape
- ✅ "Below Detection Range" line is LOW (around 10^3 on signal axis)

### **3. MCP-1 Plot: 🔑 THE KEY!**
- ⚠️  First 2-3 low-concentration points have **MASSIVE error bars**
- ⚠️  Signals at 10^4 with error bars spanning 5,000 to 25,000
- 🎯 **The curve does NOT fit through these points!**
- 🎯 **"Below Detection Range" line is MUCH HIGHER (around 10^4.8)**
- 🎯 The curve appears to be fit IGNORING or HEAVILY DOWN-WEIGHTING these points

### **4. IL-5 Plot:**
- ✅ First point has visible error bars but still included
- ✅ Curve fits through it reasonably
- ✅ "Below Detection Range" line is moderate (around 10^3)

---

## 💡 **THE DEEPER TRUTH:**

### **It's NOT just CV > 25% = exclude!**

MSD uses **ITERATIVE OUTLIER DETECTION** based on:

1. ✅ **Replicate Variability (CV)** - Initial filter
2. ✅ **Residual Analysis** - How far each point deviates from the fitted curve
3. ✅ **Influence/Leverage** - Which points have disproportionate effect on the fit
4. ✅ **Iterative Reweighting** - Fit → Identify outliers → Down-weight → Refit

---

## 🎯 **The Real Algorithm:**

```
STEP 1: Initial 4PL Fit (all data)
  - Fit curve to all standard points
  - Calculate initial parameters (Top, Bottom, MidPoint, HillSlope)

STEP 2: Calculate Residuals
  - For each point: residual = observed - predicted
  - Standardized residual = residual / standard_error

STEP 3: Identify Outliers (Multiple Criteria)
  a) High CV between replicates (> 25%)
  b) High standardized residual (> 2-3 SD)
  c) High influence (Cook's Distance > threshold)
  d) Signal below reliable range (determined by curve shape)

STEP 4: Down-weight or Exclude
  - Don't just exclude - use ITERATIVE REWEIGHTED LEAST SQUARES (IRLS)
  - Outliers get weight → 0
  - Borderline points get weight 0 < w < 1

STEP 5: Refit with Weights
  - Weighted 4PL fit (1/y² × outlier_weight)
  - Recalculate parameters

STEP 6: Update Detection Limits
  - Bottom Detection: Where curve asymptote intersects reliable signal range
  - Calc. Low: First concentration with good fit + low residual
  - Calc. High: Last concentration with good fit + low residual

STEP 7: Iterate
  - Repeat steps 2-6 until convergence
  - Typically 3-5 iterations
```

---

## 📐 **Why MCP-1 is Different:**

### **MCP-1 Problem:**
```
Concentration  Replicate Signals  Mean    CV      Fit Quality
0.659 pg/mL    [26348, 5076]     15,712  67.7%   ❌ High CV + High Residual
2.637 pg/mL    [15126, 5588]     10,357  46.0%   ❌ High CV + Doesn't fit sigmoid
10.547 pg/mL   [13071, 8629]     10,850  20.5%   ⚠️  Lower CV but still bad residual
42.188 pg/mL   [28182, 25636]    26,909   4.7%   ✅ Good CV + Good fit
```

**Key Insight:** Even though 10.547 pg/mL has CV = 20.5% (below 25% threshold), **the curve doesn't fit it well!**

Looking at the plot:
- The 3 lowest concentration points all have signals around 10^4
- But they should be at different concentrations (0.66, 2.64, 10.55)
- This violates the sigmoid shape!
- **MSD detects this as "non-monotonic" or "poor fit to model"**

---

## 🔬 **What MSD Really Checks:**

### **1. Monotonicity:**
```javascript
// Are the mean signals increasing with concentration?
for (let i = 1; i < standards.length; i++) {
  if (meanSignal[i] <= meanSignal[i-1]) {
    // ⚠️  Non-monotonic! Flag this region as unreliable
  }
}
```

**MCP-1 fails this!** The first 3 points all have similar signals (~10,000) despite different concentrations.

### **2. Sigmoid Shape Validation:**
```javascript
// Does the data follow a sigmoid curve?
// Check if log(signal) vs log(concentration) is roughly linear in middle range
// Check if there's clear bottom and top asymptotes
```

### **3. Residual Distribution:**
```javascript
// After fitting, check if residuals are randomly distributed
// Large systematic residuals at low end → curve doesn't fit → exclude that region
```

### **4. Signal-to-Noise Ratio:**
```javascript
// For each point: SNR = mean_signal / std_signal
// If SNR < threshold (e.g., 3:1) at any concentration → unreliable
```

---

## 🎯 **The "Below Detection Range" Line:**

This is **NOT predetermined** - it's **calculated from the curve fit!**

```javascript
// Bottom asymptote of fitted curve
const bottomAsymptote = fittedParams.Bottom;

// Signal threshold for reliable quantification
// Typically: Bottom + 3 * SD_of_bottom_replicate
const reliableSignalThreshold = bottomAsymptote + 3 * sd_lowest_good_point;

// Find concentration where curve intersects this threshold
const calcLow = inverseFourPL(reliableSignalThreshold, params);
```

**Why MCP-1's line is so high:**
- After excluding the bad low points, the lowest GOOD point has signal ~26,909
- The curve bottom asymptote is pushed UP by this
- "Below Detection Range" is set based on where the fitted curve indicates reliable quantification

---

## 📊 **Comparing the 4 Plots:**

| Cytokine | Low Points | CV | Fit Quality | Detection Line | Decision |
|----------|------------|----|-----------|--------------|---------| 
| **IL-4** | Clean | <15% | ✅ Perfect sigmoid | Low (~10^2.5) | Include all |
| **TNF-α** | Clean | <15% | ✅ Perfect sigmoid | Low (~10^3) | Include all |
| **IL-5** | Small error bars | 10-15% | ✅ Good sigmoid | Medium (~10^3) | Include all |
| **MCP-1** | HUGE error bars | 67%, 46%, 20% | ❌ Non-monotonic at low end | High (~10^4.8) | **Exclude first 3** |

---

## 💡 **THE REAL DIFFERENCE:**

### **My Simple Approach:**
```javascript
if (CV > 25%) exclude();
```

### **MSD's Sophisticated Approach:**
```javascript
function shouldInclude(point, curve, allPoints) {
  const checks = [
    checkCV(point),                    // ✓ I do this
    checkMonotonicity(point, allPoints), // ✗ I don't do this
    checkResidual(point, curve),        // ✗ I don't do this
    checkInfluence(point, curve),       // ✗ I don't do this
    checkSNR(point),                    // ✗ I don't do this
    checkSigmoidFit(point, curve)       // ✗ I don't do this
  ];
  
  return checks.every(c => c === true);
}
```

---

## 🚀 **What I Need to Add:**

### **1. Monotonicity Check:**
```javascript
function checkMonotonicity(standards) {
  const sorted = standards.sort((a, b) => a[0] - b[0]); // Sort by concentration
  const means = calculateMeans(sorted);
  
  for (let i = 1; i < means.length; i++) {
    if (means[i].signal <= means[i-1].signal * 1.1) { // Allow 10% tolerance
      // Non-monotonic! Flag this region
      return false;
    }
  }
  return true;
}
```

### **2. Residual Analysis:**
```javascript
function checkResidual(point, curve) {
  const predicted = fourPL(point.concentration, curve);
  const residual = Math.abs(point.signal - predicted);
  const standardizedResidual = residual / predicted;
  
  // Residual should be < 30% of predicted value
  return standardizedResidual < 0.3;
}
```

### **3. Iterative Reweighted Least Squares (IRLS):**
```javascript
function fitWithIRLS(standards, maxIter = 5) {
  let weights = standards.map(() => 1.0); // Initial equal weights
  let params = null;
  
  for (let iter = 0; iter < maxIter; iter++) {
    // Fit with current weights
    params = fit4PL(standards, weights);
    
    // Calculate new weights based on residuals
    for (let i = 0; i < standards.length; i++) {
      const predicted = fourPL(standards[i][0], params);
      const residual = Math.abs(standards[i][1] - predicted);
      const stdResidual = residual / predicted;
      
      // Tukey bisquare weight function
      if (stdResidual < 1.0) {
        weights[i] = Math.pow(1 - Math.pow(stdResidual, 2), 2);
      } else {
        weights[i] = 0; // Outlier gets zero weight
      }
    }
  }
  
  return params;
}
```

### **4. Cook's Distance (Influence):**
```javascript
function calculateCooksDistance(point, curve, allPoints) {
  // Fit curve WITH this point
  const paramsWithPoint = fit4PL(allPoints);
  
  // Fit curve WITHOUT this point
  const paramsWithoutPoint = fit4PL(allPoints.filter(p => p !== point));
  
  // Calculate change in fitted values
  let sumSquaredChange = 0;
  for (const testPoint of allPoints) {
    const predWith = fourPL(testPoint[0], paramsWithPoint);
    const predWithout = fourPL(testPoint[0], paramsWithoutPoint);
    sumSquaredChange += Math.pow(predWith - predWithout, 2);
  }
  
  // Cook's distance
  const cookD = sumSquaredChange / (4 * MSE);
  
  // If Cook's D > 1, point has high influence → potential outlier
  return cookD;
}
```

---

## ✅ **CONCLUSION:**

MSD doesn't use a simple "CV > 25% = exclude" rule. Instead, it uses:

1. ✅ **Initial CV screening** (what I implemented)
2. ✅ **Monotonicity checking** (NEW - I need this!)
3. ✅ **Residual analysis** (NEW - I need this!)
4. ✅ **Influence/leverage detection** (NEW - I need this!)
5. ✅ **Iterative reweighted fitting** (NEW - I need this!)
6. ✅ **Sigmoid shape validation** (NEW - I need this!)

The MCP-1 plot is the **smoking gun** - it shows that even points with "acceptable" CV can be excluded if they don't fit the sigmoid model properly!

**This explains why my errors are 17-60%** - I'm only doing step 1, but MSD is doing all 6 steps!

