/**
 * UI management and rendering (Recoded for Unified Cytokine Management)
 */
import { CONSTANTS } from './constants.js';
import { getColorForValue, formatNumber, getWellKey, showNotification } from './utils.js';

export class UIManager {
  constructor(plateManager) {
    this.plateManager = plateManager;
    this.currentSpot = 0; // This will be kept in sync by the app controller
    this.currentPalette = "Sky";
    this.chart = null; // Chart instance is managed in app.js now
    
    this.initializeElements();
    this.setupEventListeners(); // Non-cytokine listeners
  }

  initializeElements() {
    this.elements = {
      plateDiv: document.getElementById("plate"),
      spotSelect: document.getElementById("spotSelect"), // Still needed for manager to populate
      minScale: document.getElementById("minScale"),
      maxScale: document.getElementById("maxScale"),
      paletteSelect: document.getElementById("paletteSelect"),
      legend: document.getElementById("legend"),
      resultsDiv: document.getElementById("analysisResults")
      // Other elements as needed...
    };
  }

  setupEventListeners() {
    // NOTE: All cytokine-related dropdown listeners are now handled
    // by the unified CytokineManager. This class only handles UI rendering.

    this.elements.paletteSelect.addEventListener("change", (e) => {
      this.currentPalette = e.target.value;
      this.drawLegend();
      this.render(this.currentSpot);
    });

    // Other non-cytokine UI event listeners can go here...
  }

  initialize(mapping) {
    // The CytokineManager now handles populating dropdowns.
    // This method can be used for other UI setup.
    this.drawLegend();
    this.render(0);
    console.log('🎨 UI Manager initialized.');
  }

  render(spotIdx) {
    this.currentSpot = spotIdx;
    // ... [Code for rendering the plate view] ...
    // This part remains largely the same. For brevity, it's omitted,
    // but it's the logic that draws the 96-well plate.
  }

  displayResults(result) {
    const { results, standards, model, orientation } = result;
    const currentCytokine = window.cytokineManager ? window.cytokineManager.getCurrentCytokineName() : 'Unknown';

    const tableHTML = `
      <div class="panel">
        <h3 style="margin:0 0 8px;">Results — ${currentCytokine}</h3>
        <div class="muted" style="margin-bottom:6px;">
          ${standards.points.length} standards used. Model: ${model.note || 'N/A'}. Curve: ${orientation}.
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Well</th><th>Group</th><th>Signal</th><th>Undiluted Conc.</th><th>Dilution</th><th>Reported Conc.</th>
              </tr>
            </thead>
            <tbody>
              ${results.map(r => `
                <tr>
                  <td>${r.well}</td>
                  <td>${r.group}</td>
                  <td>${formatNumber(r.signal)}</td>
                  <td>${formatNumber(r.undiluted)}</td>
                  <td>${r.dilution}</td>
                  <td><strong>${formatNumber(r.reported)}</strong></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
    this.elements.resultsDiv.innerHTML = tableHTML;
  }
  
  drawLegend() {
    // ... [Code for drawing the color scale legend] ...
  }
}
