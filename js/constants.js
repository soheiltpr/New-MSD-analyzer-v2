/**
 * Constants and configuration for MSD Plate Analyzer
 */

export const CONSTANTS = {
  ROWS: ["A", "B", "C", "D", "E", "F", "G", "H"],
  COLS: Array.from({ length: 12 }, (_, i) => i + 1),
  SPOTS: 10,
  DEFAULT_MAPPING: [
    "GM-CSF", "IFN-γ", "IL-1β", "IL-2", "IL-4", 
    "IL-5", "IL-6", "IL-10", "MCP-1", "TNF-α"
  ],
  
  PALETTES: {
    "Sky": [
      [248, 250, 252], [224, 242, 254], [186, 230, 253], [125, 211, 252],
      [56, 189, 248], [14, 165, 233], [2, 132, 199], [7, 89, 133]
    ],
    "Viridis-ish": [
      [253, 231, 37], [94, 201, 98], [34, 167, 132], [37, 133, 167], [68, 1, 84]
    ],
    "Magma-ish": [
      [252, 253, 191], [254, 196, 79], [252, 78, 42], [194, 0, 78], [84, 0, 61], [0, 0, 0]
    ],
    "Gray": [
      [250, 250, 250], [230, 230, 230], [200, 200, 200], 
      [160, 160, 160], [120, 120, 120], [80, 80, 80]
    ]
  },
  
  GROUP_PALETTE: [
    "#2563eb", "#16a34a", "#e11d48", "#a855f7", "#f59e0b", 
    "#0891b2", "#7c3aed", "#dc2626", "#059669", "#0ea5e9", 
    "#d946ef", "#ef4444", "#10b981", "#f97316"
  ],
  
  LEVEL_NAMES: ["Std1", "Std2", "Std3", "Std4", "Std5", "Std6", "Std7", "Std8"],
  POS_TYPES: ["Pos A", "Pos B"],
  NEG_TYPES: ["Neg A", "Neg B"],
  
  // Analysis parameters
  FIT_PARAMS: {
    MAX_ITERATIONS: 10000,
    LEARNING_RATE: 5e-4,
    BETA1: 0.9,
    BETA2: 0.999,
    EPSILON: 1e-8,
    CONVERGENCE_THRESHOLD: 1e-10
  },
  
  // UI constants
  MIN_FONT_SIZE: 10,
  MAX_FONT_SIZE: 28,
  DEFAULT_FONT_SIZE: 16,
  
  // Validation
  VALIDATION: {
    MIN_STANDARDS: 2,
    MAX_STANDARDS: 12,
    MIN_LEVELS: 2,
    MAX_LEVELS: 12,
    MIN_SERIES: 1,
    MAX_SERIES: 6,
    MIN_SPACING: 1,
    MAX_SPACING: 6,
    MIN_REPLICATES: 1,
    MAX_REPLICATES: 3
  }
};

export const ERROR_MESSAGES = {
  INVALID_START_WELL: "Invalid start well. Please use format like 'A1'.",
  INVALID_ROW_RANGE: "Invalid row range. Please check your row inputs.",
  INSUFFICIENT_STANDARDS: "Need at least 2 standard points for analysis.",
  INVALID_4PL_PARAMS: "Please enter valid 4PL parameters (b1, b2, b3, b4).",
  PARSE_ERROR: "Error parsing MSD data. Please check the format.",
  NO_DATA_SECTION: "Could not find '==========Data' section in the file.",
  NO_COLUMN_HEADER: "Column header (1..12) not found in the data.",
  ANALYSIS_FAILED: "Analysis failed. Please check your data and settings.",
  MONOTONIC_VIOLATION: "Monotonic relationship violated - check curve orientation.",
  OUT_OF_RANGE: "Sample signal is outside standard curve range.",
  CURVE_ORIENTATION_UNKNOWN: "Could not determine curve orientation (increasing/decreasing)."
};

export const SUCCESS_MESSAGES = {
  DATA_LOADED: "Data loaded successfully",
  ANALYSIS_COMPLETE: "Analysis complete",
  DATA_PARSED: "Data parsed successfully",
  DEMO_LOADED: "Demo data loaded"
};
