# Multi-Plate Analysis System - Implementation Plan

## Overview
Add the ability to analyze multiple plates simultaneously with a tab-based interface for plate management and aggregated views showing all plates side-by-side.

## Architecture Changes Required

### 1. Data Storage Structure
Current: Single global state
```javascript
let plateData = {};
let analysisResults = {};
```

New: Multi-plate state with plate IDs
```javascript
let allPlates = {
  'plate1': {
    id: 'plate1',
    name: 'Plate 1',
    plateData: {},
    analysisResults: {},
    wellRoles: {},
    wellCompounds: {},
    wellConcentrations: {},
    wellDilutions: {},
    currentCytokine: 0,
    config: {}
  }
};
let currentPlateId = 'plate1';
```

### 2. UI Components to Add

#### A. Plate Tab Bar (below main action buttons)
```html
<div id="plateTabContainer" style="background: white; padding: 10px; border-bottom: 2px solid #e5e7eb;">
  <div style="display: flex; justify-content: space-between; align-items: center;">
    <div id="plateTabs" style="display: flex; gap: 5px; flex-wrap: wrap;">
      <!-- Tabs generated dynamically -->
    </div>
    <button onclick="addNewPlate()" style="padding: 8px 15px; background: #3b82f6; color: white; border: none; border-radius: 5px; cursor: pointer;">
      + Add Plate
    </button>
  </div>
</div>
```

#### B. Current Plate Selector
```html
<div style="padding: 10px; background: #f8fafc; border-bottom: 1px solid #d1d5db;">
  <label style="font-weight: 600; color: #374151; margin-right: 10px;">Current Plate:</label>
  <select id="plateSelector" onchange="switchPlate(this.value)" style="padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 4px;">
    <!-- Options generated dynamically -->
  </select>
  
  <label style="font-weight: 600; color: #374151; margin-left: 20px; margin-right: 10px;">Current Cytokine:</label>
  <select id="cytokineSelect" onchange="switchCytokine(this.value)" style="padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 4px;">
    <!-- Existing cytokine options -->
  </select>
</div>
```

#### C. All Plates View Checkbox
```html
<div style="padding: 10px; background: #fef3c7; border-bottom: 1px solid #fbbf24; text-align: center;">
  <label style="display: inline-flex; align-items: center; gap: 8px; cursor: pointer;">
    <input type="checkbox" id="showAllPlatesView" onchange="toggleAllPlatesView()" style="width: 18px; height: 18px;">
    <span style="font-weight: 600; color: #92400e;">
      📊 Show All Plates (Aggregated View)
    </span>
  </label>
</div>
```

### 3. Core Functions to Implement

#### A. Plate Management Functions
```javascript
// Add new plate
function addNewPlate() {
  const plateId = `plate${Object.keys(allPlates).length + 1}`;
  const plateName = `Plate ${Object.keys(allPlates).length + 1}`;
  
  allPlates[plateId] = {
    id: plateId,
    name: plateName,
    plateData: {},
    analysisResults: {},
    wellRoles: {...wellRoles}, // Copy current well roles
    wellCompounds: {...wellCompounds},
    wellConcentrations: {...wellConcentrations},
    wellDilutions: {...wellDilutions},
    currentCytokine: 0,
    config: {...currentConfig}
  };
  
  // Load plate data from file or initialize empty
  initializePlateDataForPlate(plateId);
  
  renderPlateTabs();
  switchPlate(plateId);
}

// Switch active plate
function switchPlate(plateId) {
  currentPlateId = plateId;
  const plate = allPlates[plateId];
  
  // Load plate data into global state
  plateData = plate.plateData;
  wellRoles = plate.wellRoles;
  wellCompounds = plate.wellCompounds;
  wellConcentrations = plate.wellConcentrations;
  wellDilutions = plate.wellDilutions;
  analysisResults = plate.analysisResults;
  currentCytokine = plate.currentCytokine;
  
  // Update UI
  renderPlate();
  updateAllDisplays();
  
  // Update context
  window.currentPlateId = plateId;
  
  console.log('Switched to plate:', plateId);
}

// Render plate tabs
function renderPlateTabs() {
  const container = document.getElementById('plateTabs');
  container.innerHTML = '';
  
  Object.values(allPlates).forEach(plate => {
    const tab = document.createElement('div');
    tab.className = 'plate-tab';
    tab.style.cssText = currentPlateId === plate.id 
      ? 'padding: 8px 15px; background: #3b82f6; color: white; border-radius: 5px; cursor: pointer; font-weight: 600;'
      : 'padding: 8px 15px; background: #e5e7eb; color: #374151; border-radius: 5px; cursor: pointer;';
    
    tab.textContent = plate.name;
    tab.onclick = () => switchPlate(plate.id);
    container.appendChild(tab);
  });
}

// Toggle all plates view
function toggleAllPlatesView() {
  const showAll = document.getElementById('showAllPlatesView').checked;
  window.showAllPlates = showAll;
  
  if (showAll) {
    // Show aggregated data from all plates
    displayAllPlatesResults();
    displayAllPlatesStandardCurves();
    displayAllPlatesCompoundAnalysis();
    displayAllPlatesPlots();
    displayAllPlatesSchematics();
  } else {
    // Show only current plate
    displayAnalysisResultsFor(currentCytokine);
    // ... other single-plate displays
  }
}
```

