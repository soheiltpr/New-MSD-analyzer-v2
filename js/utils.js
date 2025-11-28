/**
 * Utility functions for MSD Plate Analyzer
 */

import { CONSTANTS } from './constants.js';

/**
 * Clamp a value between min and max
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation between two values
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Format a number for display
 */
export function formatNumber(value) {
  if (!Number.isFinite(value)) return "–";
  if (Math.abs(value) >= 1000) return Math.round(value).toLocaleString();
  return Math.round(value).toString();
}

/**
 * Calculate luminance for color contrast
 */
export function calculateLuminance(r, g, b) {
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

/**
 * Get color for a value based on palette and range
 */
export function getColorForValue(value, vmin, vmax, palette) {
  if (!isFinite(value)) return "transparent";
  if (vmin === vmax) {
    const c = palette[palette.length - 1];
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  }
  
  const t = clamp((value - vmin) / (vmax - vmin), 0, 1);
  const idx = t * (palette.length - 1);
  const i0 = Math.floor(idx);
  const i1 = Math.min(palette.length - 1, i0 + 1);
  const f = idx - i0;
  
  const c0 = palette[i0];
  const c1 = palette[i1];
  
  const r = Math.round(lerp(c0[0], c1[0], f));
  const g = Math.round(lerp(c0[1], c1[1], f));
  const b = Math.round(lerp(c0[2], c1[2], f));
  
  return `rgb(${r},${g},${b})`;
}

/**
 * Generate well key from row and column
 */
export function getWellKey(row, col) {
  return `${row}${col}`;
}

/**
 * Parse column specification string (e.g., "1,3-5,12")
 */
export function parseColumnSpec(spec) {
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
 * Calculate basic statistics for an array of values
 */
export function calculateStats(values) {
  const arr = values.filter(v => Number.isFinite(v)).sort((a, b) => a - b);
  if (!arr.length) {
    return { min: NaN, max: NaN, mean: NaN, median: NaN, n: 0 };
  }
  
  const min = arr[0];
  const max = arr[arr.length - 1];
  const mean = arr.reduce((sum, v) => sum + v, 0) / arr.length;
  const median = arr.length % 2 
    ? arr[(arr.length - 1) / 2]
    : (arr[arr.length / 2 - 1] + arr[arr.length / 2]) / 2;
  
  return { min, max, mean, median, n: arr.length };
}

/**
 * Get row index from letter
 */
export function getRowIndex(letter) {
  return CONSTANTS.ROWS.indexOf(String(letter || "").toUpperCase());
}

/**
 * Validate well format (e.g., "A1")
 */
export function validateWellFormat(well) {
  const match = String(well).match(/^([A-H])(\d{1,2})$/i);
  if (!match) return false;
  
  const row = match[1].toUpperCase();
  const col = parseInt(match[2], 10);
  
  return CONSTANTS.ROWS.includes(row) && col >= 1 && col <= 12;
}

/**
 * Parse well string to row and column
 */
export function parseWell(well) {
  const match = String(well).match(/^([A-H])(\d{1,2})$/i);
  if (!match) return null;
  
  return {
    row: match[1].toUpperCase(),
    col: parseInt(match[2], 10)
  };
}

/**
 * Debounce function to limit function calls
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function to limit function calls
 */
export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Show loading indicator
 */
export function showLoading() {
  const indicator = document.getElementById('loadingIndicator');
  if (indicator) {
    indicator.style.display = 'flex';
  }
}

/**
 * Hide loading indicator
 */
export function hideLoading() {
  const indicator = document.getElementById('loadingIndicator');
  if (indicator) {
    indicator.style.display = 'none';
  }
}

/**
 * Show notification message
 */
export function showNotification(message, type = 'info', duration = 3000) {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  
  // Style the notification
  Object.assign(notification.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '12px 16px',
    borderRadius: '8px',
    color: '#fff',
    fontWeight: '500',
    zIndex: '10001',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    transform: 'translateX(100%)',
    transition: 'transform 0.3s ease'
  });
  
  // Set background color based on type
  const colors = {
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6'
  };
  notification.style.backgroundColor = colors[type] || colors.info;
  
  // Add to DOM
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, 10);
  
  // Remove after duration
  setTimeout(() => {
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, duration);
}

/**
 * Download data as file
 */
export function downloadFile(data, filename, type = 'text/plain') {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Deep clone an object
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
}

/**
 * Check if two arrays are equal
 */
export function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  return a.every((val, i) => val === b[i]);
}

/**
 * Generate unique ID
 */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
