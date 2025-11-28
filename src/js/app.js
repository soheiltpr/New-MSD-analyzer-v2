/**
 * Main application controller (Recoded for Unified Cytokine Management)
 */
import { CONSTANTS } from './constants.js';
import { PlateManager } from './plate-manager.js';
import { AnalysisEngine } from './analysis-engine.js';
import { UIManager } from './ui-manager.js';
import { showNotification, downloadFile } from './utils.js';
import { initializeCytokineManager } from './cytokine-manager.js';
import { MSD_TRAINING_DATA, calculateConcentrationFromSignal } from './msd-training-data.js';
import { getWellKey } from './utils.js';
import { MSD_VALIDATION_DATA, validateMsdModel, getParamsFromTrainingData } from './msd-validation.js';

class MSDPlateAnalyzer {
  constructor() {
    this.plateManager = new PlateManager();
    this.analysisEngine = new AnalysisEngine(this.plateManager);
    this.uiManager = new UIManager(this.plateManager);
    this.mapping = [...CONSTANTS.DEFAULT_MAPPING];
    this.chart = null;
    this.analysisResults = {}; // Cache per cytokine
    this.cytokineManager = initializeCytokineManager(this.mapping);
    this.initialize();
  }

  initialize() {
    console.log('🚀 Initializing MSD Plate Analyzer (Recoded)');
    this.uiManager.initialize(this.mapping);
    this.setupUnifiedCytokineSystem();
    this.setupEventListeners();
    this.applyDefaultUnknownLayout();
    document.getElementById("runAnalysis").style.display = ""; // Ensure Analyze button is visible
  }

  setupUnifiedCytokineSystem() {
    this.cytokineManager.initializeAndBindListeners();
    this.cytokineManager.addListener(async (oldSpot, newSpot) => {
      console.log(`⚡ Event received: Cytokine changed from ${oldSpot} to ${newSpot}. Updating display.`);
      await this.updateDisplayForCurrentCytokine();
    });
  }

  async analyzeAllCytokines() {
    console.log(`🚀 Starting analysis for ALL cytokines`);
    showNotification(`Analyzing all cytokines...`, 'info', 2000);
    
    const totalCytokines = this.mapping.length;
    let completedCount = 0;
    
    // Clear all cached results to force fresh calculations
    this.analysisResults = {};
    
    for (let spotIndex = 0; spotIndex < totalCytokines; spotIndex++) {
      const cytokineName = this.mapping[spotIndex];
      console.log(`🔬 Analyzing ${cytokineName} (${spotIndex + 1}/${totalCytokines})`);
      
    try {
      const options = this.getAnalysisOptions();
        const result = await this.analysisEngine.runAnalysis(spotIndex, this.mapping, options);
        this.analysisResults[spotIndex] = result;
        completedCount++;
        
        // Update progress
        const progress = Math.round((completedCount / totalCytokines) * 100);
        showNotification(`Progress: ${progress}% (${completedCount}/${totalCytokines} cytokines)`, 'info', 500);
      
    } catch (error) {
        console.error(`❌ Analysis failed for ${cytokineName}:`, error);
        // Store error result so we can display it later
        this.analysisResults[spotIndex] = { error: error.message, cytokine: cytokineName };
      }
    }
    
    console.log(`✅ Analysis complete for all ${completedCount}/${totalCytokines} cytokines`);
    showNotification(`Analysis complete! ${completedCount}/${totalCytokines} cytokines processed`, 'success', 2000);
    
    // Now update the display for the currently selected cytokine
    await this.updateDisplayForCurrentCytokine();
  }

  async updateDisplayForCurrentCytokine() {
    const currentSpot = this.cytokineManager.getCurrentSpot();
    const cytokineName = this.cytokineManager.getCurrentCytokineName();
    
    console.log(`🔄 Updating display for ${cytokineName}`);
    
    // Step 1: Update Standards table concentrations
    this.updateStandardsTable();
    
    // Step 2: Display results if we have them
    const result = this.analysisResults[currentSpot];
    if (result) {
      if (result.error) {
        // Display error
        const resultsDiv = document.getElementById("analysisResults");
        if (resultsDiv) resultsDiv.innerHTML = `<p class="error-message">Error for ${cytokineName}: ${result.error}</p>`;
      } else {
        // Display successful results
        this.displayResults(result);
      }
    } else {
      // No results yet - show message
      const resultsDiv = document.getElementById("analysisResults");
      if (resultsDiv) resultsDiv.innerHTML = `<p>No analysis results for ${cytokineName}. Press "Analyze" to calculate all cytokines.</p>`;
    }
    
    // Step 3: Update plate view
    this.updatePlateView();
  }


  updateStandardsTable() {
    // Update the Standards table concentrations for the current cytokine
    console.log(`📏 Updating Standards table for ${this.cytokineManager.getCurrentCytokineName()}`);
    if (typeof window.updateStandardInputsForCytokine === 'function') {
      try {
        window.updateStandardInputsForCytokine();
        console.log(`✅ Standards table concentrations updated`);
      } catch (error) {
        console.warn('Failed to update standards table:', error);
      }
    } else {
      console.warn('updateStandardInputsForCytokine function not available');
    }
  }

  updatePlateView() {
    // Always use the HTML's renderPlate function since it has the complete implementation
    // including concentration display logic
    if (typeof window.renderPlate === 'function') {
      window.renderPlate();
    } else {
      console.warn('⚠️ HTML renderPlate function not available, using UIManager fallback');
      this.uiManager.render(this.cytokineManager.getCurrentSpot());
    }
  }

  displayResults(result) {
    this.uiManager.displayResults(result);
    // createChart is a legacy function living on app.js
    if (this.createChart) this.createChart(result);
    
    // Update global calculatedConcentrations so the HTML renderPlate can access them
    this.updateGlobalCalculatedConcentrations(result);
  }
  