#### B. Aggregated Display Functions
```javascript
// Show all plates in results table
function displayAllPlatesResults() {
  const allUnknowns = [];
  let plateIndex = 1;
  
  Object.values(allPlates).forEach(plate => {
    plate.analysisResults.forEach((result, cytokineIndex) => {
      result.unknowns.forEach(unk => {
        allUnknowns.push({
          ...unk,
          plate: plate.name,
          plateIndex,
          well: `${unk.well} (${plate.name})`
        });
      });
    });
    plateIndex++;
  });
  
  // Render table with all unknowns
  renderUnknownsTable(allUnknowns);
}

// Show all standard curves stacked
function displayAllPlatesStandardCurves() {
  const container = document.getElementById('allPlatesStandardCurves');
  container.innerHTML = '';
  
  Object.values(allPlates).forEach(plate => {
    const plateSection = document.createElement('div');
    plateSection.innerHTML = `
      <h3>${plate.name}</h3>
      <div data-plate-id="${plate.id}" class="standard-curve-container"></div>
    `;
    container.appendChild(plateSection);
    
    // Mount standard curve for this plate
    mountStandardCurveUIForPlate(plate.id, plate.currentCytokine);
  });
}

// Similar functions for compound analysis, plots, schematics
```

### 4. Key Modifications Needed

#### Global Variables
- Add `let allPlates = {}`
- Add `let currentPlateId = 'plate1'`
- Add `let showAllPlates = false`

#### Function Updates
- Update all data access to use `allPlates[currentPlateId]`
- Update all save operations to save to current plate's state
- Add plate ID parameter to key functions

#### Export Functions
- Modify to export all plates or current plate based on setting
- Add "Export All Plates" option

### 5. Implementation Order

1. **Phase 1: Basic Multi-Plate Storage**
   - Create data structure
   - Add plate management functions
   - Update data access

2. **Phase 2: UI Elements**
   - Add plate tabs
   - Add current plate selector
   - Add "show all plates" toggle

3. **Phase 3: Aggregated Views**
   - Implement all-plates display for each section
   - Update export functions

4. **Phase 4: Testing & Polish**
   - Test plate switching
   - Test aggregated views
   - Test exports with multiple plates

## Files to Modify
- `index.html` - Add UI elements and JavaScript functions
- All data storage locations need plate context
- All display functions need plate-aware logic

## Estimated Complexity
- **High** - Requires extensive refactoring of data flow
- Estimated 2,000+ lines of changes across multiple sections
- Significant testing required

## Recommendation
Consider implementing incrementally:
1. Start with 2-plate support
2. Add UI elements
3. Test thoroughly
4. Expand to unlimited plates

