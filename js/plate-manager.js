/**
 * Plate data management and operations
 */

import { CONSTANTS, ERROR_MESSAGES } from './constants.js';
import { getWellKey, parseWell, validateWellFormat, showNotification } from './utils.js';

export class PlateManager {
  constructor() {
    this.plate = this.initializePlate();
    this.wellRoles = {};
    this.wellMeta = {};
    this.groupColors = {};
    this.groupColorOrder = 0;
    this.selectedWells = new Set();
  }

  /**
   * Initialize empty plate data structure
   */
  initializePlate() {
    const plate = {};
    for (const row of CONSTANTS.ROWS) {
      plate[row] = {};
      for (const col of CONSTANTS.COLS) {
        plate[row][col] = Array(CONSTANTS.SPOTS).fill(NaN);
      }
    }
    return plate;
  }

  /**
   * Get value at specific well and spot
   */
  getValue(row, col, spot) {
    return this.plate?.[row]?.[col]?.[spot];
  }

  /**
   * Set value at specific well and spot
   */
  setValue(row, col, spot, value) {
    if (this.plate[row] && this.plate[row][col]) {
      this.plate[row][col][spot] = value;
    }
  }

  /**
   * Get all values for a specific spot
   */
  getValuesForSpot(spot) {
    const values = [];
    for (const row of CONSTANTS.ROWS) {
      for (const col of CONSTANTS.COLS) {
        values.push(this.getValue(row, col, spot));
      }
    }
    return values;
  }

  /**
   * Parse MSD raw data
   */
  parseMSDRawData(text) {
    try {
      const start = text.indexOf("==========Data");
      if (start < 0) {
        throw new Error(ERROR_MESSAGES.NO_DATA_SECTION);
      }

      const tail = text.slice(start);
      let end = tail.length;
      
      // Find end of data section
      const endMarkers = [
        "==========Processing",
        "==========Statistics", 
        "==========Camera",
        "==========Waveform"
      ];
      
      for (const marker of endMarkers) {
        const i = tail.indexOf(marker);
        if (i > 0) end = Math.min(end, i);
      }

      const block = tail.slice(0, end);
      const lines = block.split(/[\r\n]+/)
        .map(s => s.replace(/[^\S\r\n]+/g, " ").trimEnd());

      // Find column header
      let idx = 0;
      while (idx < lines.length && !/\b1\b.*\b12\b/.test(lines[idx])) {
        idx++;
      }
      
      if (idx >= lines.length) {
        throw new Error(ERROR_MESSAGES.NO_COLUMN_HEADER);
      }
      idx++;

      // Parse data
      const plate = this.initializePlate();
      
      for (const row of CONSTANTS.ROWS) {
        let got = 0;
        while (got < CONSTANTS.SPOTS && idx < lines.length) {
          const raw = lines[idx].replace(/[^\d\.\-\s]/g, " ");
          const parts = raw.trim().split(/\s+/);
          
          // Remove row letter if present
          if (parts.length && /^[A-H]$/i.test(parts[0])) {
            parts.shift();
          }
          
          const nums = parts.map(Number).filter(v => !Number.isNaN(v));
          
          if (nums.length >= 12) {
            for (let ci = 0; ci < 12; ci++) {
              plate[row][ci + 1][got] = nums[ci];
            }
            got++;
          }
          idx++;
        }
      }

      this.plate = plate;
      showNotification(ERROR_MESSAGES.DATA_PARSED, 'success');
      return plate;
      
    } catch (error) {
      showNotification(error.message, 'error');
      throw error;
    }
  }

  /**
   * Generate demo data
   */
  generateDemoData() {
    for (let ri = 0; ri < CONSTANTS.ROWS.length; ri++) {
      for (let ci = 1; ci <= 12; ci++) {
        for (let s = 0; s < CONSTANTS.SPOTS; s++) {
          const baseValue = 1000 + 50 * ri + 30 * ci + 5 * s;
          const noise = (Math.random() * 40 - 20);
          this.plate[CONSTANTS.ROWS[ri]][ci][s] = Math.round(baseValue + noise);
        }
      }
    }
    showNotification('Demo data generated', 'success');
  }

  /**
   * Get group color
   */
  getGroupColor(name) {
    if (!this.groupColors[name]) {
      this.groupColors[name] = CONSTANTS.GROUP_PALETTE[
        this.groupColorOrder % CONSTANTS.GROUP_PALETTE.length
      ];
      this.groupColorOrder++;
    }
    return this.groupColors[name];
  }

  /**
   * Set well role
   */
  setWellRole(wellKey, role, group = null, level = null, ctrl = null) {
    const roleData = { role };
    
    if (group) {
      roleData.group = group;
      roleData.color = this.getGroupColor(group);
    }
    if (level) roleData.level = level;
    if (ctrl) roleData.ctrl = ctrl;
    
    this.wellRoles[wellKey] = roleData;
  }

  /**
   * Get well role
   */
  getWellRole(wellKey) {
    return this.wellRoles[wellKey];
  }

  /**
   * Clear well role
   */
  clearWellRole(wellKey) {
    delete this.wellRoles[wellKey];
  }

  /**
   * Set well metadata
   */
  setWellMeta(wellKey, meta) {
    this.wellMeta[wellKey] = { ...this.wellMeta[wellKey], ...meta };
  }

  /**
   * Get well metadata
   */
  getWellMeta(wellKey) {
    return this.wellMeta[wellKey];
  }

