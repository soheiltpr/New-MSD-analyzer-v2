/**
 * Single Source of Truth for Cytokine Management (Recoded)
 * This class ONLY manages the current cytokine state and notifies listeners.
 * It does not trigger analysis or table updates directly.
 */
export class CytokineManager {
  constructor(mapping = []) {
    this.mapping = mapping;
    this.currentSpot = 0;
    this.listeners = [];
    console.log('🧬 CytokineManager (Recoded) initialized.');
  }

  setCurrentSpot(newSpot, source = 'unknown') {
    const oldSpot = this.currentSpot;
    newSpot = Number(newSpot) || 0;

    if (newSpot < 0 || newSpot >= this.mapping.length) {
      console.warn(`Invalid cytokine spot: ${newSpot}, defaulting to 0.`);
      newSpot = 0;
    }

    if (oldSpot === newSpot && source !== 'force') {
      return; // No change
    }

    console.log(`🧬 Cytokine state changed: ${this.mapping[oldSpot]} → ${this.mapping[newSpot]} [source: ${source}]`);
    this.currentSpot = newSpot;

    this.updateAllDropdowns();
    this.notifyListeners(oldSpot, newSpot);
  }

  getCurrentSpot() {
    return this.currentSpot;
  }

  getCurrentCytokineName() {
    return this.mapping[this.currentSpot] || 'Unknown';
  }

  addListener(callback) {
    this.listeners.push(callback);
  }

  notifyListeners(oldSpot, newSpot) {
    this.listeners.forEach(callback => callback(oldSpot, newSpot));
    
    // Also update global currentCytokine for HTML compatibility
    if (typeof window.currentCytokine !== 'undefined') {
      window.currentCytokine = this.currentSpot;
    }
  }

  updateAllDropdowns() {
    const spotValue = String(this.currentSpot);
    const dropdownIds = ['spotSelect', 'cytokineSelect', 'resultsCytokineSelect'];
    dropdownIds.forEach(id => {
      const dropdown = document.getElementById(id);
      if (dropdown && dropdown.value !== spotValue) {
        dropdown.value = spotValue;
      }
    });
    // Update the global currentCytokine variable that the standards table depends on
    if (typeof window.currentCytokine !== 'undefined') {
      window.currentCytokine = this.currentSpot;
    }
  }

  initializeAndBindListeners() {
    console.log('🔧 Initializing and binding all cytokine dropdowns.');
    const dropdownIds = ['spotSelect', 'cytokineSelect', 'resultsCytokineSelect'];
    dropdownIds.forEach(id => {
      const dropdown = document.getElementById(id);
      if (dropdown) {
        // Clear any old listeners
        const newDropdown = dropdown.cloneNode(true);
        dropdown.parentNode.replaceChild(newDropdown, dropdown);
        
        // Add the single, unified listener
        newDropdown.addEventListener('change', (e) => {
          this.setCurrentSpot(e.target.value, id);
        });

        // Populate options
        newDropdown.innerHTML = '';
        this.mapping.forEach((name, index) => {
          const option = document.createElement('option');
          option.value = String(index);
          option.textContent = name;
          newDropdown.appendChild(option);
        });
      }
    });
    this.updateAllDropdowns();
  }
}

// Global instance setup
window.cytokineManager = null;
export function initializeCytokineManager(mapping) {
  if (!window.cytokineManager) {
    window.cytokineManager = new CytokineManager(mapping);
  }
  return window.cytokineManager;
}