  updateGlobalCalculatedConcentrations(result) {
    const currentSpot = this.cytokineManager.getCurrentSpot();
    
    // Ensure the global calculatedConcentrations structure exists
    if (typeof window.calculatedConcentrations === 'undefined') {
      window.calculatedConcentrations = {};
    }
    if (!window.calculatedConcentrations[currentSpot]) {
      window.calculatedConcentrations[currentSpot] = {};
    }
    
    // Transfer analysis results to global structure
    if (result && result.results) {
      result.results.forEach(r => {
        const wellId = r.well;
        const row = wellId.charAt(0);
        const col = parseInt(wellId.slice(1));
        
        if (!window.calculatedConcentrations[currentSpot][row]) {
          window.calculatedConcentrations[currentSpot][row] = {};
        }
        
        // Store the reported concentration
        window.calculatedConcentrations[currentSpot][row][col] = r.reported || null;
      });
      
      console.log(`✅ Updated global calculatedConcentrations for cytokine ${currentSpot}`);
    }
  }
  
  setupEventListeners() {
    // Listen to both analyze buttons
    document.getElementById("runAnalysis").addEventListener("click", async () => {
      console.log('🧪 Analyze button clicked - analyzing ALL cytokines.');
      await this.analyzeAllCytokines();
    });
    
    const runAllCytokinesBtn = document.getElementById("runAllCytokines");
    if (runAllCytokinesBtn) {
      runAllCytokinesBtn.addEventListener("click", async () => {
        console.log('🧪 Analyze All Cytokines button clicked.');
        await this.analyzeAllCytokines();
      });
    }

    const runMSDAnalyzerBtn = document.getElementById("runMSDAnalyzer");
    if (runMSDAnalyzerBtn) {
      runMSDAnalyzerBtn.addEventListener("click", () => {
        console.log('🧪 MSD Analyzer button clicked.');
        this.runMsdAnalyzer();
      });
    }

    // Set up event listener for "Analyze by 4 Parameters" button
    // Use multiple approaches to ensure it works
    const setup4ParamsButton = () => {
      const analyzeBy4ParamsBtn = document.getElementById("analyzeBy4Params");
      if (analyzeBy4ParamsBtn) {
        console.log('✅ Found analyzeBy4Params button, setting up event listener');
        
        // Remove any existing listeners by cloning the button
        const newBtn = analyzeBy4ParamsBtn.cloneNode(true);
        analyzeBy4ParamsBtn.parentNode.replaceChild(newBtn, analyzeBy4ParamsBtn);
        
        // Add event listener
        newBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('📐 Analyze by 4 Parameters button clicked (event listener).');
          try {
            if (this && typeof this.show4ParamsDialog === 'function') {
              this.show4ParamsDialog();
            } else if (window.msdApp && typeof window.msdApp.show4ParamsDialog === 'function') {
              window.msdApp.show4ParamsDialog();
            } else {
              console.error('show4ParamsDialog function not available');
              alert('4 Parameters feature not ready. Please refresh the page.');
            }
          } catch (error) {
            console.error('Error showing 4 params dialog:', error);
            if (typeof showNotification === 'function') {
              showNotification('Error opening 4 Parameters dialog: ' + error.message, 'error');
            } else {
              alert('Error: ' + error.message);
            }
          }
        });
        
        return true;
      }
      return false;
    };
    
    // Try immediately
    if (!setup4ParamsButton()) {
      console.warn('⚠️ analyzeBy4Params button not found, will retry...');
      // Try again after delays
      setTimeout(() => {
        if (!setup4ParamsButton()) {
          setTimeout(() => {
            if (!setup4ParamsButton()) {
              console.error('❌ analyzeBy4Params button not found after multiple retries');
            }
          }, 1000);
        }
      }, 500);
    }

    document.getElementById("exportCSV").addEventListener("click", () => this.exportCSV());
    document.getElementById("downloadPNG").addEventListener("click", () => this.downloadPNG());
    document.getElementById("exportJSON").addEventListener("click", () => this.exportJSON());
    document.getElementById("model").addEventListener("change", (e) => {
        document.getElementById("fixed4plBox").style.display = (e.target.value === "4pl") ? "grid" : "none";
    });
    document.getElementById("assignCols").addEventListener("click", () => this.selectColumns());
    document.getElementById("clearAll").addEventListener("click", () => this.clearAllRoles());
    document.getElementById("applyStdLayout").addEventListener("click", () => this.applyStandardsLayout());
    document.getElementById("applyUnknownDefaults").addEventListener("click", () => this.applyUnknownDefaults());
  }

  // Merged helper functions from previous version
  getAnalysisOptions() { return { model: document.getElementById("model").value, weightMode: document.getElementById("fitWeight").value, sampleDilution: Number(document.getElementById("sampleDilution").value) || 1, fixedParams: { b1: Number(document.getElementById("b1").value), b2: Number(document.getElementById("b2").value), b3: Number(document.getElementById("b3").value), b4: Number(document.getElementById("b4").value) } }; }
  exportCSV() { const result = this.analysisResults[this.cytokineManager.getCurrentSpot()]; if (!result) { showNotification("No results to export.", "warning"); return; } const headers = ["Well", "Group", "Signal", "Undiluted_Conc", "Dilution", "Reported_Conc"]; const rows = result.results.map(r => [r.well, r.group, r.signal, r.undiluted, r.dilution, r.reported]); const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n"); downloadFile(csvContent, `${this.cytokineManager.getCurrentCytokineName()}_results.csv`, "text/csv"); }
  downloadPNG() { if (!this.chart) { showNotification("No chart to download.", "warning"); return; } const link = document.createElement("a"); link.download = `${this.cytokineManager.getCurrentCytokineName()}_plot.png`; link.href = this.chart.toBase64Image("image/png", 1.0); link.click(); }
  exportJSON() { const data = { plateData: this.plateManager.exportPlateData(), analysisResults: this.analysisResults, mapping: this.mapping, currentSpot: this.cytokineManager.getCurrentSpot(), timestamp: new Date().toISOString() }; downloadFile(JSON.stringify(data, null, 2), `msd_session_${Date.now()}.json`, "application/json"); }
  clearAllRoles() {
    this.plateManager.clearAllData();
    this.analysisResults = {}; 
    this.updateDisplayForCurrentCytokine(); 
    showNotification("All data and roles cleared. Press Analyze to recalculate.", "success"); 
  }
  applyStandardsLayout() {
    try {
      const startWell = document.getElementById("stdStart").value;
      const orientation = document.getElementById("stdOrient").value;
      const levels = Number(document.getElementById("stdLevels").value) || 8;
      const series = Number(document.getElementById("stdSeries").value) || 1;
      const spacing = Number(document.getElementById("stdSpacing").value) || 1;
      this.plateManager.applyStandardsLayout(startWell, orientation, levels, series, spacing);
      this.analysisResults = {}; 
      this.updateDisplayForCurrentCytokine(); 
      showNotification("Standards layout applied. Press Analyze to recalculate.", "success"); 
    } catch (error) {
      showNotification(error.message, "error");
    }
  }
  applyUnknownDefaults() { try { const groupSpecs = Array.from(document.querySelectorAll("#unkGroupRows .form-row")).map(row => ({ name: row.querySelector(".group-name").value, spec: row.querySelector(".col-spec").value })).filter(g => g.name && g.spec); const rowStart = document.getElementById("unkRowStart").value; const rowEnd = document.getElementById("unkRowEnd").value; const topConc = Number(document.getElementById("unkTopConc").value); const dilution = Number(document.getElementById("unkDilution").value); const replicates = Number(document.getElementById("unkReplicates").value); this.plateManager.applyUnknownDefaults(groupSpecs, rowStart, rowEnd, topConc, dilution, replicates); this.cytokineManager.setCurrentSpot(this.cytokineManager.getCurrentSpot(), 'force'); showNotification("Unknown defaults applied.", "success"); } catch (error) { showNotification(error.message, "error"); } }
  applyDefaultUnknownLayout() { /* This can be configured for a default setup */ }
  createChart(result) { if (this.chart) { this.chart.destroy(); } const { model, standards, byGroup } = result; const datasets = []; datasets.push({ label: "Standards", data: standards.points.filter(p => p.conc > 0).map(p => ({ x: p.conc, y: p.signal })), pointStyle: "rectRot", radius: 6, backgroundColor: "rgba(255, 99, 132, 0.8)" }); const xs = standards.x_conc.filter(v => v > 0); if (xs.length > 1) { const xMin = Math.min(...xs); const xMax = Math.max(...xs); const curveData = this.analysisEngine.generateCurveData(model, xMin, xMax); datasets.push({ label: "Fit Curve", data: curveData, type: 'line', borderColor: "rgba(75, 192, 192, 1)", borderWidth: 2, fill: false, pointRadius: 0 }); } Object.entries(byGroup).forEach(([group, arr]) => { datasets.push({ label: group, data: arr.map(p => ({ x: p.undiluted, y: p.signal })), backgroundColor: arr[0]?.color || '#0000FF', radius: 5 }); }); this.chart = new Chart(document.getElementById("chart").getContext("2d"), { type: 'scatter', data: { datasets }, options: { scales: { x: { type: 'logarithmic', title: { display: true, text: 'Concentration' } }, y: { type: 'linear', title: { display: true, text: 'Signal' } } } } }); }      
  
  // Global function wrappers for HTML compatibility
  renderPlate() {
    if (this.uiManager) {
      this.uiManager.render(this.cytokineManager.getCurrentSpot());
    }
  }
  
  updateStandardInputsForCytokine() {
    // This function is expected by the HTML but the new system handles this differently
    // For now, we'll provide a no-op implementation
    console.log('updateStandardInputsForCytokine called - handled by new cytokine manager');
  }

  /**
   * Run MSD Analyzer using trained 4PL parameters
   * Calculates concentrations for all unknown samples using inverse 4PL
   */
  runMsdAnalyzer() {
    console.log('🧪 Starting MSD Analyzer...');
    
    // Show sheet selection dialog
    const sheetKey = prompt('Select sheet:\n1. E3_P4\n2. E3_P6\n\nEnter 1 or 2:', '1');
    if (!sheetKey || (sheetKey !== '1' && sheetKey !== '2')) {
      showNotification('Sheet selection cancelled or invalid.', 'warning');
      return;
    }
    
    const selectedSheet = sheetKey === '1' ? 'E3_P4' : 'E3_P6';
    const sheetData = MSD_TRAINING_DATA[selectedSheet];
    
    if (!sheetData) {
      showNotification(`Training data not found for sheet ${selectedSheet}`, 'error');
      return;
    }
    
    // Collect all unknown samples (non-standard wells)
    const results = [];
    
    for (const row of CONSTANTS.ROWS) {
      for (const col of CONSTANTS.COLS) {
        const wellKey = getWellKey(row, col);
        const role = this.plateManager.getWellRole(wellKey);
        
        // Skip standards and empty wells
        if (role && role.role === 'Std') {
          continue;
        }
        
        // Process each cytokine/spot
        for (let spotIndex = 0; spotIndex < this.mapping.length; spotIndex++) {
          const cytokineName = this.mapping[spotIndex];
          const signal = this.plateManager.getValue(row, col, spotIndex);
          
          // Skip if no signal data
          if (!Number.isFinite(signal) || signal <= 0) {
            continue;
          }
          
          // Get training data for this cytokine
          const trainingData = sheetData[cytokineName];
          if (!trainingData || !trainingData.params) {
            console.warn(`No training data for ${cytokineName} in ${selectedSheet}`);
            continue;
          }
          
          // Validate 4PL parameters before use
          const params = getParamsFromTrainingData(trainingData);
          if (!params) {
            console.warn(`Could not extract 4PL parameters for ${cytokineName} in ${selectedSheet}`);
            continue;
          }
          
          // Optional: Validate model (can be disabled for performance)
          const validation = validateMsdModel(MSD_VALIDATION_DATA, selectedSheet, cytokineName, params);
          if (!validation.passed) {
            console.warn(`⚠️ Validation failed for ${cytokineName} in ${selectedSheet}: max diff = ${validation.maxDiffPct.toFixed(2)}%`);
            // TODO: Trigger re-fitting if validation fails
          }
          
          // Calculate concentration using inverse 4PL
          const concentration = calculateConcentrationFromSignal(signal, trainingData.params);
          
          // Check detection limits (from training data params, not FourPLParams)
          const lloq = trainingData.params["Detection Limits: Calc. Low"];
          const uloq = trainingData.params["Detection Limits: Calc. High"];
          let flag = '';
          
          if (concentration === null) {
            flag = 'OUT_OF_RANGE';
          } else if (concentration < lloq) {
            flag = 'BELOW_LLOQ';
          } else if (concentration > uloq) {
            flag = 'ABOVE_ULOQ';
          } else {
            flag = 'WITHIN_RANGE';
          }
          
          results.push({
            well: wellKey,
            row: row,
            col: col,
            assay: cytokineName,
            spot: spotIndex + 1,
            signal: signal,
            concentration: concentration,
            lloq: lloq,
            uloq: uloq,
            flag: flag,
            group: role?.group || 'Unknown'
          });
        }
      }
    }
    
    if (results.length === 0) {
      showNotification('No unknown samples found with valid signals.', 'warning');
      return;
    }
    
    console.log(`✅ MSD Analyzer complete: ${results.length} results calculated`);
    this.displayMsdAnalyzerResults(results, selectedSheet);
    showNotification(`MSD Analyzer complete: ${results.length} concentrations calculated`, 'success');
  }

  /**
   * Display MSD Analyzer results in a table
   */
  displayMsdAnalyzerResults(results, sheetKey) {
    // Find or create results container
    let resultsDiv = document.getElementById('msdAnalyzerResults');
    if (!resultsDiv) {
      // Create container if it doesn't exist
      resultsDiv = document.createElement('div');
      resultsDiv.id = 'msdAnalyzerResults';
      resultsDiv.style.cssText = 'margin-top: 20px; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);';
      
      // Try to insert after analysis results or in a suitable location
      const analysisResults = document.getElementById('analysisResults');
      if (analysisResults && analysisResults.parentNode) {
        analysisResults.parentNode.insertBefore(resultsDiv, analysisResults.nextSibling);
      } else {
        // Fallback: insert in content area
        const content = document.querySelector('.content');
        if (content) {
          content.appendChild(resultsDiv);
        } else {
          document.body.appendChild(resultsDiv);
        }
      }
    }
    
    // Group results by well for better display
    const byWell = {};
    results.forEach(r => {
      if (!byWell[r.well]) {
        byWell[r.well] = [];
      }
      byWell[r.well].push(r);
    });
    
    // Build HTML table
    let html = `
      <h3>🧪 MSD Analyzer Results (Sheet: ${sheetKey})</h3>
      <div style="margin-bottom: 10px;">
        <button class="btn btn-success btn-sm" onclick="window.msdApp.exportMsdAnalyzerCSV()" style="margin-right: 10px;">
          📊 Export CSV
        </button>
        <span style="color: #666; font-size: 12px;">
          Total: ${results.length} measurements | Wells: ${Object.keys(byWell).length}
        </span>
      </div>
      <div style="max-height: 600px; overflow-y: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="background: #f3f4f6; position: sticky; top: 0;">
              <th style="padding: 8px; border: 1px solid #d1d5db; text-align: left;">Well</th>
              <th style="padding: 8px; border: 1px solid #d1d5db; text-align: left;">Group</th>
              <th style="padding: 8px; border: 1px solid #d1d5db; text-align: left;">Assay</th>
              <th style="padding: 8px; border: 1px solid #d1d5db; text-align: right;">Signal</th>
              <th style="padding: 8px; border: 1px solid #d1d5db; text-align: right;">Concentration</th>
              <th style="padding: 8px; border: 1px solid #d1d5db; text-align: right;">LLOQ</th>
              <th style="padding: 8px; border: 1px solid #d1d5db; text-align: right;">ULOQ</th>
              <th style="padding: 8px; border: 1px solid #d1d5db; text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    // Sort results by well, then by assay
    const sortedResults = results.sort((a, b) => {
      if (a.well !== b.well) {
        return a.well.localeCompare(b.well);
      }
      return a.assay.localeCompare(b.assay);
    });
    
    sortedResults.forEach(r => {
      const statusColor = {
        'WITHIN_RANGE': '#10b981',
        'BELOW_LLOQ': '#f59e0b',
        'ABOVE_ULOQ': '#ef4444',
        'OUT_OF_RANGE': '#6b7280'
      }[r.flag] || '#6b7280';
      
      const statusText = {
        'WITHIN_RANGE': '✓ In Range',
        'BELOW_LLOQ': '⚠ Below LLOQ',
        'ABOVE_ULOQ': '⚠ Above ULOQ',
        'OUT_OF_RANGE': '✗ Out of Range'
      }[r.flag] || 'Unknown';
      
      const concDisplay = r.concentration !== null 
        ? r.concentration.toFixed(4) 
        : 'N/A';
      
      html += `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 6px 8px; border: 1px solid #d1d5db;">${r.well}</td>
          <td style="padding: 6px 8px; border: 1px solid #d1d5db;">${r.group}</td>
          <td style="padding: 6px 8px; border: 1px solid #d1d5db;">${r.assay}</td>
          <td style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: right;">${r.signal.toFixed(2)}</td>
          <td style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: right; font-weight: ${r.concentration !== null ? '600' : '400'};">${concDisplay}</td>
          <td style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: right;">${r.lloq.toFixed(4)}</td>
          <td style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: right;">${r.uloq.toFixed(4)}</td>
          <td style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: center; color: ${statusColor}; font-weight: 600;">${statusText}</td>
        </tr>
      `;
    });
    
    html += `
          </tbody>
        </table>
      </div>
    `;
    
    resultsDiv.innerHTML = html;
    
    // Store results for export
    this.msdAnalyzerResults = results;
    this.msdAnalyzerSheet = sheetKey;
  }

  /**
   * Test function: Calculate concentration for E3_P6 from a signal value
   * @param {number} signal - Signal value to calculate concentration from
   * @param {string} cytokineName - Name of the cytokine/assay (e.g., "GM-CSF", "IFN-γ", etc.)
   * @returns {Object} - Result object with concentration and status info
   */
  testMsdAnalyzerE3P6(signal, cytokineName) {
    const sheetKey = 'E3_P6';
    const sheetData = MSD_TRAINING_DATA[sheetKey];
    
    if (!sheetData) {
      return { error: `Training data not found for sheet ${sheetKey}` };
    }
    
    if (!cytokineName) {
      return { error: 'Please specify a cytokine name' };
    }
    
    const trainingData = sheetData[cytokineName];
    if (!trainingData || !trainingData.params) {
      return { 
        error: `No training data for ${cytokineName} in ${sheetKey}`,
        availableCytokines: Object.keys(sheetData)
      };
    }
    
    const params = trainingData.params;
    const concentration = calculateConcentrationFromSignal(signal, params);
    
    const lloq = params["Detection Limits: Calc. Low"];
    const uloq = params["Detection Limits: Calc. High"];
    
    let status = '';
    let statusText = '';
    
    if (concentration === null) {
      status = 'OUT_OF_RANGE';
      statusText = 'Signal is outside the valid curve range';
    } else if (concentration < lloq) {
      status = 'BELOW_LLOQ';
      statusText = `Below Lower Limit of Quantification (${lloq.toFixed(4)})`;
    } else if (concentration > uloq) {
      status = 'ABOVE_ULOQ';
      statusText = `Above Upper Limit of Quantification (${uloq.toFixed(4)})`;
    } else {
      status = 'WITHIN_RANGE';
      statusText = 'Within quantifiable range';
    }
    
    const result = {
      sheet: sheetKey,
      assay: cytokineName,
      signal: signal,
      concentration: concentration,
      lloq: lloq,
      uloq: uloq,
      status: status,
      statusText: statusText,
      parameters: {
        top: params["Algorithm Parameter: Calc. Top"],
        bottom: params["Algorithm Parameter: Calc. Bottom"],
        midpoint: params["Algorithm Parameter: Calc. MidPoint"],
        hillSlope: params["Algorithm Parameter: Calc. HillSlope"]
      }
    };
    
    // Log to console for easy viewing
    console.log('🧪 MSD Analyzer Test Result (E3_P6):');
    console.log(`Assay: ${cytokineName}`);
    console.log(`Signal: ${signal}`);
    console.log(`Concentration: ${concentration !== null ? concentration.toFixed(4) : 'N/A'}`);
    console.log(`LLOQ: ${lloq.toFixed(4)} | ULOQ: ${uloq.toFixed(4)}`);
    console.log(`Status: ${statusText}`);
    
    return result;
  }

  /**
   * Export MSD Analyzer results to CSV
   */
  exportMsdAnalyzerCSV() {
    if (!this.msdAnalyzerResults || this.msdAnalyzerResults.length === 0) {
      showNotification('No MSD Analyzer results to export.', 'warning');
      return;
    }
    
    const headers = ['Well', 'Group', 'Assay', 'Signal', 'Concentration', 'LLOQ', 'ULOQ', 'Status'];
    const rows = this.msdAnalyzerResults.map(r => {
      const statusText = {
        'WITHIN_RANGE': 'In Range',
        'BELOW_LLOQ': 'Below LLOQ',
        'ABOVE_ULOQ': 'Above ULOQ',
        'OUT_OF_RANGE': 'Out of Range'
      }[r.flag] || 'Unknown';
      
      return [
        r.well,
        r.group,
        r.assay,
        r.signal.toFixed(2),
        r.concentration !== null ? r.concentration.toFixed(4) : 'N/A',
        r.lloq.toFixed(4),
        r.uloq.toFixed(4),
        statusText
      ];
    });
    
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const filename = `MSD_Analyzer_${this.msdAnalyzerSheet}_${Date.now()}.csv`;
    downloadFile(csvContent, filename, 'text/csv');
    showNotification(`Exported ${this.msdAnalyzerResults.length} results to ${filename}`, 'success');
  }

  /**
   * Show dialog for inputting custom 4PL parameters for each cytokine
   */
  show4ParamsDialog() {
    console.log('📐 Opening 4 Parameters dialog...');
    console.log('Current mapping:', this.mapping);
    console.log('this context:', this);
    
    // Check if mapping exists
    if (!this.mapping || this.mapping.length === 0) {
      console.error('No cytokines found in mapping');
      const msg = 'No cytokines configured. Please set up cytokines first.';
      if (typeof showNotification === 'function') {
        showNotification(msg, 'error');
      } else {
        alert(msg);
      }
      return;
    }
    
    // Get all cytokines from mapping
    const cytokines = this.mapping;
    console.log('Cytokines to process:', cytokines.length);
    
    // Create modal dialog
    const modal = document.createElement('div');
    modal.id = 'fourParamsModal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      overflow-y: auto;
      padding: 20px;
    `;
    
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      max-width: 1200px;
      width: 95%;
      max-height: 90vh;
      overflow-y: auto;
      margin: auto;
    `;
    
    // Build table HTML
    let tableHTML = `
      <h2 style="margin-top: 0; color: #1f2937; margin-bottom: 10px;">📐 Analyze by 4 Parameters</h2>
      <p style="color: #6b7280; margin-bottom: 20px;">Enter 4PL curve parameters for each cytokine:</p>
      
      <div style="overflow-x: auto; margin-bottom: 20px;">
        <table id="fourParamsTable" style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="padding: 12px; border: 1px solid #d1d5db; text-align: left; font-weight: 600; position: sticky; left: 0; background: #f3f4f6; z-index: 10;">Cytokine</th>
              <th style="padding: 12px; border: 1px solid #d1d5db; text-align: center; font-weight: 600;">Top</th>
              <th style="padding: 12px; border: 1px solid #d1d5db; text-align: center; font-weight: 600;">Bottom</th>
              <th style="padding: 12px; border: 1px solid #d1d5db; text-align: center; font-weight: 600;">MidPoint</th>
              <th style="padding: 12px; border: 1px solid #d1d5db; text-align: center; font-weight: 600;">HillSlope</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    // Add a row for each cytokine
    cytokines.forEach((cytokine, index) => {
      tableHTML += `
        <tr>
          <td style="padding: 10px; border: 1px solid #d1d5db; background: #f9fafb; font-weight: 600; position: sticky; left: 0; background: #f9fafb; z-index: 5;">${cytokine}</td>
          <td style="padding: 8px; border: 1px solid #d1d5db;">
            <input type="number" 
              id="paramTop_${index}" 
              data-cytokine="${cytokine}"
              step="any" 
              placeholder="e.g., 5371094" 
              style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px; box-sizing: border-box;">
          </td>
          <td style="padding: 8px; border: 1px solid #d1d5db;">
            <input type="number" 
              id="paramBottom_${index}" 
              data-cytokine="${cytokine}"
              step="any" 
              placeholder="e.g., 161.4381" 
              style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px; box-sizing: border-box;">
          </td>
          <td style="padding: 8px; border: 1px solid #d1d5db;">
            <input type="number" 
              id="paramMidPoint_${index}" 
              data-cytokine="${cytokine}"
              step="any" 
              placeholder="e.g., 10834.29" 
              style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px; box-sizing: border-box;">
          </td>
          <td style="padding: 8px; border: 1px solid #d1d5db;">
            <input type="number" 
              id="paramHillSlope_${index}" 
              data-cytokine="${cytokine}"
              step="any" 
              placeholder="e.g., 0.988987" 
              style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px; box-sizing: border-box;">
          </td>
        </tr>
      `;
    });
    
    tableHTML += `
          </tbody>
        </table>
      </div>
      
      <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <button id="cancel4Params" class="btn btn-secondary" style="padding: 12px 24px; font-size: 14px;">Cancel</button>
        <button id="analyze4Params" class="btn btn-primary" style="padding: 12px 24px; font-size: 14px; font-weight: 600;">🔬 Analyze</button>
      </div>
    `;
    
    dialog.innerHTML = tableHTML;
    modal.appendChild(dialog);
    document.body.appendChild(modal);
    
    console.log('✅ Modal created and added to DOM');
    
    // Focus on first input
    const firstInput = document.getElementById('paramTop_0');
    if (firstInput) {
      firstInput.focus();
    }
    
    // Event listeners
    document.getElementById('cancel4Params').addEventListener('click', () => {
      console.log('❌ Cancel clicked, closing modal');
      document.body.removeChild(modal);
    });
    
    document.getElementById('analyze4Params').addEventListener('click', () => {
      console.log('🔬 Analyze button clicked, collecting parameters...');
      
      // Collect parameters for each cytokine
      const paramsByCytokine = {};
      let hasErrors = false;
      const errors = [];
      
      cytokines.forEach((cytokine, index) => {
        const top = parseFloat(document.getElementById(`paramTop_${index}`).value);
        const bottom = parseFloat(document.getElementById(`paramBottom_${index}`).value);
        const midPoint = parseFloat(document.getElementById(`paramMidPoint_${index}`).value);
        const hillSlope = parseFloat(document.getElementById(`paramHillSlope_${index}`).value);
        
        // Check if all fields are filled for this cytokine
        const allFilled = Number.isFinite(top) && Number.isFinite(bottom) && 
                         Number.isFinite(midPoint) && Number.isFinite(hillSlope);
        
        if (allFilled) {
          // Validate values
          if (top <= bottom) {
            errors.push(`${cytokine}: Top must be greater than Bottom`);
            hasErrors = true;
            return;
          }
          
          if (midPoint <= 0 || hillSlope <= 0) {
            errors.push(`${cytokine}: MidPoint and HillSlope must be positive`);
            hasErrors = true;
            return;
          }
          
          paramsByCytokine[cytokine] = { top, bottom, midPoint, hillSlope };
        }
        // If not all filled, skip this cytokine (user can leave some empty)
      });
      
      if (hasErrors) {
        showNotification('Validation errors:\n' + errors.join('\n'), 'error');
        return;
      }
      
      if (Object.keys(paramsByCytokine).length === 0) {
        showNotification('Please enter parameters for at least one cytokine.', 'warning');
        return;
      }
      
      console.log(`✅ Collected parameters for ${Object.keys(paramsByCytokine).length} cytokines`);
      
      // Close modal and run analysis
      document.body.removeChild(modal);
      this.analyzeBy4ParamsPerCytokine(paramsByCytokine);
    });
    
    // Close on outside click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
    
    // Close on Escape key
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        document.body.removeChild(modal);
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
    
    console.log('✅ Event listeners attached');
  }

  /**
   * Analyze using custom 4PL parameters per cytokine
   */
  analyzeBy4ParamsPerCytokine(paramsByCytokine) {
    console.log('📐 Starting analysis with custom 4PL parameters per cytokine:', paramsByCytokine);
    
    // Collect all unknown samples (non-standard wells)
    const results = [];
    
    for (const row of CONSTANTS.ROWS) {
      for (const col of CONSTANTS.COLS) {
        const wellKey = getWellKey(row, col);
        const role = this.plateManager.getWellRole(wellKey);
        
        // Skip standards and empty wells
        if (role && role.role === 'Std') {
          continue;
        }
        
        // Process each cytokine/spot
        for (let spotIndex = 0; spotIndex < this.mapping.length; spotIndex++) {
          const cytokineName = this.mapping[spotIndex];
          
          // Skip if no parameters provided for this cytokine
          if (!paramsByCytokine[cytokineName]) {
            continue;
          }
          
          const signal = this.plateManager.getValue(row, col, spotIndex);
          
          // Skip if no signal data
          if (!Number.isFinite(signal) || signal <= 0) {
            continue;
          }
          
          // Get parameters for this cytokine
          const params = paramsByCytokine[cytokineName];
          
          // Create params object in the format expected by calculateConcentrationFromSignal
          const customParams = {
            "Algorithm Parameter: Calc. Top": params.top,
            "Algorithm Parameter: Calc. Bottom": params.bottom,
            "Algorithm Parameter: Calc. MidPoint": params.midPoint,
            "Algorithm Parameter: Calc. HillSlope": params.hillSlope,
            "Detection Limits: Calc. Low": 0,
            "Detection Limits: Calc. High": Infinity
          };
          
          // Calculate concentration using custom parameters
          const concentration = calculateConcentrationFromSignal(signal, customParams);
          
          let flag = '';
          if (concentration === null) {
            flag = 'OUT_OF_RANGE';
          } else if (concentration === 0) {
            flag = 'BELOW_BOTTOM';
          } else {
            flag = 'WITHIN_RANGE';
          }
          
          results.push({
            well: wellKey,
            row: row,
            col: col,
            assay: cytokineName,
            spot: spotIndex + 1,
            signal: signal,
            concentration: concentration,
            lloq: 0,
            uloq: Infinity,
            flag: flag,
            group: role?.group || 'Unknown',
            params: params // Store params for display
          });
        }
      }
    }
    
    if (results.length === 0) {
      showNotification('No unknown samples found with valid signals for the specified cytokines.', 'warning');
      return;
    }
    
    console.log(`✅ 4 Parameters analysis complete: ${results.length} results calculated`);
    this.display4ParamsResults(results, paramsByCytokine);
    showNotification(`Analysis complete: ${results.length} concentrations calculated`, 'success');
  }

  /**
   * Display results from 4 Parameters analysis
   */
  display4ParamsResults(results, paramsByCytokine) {
    // Find or create results container
    let resultsDiv = document.getElementById('fourParamsResults');
    if (!resultsDiv) {
      resultsDiv = document.createElement('div');
      resultsDiv.id = 'fourParamsResults';
      resultsDiv.style.cssText = 'margin-top: 20px; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);';
      
      const analysisResults = document.getElementById('analysisResults');
      if (analysisResults && analysisResults.parentNode) {
        analysisResults.parentNode.insertBefore(resultsDiv, analysisResults.nextSibling);
      } else {
        const content = document.querySelector('.content');
        if (content) {
          content.appendChild(resultsDiv);
        } else {
          document.body.appendChild(resultsDiv);
        }
      }
    }
    
    // Group results by well
    const byWell = {};
    results.forEach(r => {
      if (!byWell[r.well]) {
        byWell[r.well] = [];
      }
      byWell[r.well].push(r);
    });
    
    // Build HTML table
    let paramsSummary = '<strong>Parameters used:</strong><br>';
    Object.keys(paramsByCytokine).forEach(cytokine => {
      const p = paramsByCytokine[cytokine];
      paramsSummary += `${cytokine}: Top=${p.top.toFixed(2)}, Bottom=${p.bottom.toFixed(2)}, MidPoint=${p.midPoint.toFixed(2)}, HillSlope=${p.hillSlope.toFixed(4)}<br>`;
    });
    
    let html = `
      <h3>📐 4 Parameters Analysis Results</h3>
      <div style="margin-bottom: 15px; padding: 10px; background: #f3f4f6; border-radius: 6px; font-size: 12px;">
        ${paramsSummary}
      </div>
      <div style="margin-bottom: 10px;">
        <button class="btn btn-success btn-sm" onclick="window.msdApp.export4ParamsCSV()" style="margin-right: 10px;">
          📊 Export CSV
        </button>
        <span style="color: #666; font-size: 12px;">
          Total: ${results.length} measurements | Wells: ${Object.keys(byWell).length}
        </span>
      </div>
      <div style="max-height: 600px; overflow-y: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="background: #f3f4f6; position: sticky; top: 0;">
              <th style="padding: 8px; border: 1px solid #d1d5db; text-align: left;">Well</th>
              <th style="padding: 8px; border: 1px solid #d1d5db; text-align: left;">Group</th>
              <th style="padding: 8px; border: 1px solid #d1d5db; text-align: left;">Assay</th>
              <th style="padding: 8px; border: 1px solid #d1d5db; text-align: right;">Signal</th>
              <th style="padding: 8px; border: 1px solid #d1d5db; text-align: right;">Concentration</th>
              <th style="padding: 8px; border: 1px solid #d1d5db; text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    // Sort results by well, then by assay
    const sortedResults = results.sort((a, b) => {
      if (a.well !== b.well) {
        return a.well.localeCompare(b.well);
      }
      return a.assay.localeCompare(b.assay);
    });
    
    sortedResults.forEach(r => {
      const statusColor = {
        'WITHIN_RANGE': '#10b981',
        'BELOW_BOTTOM': '#f59e0b',
        'OUT_OF_RANGE': '#6b7280'
      }[r.flag] || '#6b7280';
      
      const statusText = {
        'WITHIN_RANGE': '✓ Calculated',
        'BELOW_BOTTOM': '⚠ Below Bottom',
        'OUT_OF_RANGE': '✗ Out of Range'
      }[r.flag] || 'Unknown';
      
      const concDisplay = r.concentration !== null && r.concentration !== 0
        ? r.concentration.toFixed(4) 
        : (r.concentration === 0 ? '0.0000' : 'N/A');
      
      html += `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 6px 8px; border: 1px solid #d1d5db;">${r.well}</td>
          <td style="padding: 6px 8px; border: 1px solid #d1d5db;">${r.group}</td>
          <td style="padding: 6px 8px; border: 1px solid #d1d5db;">${r.assay}</td>
          <td style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: right;">${r.signal.toFixed(2)}</td>
          <td style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: right; font-weight: ${r.concentration !== null && r.concentration !== 0 ? '600' : '400'};">${concDisplay}</td>
          <td style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: center; color: ${statusColor}; font-weight: 600;">${statusText}</td>
        </tr>
      `;
    });
    
    html += `
          </tbody>
        </table>
      </div>
    `;
    
    resultsDiv.innerHTML = html;
    
    // Store results for CSV export
    this.fourParamsResults = results;
    this.fourParamsParams = paramsByCytokine;
  }

  /**
   * Export 4 Parameters analysis results to CSV
   */
  export4ParamsCSV() {
    if (!this.fourParamsResults || this.fourParamsResults.length === 0) {
      showNotification('No 4 Parameters analysis results to export.', 'warning');
      return;
    }
    
    const headers = ['Well', 'Group', 'Assay', 'Signal', 'Concentration', 'Status'];
    const rows = this.fourParamsResults.map(r => {
      const statusText = {
        'WITHIN_RANGE': 'Calculated',
        'BELOW_BOTTOM': 'Below Bottom',
        'OUT_OF_RANGE': 'Out of Range'
      }[r.flag] || 'Unknown';
      
      return [
        r.well,
        r.group,
        r.assay,
        r.signal.toFixed(2),
        r.concentration !== null && r.concentration !== 0 ? r.concentration.toFixed(4) : (r.concentration === 0 ? '0.0000' : 'N/A'),
        statusText
      ];
    });
    
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const filename = `4Params_Analysis_${Date.now()}.csv`;
    downloadFile(csvContent, filename, 'text/csv');
    showNotification(`Exported ${this.fourParamsResults.length} results to ${filename}`, 'success');
  }
}

// Expose 4 Parameters dialog function globally BEFORE DOM loads
window.show4ParamsDialog = function() {
  if (window.msdApp && typeof window.msdApp.show4ParamsDialog === 'function') {
    window.msdApp.show4ParamsDialog();
  } else {
    console.error('window.msdApp.show4ParamsDialog is not available yet');
    // Wait a bit and try again
    setTimeout(() => {
      if (window.msdApp && typeof window.msdApp.show4ParamsDialog === 'function') {
        window.msdApp.show4ParamsDialog();
      } else {
        console.error('Still not available after wait');
      }
    }, 100);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  window.msdApp = new MSDPlateAnalyzer();
  
  // Expose global functions for HTML compatibility
  window.renderPlate = () => window.msdApp.renderPlate();
  window.updateStandardInputsForCytokine = () => window.msdApp.updateStandardInputsForCytokine();
  window.currentCytokine = 0; // Global variable expected by HTML
  
  // Expose MSD Analyzer test function globally
  window.testMsdAnalyzerE3P6 = (signal, cytokineName) => {
    return window.msdApp.testMsdAnalyzerE3P6(signal, cytokineName);
  };
  
  // Update the global function to use the instance
  window.show4ParamsDialog = function() {
    if (window.msdApp && typeof window.msdApp.show4ParamsDialog === 'function') {
      window.msdApp.show4ParamsDialog();
    } else {
      console.error('window.msdApp.show4ParamsDialog is not available');
    }
  };
  
  // Ensure 4 Parameters button event listener is set up (fallback)
  setTimeout(() => {
    const analyzeBy4ParamsBtn = document.getElementById("analyzeBy4Params");
    if (analyzeBy4ParamsBtn && !analyzeBy4ParamsBtn.hasAttribute('data-listener-attached')) {
      console.log('🔧 Setting up fallback event listener for analyzeBy4Params button');
      analyzeBy4ParamsBtn.setAttribute('data-listener-attached', 'true');
      analyzeBy4ParamsBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('📐 Analyze by 4 Parameters button clicked (fallback listener).');
        if (window.msdApp && typeof window.msdApp.show4ParamsDialog === 'function') {
          try {
            window.msdApp.show4ParamsDialog();
          } catch (error) {
            console.error('Error showing 4 params dialog:', error);
            if (typeof showNotification === 'function') {
              showNotification('Error opening 4 Parameters dialog: ' + error.message, 'error');
            } else {
              alert('Error: ' + error.message);
            }
          }
        } else {
          console.error('window.msdApp.show4ParamsDialog is not available');
          alert('4 Parameters feature not available. Please refresh the page.');
        }
      });
    }
  }, 1000);
  
  // Initialize the global currentCytokine to sync with cytokine manager
  if (window.msdApp.cytokineManager) {
    window.currentCytokine = window.msdApp.cytokineManager.getCurrentSpot();
  }
});