  /**
   * Apply standards layout
   */
  applyStandardsLayout(startWell, orientation, levels, series, spacing) {
    const parsed = parseWell(startWell);
    if (!parsed) {
      throw new Error(ERROR_MESSAGES.INVALID_START_WELL);
    }

    const { row, col } = parsed;
    let r = CONSTANTS.ROWS.indexOf(row);
    let c = col;

    if (r < 0 || !Number.isFinite(c) || c < 1 || c > 12) {
      throw new Error(ERROR_MESSAGES.INVALID_START_WELL);
    }

    // Clear previous standard roles
    Object.keys(this.wellRoles).forEach(key => {
      if (this.wellRoles[key]?.role === "Std") {
        delete this.wellRoles[key];
      }
    });

    // Apply standards
    for (let sIdx = 0; sIdx < series; sIdx++) {
      let rr = r, cc = c;
      
      for (let i = 0; i < levels; i++) {
        const k = getWellKey(CONSTANTS.ROWS[rr], cc);
        this.setWellRole(k, "Std", null, CONSTANTS.LEVEL_NAMES[i] || `Std${i + 1}`);
        
        // Move to next well based on orientation
        switch (orientation) {
          case "down": rr = Math.min(CONSTANTS.ROWS.length - 1, rr + 1); break;
          case "up": rr = Math.max(0, rr - 1); break;
          case "right": cc = Math.min(12, cc + 1); break;
          case "left": cc = Math.max(1, cc - 1); break;
        }
      }
      
      // Advance to next series
      if (orientation === "down" || orientation === "up") {
        c = Math.min(12, c + spacing);
      } else {
        r = Math.min(CONSTANTS.ROWS.length - 1, r + spacing);
      }
      rr = r;
      cc = c;
    }
  }

  /**
   * Apply unknown defaults layout
   */
  applyUnknownDefaults(groupSpecs, rowStart, rowEnd, topConc, dilution, replicates) {
    const r0 = CONSTANTS.ROWS.indexOf(rowStart);
    const r1 = CONSTANTS.ROWS.indexOf(rowEnd);
    
    if (r0 < 0 || r1 < 0 || r0 > r1) {
      throw new Error(ERROR_MESSAGES.INVALID_ROW_RANGE);
    }

    groupSpecs.forEach(({ name, spec }) => {
      const cols = this.parseColumnSpec(spec);
      const colPairs = [];
      
      // Group columns by replicate width
      for (let i = 0; i < cols.length; i += replicates) {
        const subset = cols.slice(i, i + replicates);
        colPairs.push(subset);
      }
      
      colPairs.forEach(subset => {
        for (let ri = r0; ri <= r1; ri++) {
          const conc = topConc / Math.pow(dilution, (ri - r0));
          subset.forEach(c => {
            const key = getWellKey(CONSTANTS.ROWS[ri], c);
            this.setWellRole(key, "Unk", name);
            this.setWellMeta(key, { concentration: conc });
          });
        }
      });
    });
  }

  /**
   * Parse column specification (helper method)
   */
  parseColumnSpec(spec) {
    const parts = (spec || "").split(",").map(s => s.trim()).filter(Boolean);
    const out = new Set();
    
    for (const part of parts) {
      if (part.includes("-")) {
        const [a, b] = part.split("-").map(x => parseInt(x, 10));
        if (Number.isFinite(a) && Number.isFinite(b)) {
          const lo = Math.min(a, b);
          const hi = Math.max(a, b);
          for (let i = lo; i <= hi; i++) {
            if (i >= 1 && i <= 12) out.add(i);
          }
        }
      } else {
        const v = parseInt(part, 10);
        if (Number.isFinite(v) && v >= 1 && v <= 12) out.add(v);
      }
    }
    
    return Array.from(out).sort((a, b) => a - b);
  }

  /**
   * Selection management
   */
  selectWell(wellKey) {
    this.selectedWells.add(wellKey);
  }

  deselectWell(wellKey) {
    this.selectedWells.delete(wellKey);
  }

  toggleWellSelection(wellKey) {
    if (this.selectedWells.has(wellKey)) {
      this.deselectWell(wellKey);
    } else {
      this.selectWell(wellKey);
    }
  }

  clearSelection() {
    this.selectedWells.clear();
  }

  selectWells(wellKeys) {
    wellKeys.forEach(key => this.selectWell(key));
  }

  getSelectedWells() {
    return Array.from(this.selectedWells);
  }

  /**
   * Get wells by role
   */
  getWellsByRole(role) {
    const wells = [];
    for (const row of CONSTANTS.ROWS) {
      for (const col of CONSTANTS.COLS) {
        const key = getWellKey(row, col);
        const wellRole = this.getWellRole(key);
        if (wellRole && wellRole.role === role) {
          wells.push({ row, col, key, role: wellRole });
        }
      }
    }
    return wells;
  }

  /**
   * Export plate data
   */
  exportPlateData() {
    return {
      plate: this.plate,
      wellRoles: this.wellRoles,
      wellMeta: this.wellMeta,
      groupColors: this.groupColors,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Import plate data
   */
  importPlateData(data) {
    if (data.plate) this.plate = data.plate;
    if (data.wellRoles) this.wellRoles = data.wellRoles;
    if (data.wellMeta) this.wellMeta = data.wellMeta;
    if (data.groupColors) this.groupColors = data.groupColors;
  }

  /**
   * Clear all data
   */
  clearAllData() {
    this.plate = this.initializePlate();
    this.wellRoles = {};
    this.wellMeta = {};
    this.groupColors = {};
    this.groupColorOrder = 0;
    this.selectedWells.clear();
  }
}
