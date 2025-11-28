/**
 * MSD Model Validation
 * Validates that our 4PL implementation reproduces the original MSD calculated concentrations
 */

import { MSD_VALIDATION_DATA } from './msd-validation-data.js';

// =============================
// TYPE DEFINITIONS
// =============================

export type MsdTrainingExample = {
  sample: string;
  well: string;
  concentration: number | null;                   // Column C
  signal: number | null;                          // Column D
  mean: number | null;                            // Column E
  originalCalculatedConcentration: number | null; // Column H: Calc. Concentration
};

export type MsdValidationSheet = {
  [assayName: string]: MsdTrainingExample[];
};

export type MsdValidationData = {
  E3_P4: MsdValidationSheet;
  E3_P6: MsdValidationSheet;
};

export type FourPLParams = {
  top: number;      // Calc. Top
  bottom: number;   // Calc. Bottom
  midPoint: number; // Calc. MidPoint (EC50)
  hillSlope: number;// Calc. HillSlope
};

// =============================
// 4PL INVERSE (CORRECTED)
// =============================

/**
 * Inverse 4PL function for increasing curve
 * Forward: y = bottom + (top - bottom) / (1 + (EC50 / x)^hillSlope)
 * Inverse: x = EC50 / ((top - bottom) / (y - bottom) - 1)^(1 / hillSlope)
 * 
 * NOTE: Uses DIVISION, not multiplication!
 * 
 * @param {number} y - Signal value
 * @param {FourPLParams} params - 4PL parameters
 * @returns {number} - Calculated concentration
 */
export function fourPLInverse(
  y: number,
  { top, bottom, midPoint, hillSlope }: FourPLParams
): number {
  if (!isFinite(y) || !isFinite(top) || !isFinite(bottom) ||
      !isFinite(midPoint) || !isFinite(hillSlope)) {
    return NaN;
  }
  
  // Protect against bad ranges
  if (y <= bottom || y >= top) {
    return 0;
  }
  
  const ratio = (top - bottom) / (y - bottom) - 1;
  if (ratio <= 0) {
    return 0;
  }
  
  // CORRECT: Division, not multiplication
  return midPoint / Math.pow(ratio, 1 / hillSlope);
}

// =============================
// VALIDATION LOGIC
// =============================

/**
 * Validate that our current 4PL model reproduces the MSD "Calc. Concentration"
 * (column H) values with < 1% error for the standards.
 *
 * @param {MsdValidationData} data - Validation data
 * @param {keyof MsdValidationData} sheetKey - "E3_P4" or "E3_P6"
 * @param {string} assayName - Assay name (e.g., "GM-CSF", "IFN-γ", etc.)
 * @param {FourPLParams} params - 4PL parameters to validate
 * @returns {{passed: boolean, maxDiffPct: number, details: Array}} - Validation result
 */
export function validateMsdModel(
  data: MsdValidationData,
  sheetKey: keyof MsdValidationData,
  assayName: string,
  params: FourPLParams
): { passed: boolean; maxDiffPct: number; details: Array<{
  sample: string;
  well: string;
  signal: number;
  originalCalcConc: number;
  ourCalcConc: number;
  diffPct: number;
  passed: boolean;
}> } {
  const sheet = data[sheetKey];
  if (!sheet) {
    return { passed: false, maxDiffPct: Infinity, details: [] };
  }

  const examples = sheet[assayName] || [];
  let maxDiffPct = 0;
  const details = [];

  for (const ex of examples) {
    if (
      ex.signal == null ||
      ex.originalCalculatedConcentration == null ||
      ex.originalCalculatedConcentration === 0
    ) {
      continue;
    }

    const calcConc = fourPLInverse(ex.signal, params);
    if (!isFinite(calcConc)) continue;

    const diffPct =
      Math.abs(calcConc - ex.originalCalculatedConcentration) /
      ex.originalCalculatedConcentration *
      100;

    details.push({
      sample: ex.sample,
      well: ex.well,
      signal: ex.signal,
      originalCalcConc: ex.originalCalculatedConcentration,
      ourCalcConc: calcConc,
      diffPct: diffPct,
      passed: diffPct <= 1
    });

    if (diffPct > maxDiffPct) {
      maxDiffPct = diffPct;
    }
  }

  const passed = maxDiffPct <= 1;
  return { passed, maxDiffPct, details };
}

/**
 * Validate all assays for a given sheet
 * @param {MsdValidationData} data - Validation data
 * @param {keyof MsdValidationData} sheetKey - "E3_P4" or "E3_P6"
 * @param {Object} paramsMap - Map of assay names to their 4PL parameters
 * @returns {Object} - Validation results for all assays
 */
export function validateAllAssays(
  data: MsdValidationData,
  sheetKey: keyof MsdValidationData,
  paramsMap: { [assayName: string]: FourPLParams }
): { [assayName: string]: { passed: boolean; maxDiffPct: number } } {
  const results = {};
  
  for (const [assayName, params] of Object.entries(paramsMap)) {
    results[assayName] = validateMsdModel(data, sheetKey, assayName, params);
  }
  
  return results;
}

/**
 * Get 4PL parameters from training data format
 * Converts from MSD_TRAINING_DATA format to FourPLParams format
 */
export function getParamsFromTrainingData(trainingData: any): FourPLParams | null {
  if (!trainingData || !trainingData.params) {
    return null;
  }
  
  return {
    top: trainingData.params["Algorithm Parameter: Calc. Top"],
    bottom: trainingData.params["Algorithm Parameter: Calc. Bottom"],
    midPoint: trainingData.params["Algorithm Parameter: Calc. MidPoint"],
    hillSlope: trainingData.params["Algorithm Parameter: Calc. HillSlope"]
  };
}

// =============================
// EXCEL → VALIDATION DATA (Node.js only)
// =============================

/**
 * Load the MSD validation data for *all* cytokines and both sheets.
 * This function requires Node.js environment (uses xlsx library).
 * In browser, use the MSD_VALIDATION_DATA constant instead.
 *
 * excelPath should point to "E3 P4 and E3 P6.xlsx" within the project.
 */
export function loadMsdValidationData(excelPath: string): MsdValidationData {
  // Dynamic import for browser compatibility
  if (typeof window !== 'undefined') {
    // Browser environment - use the constant instead
    throw new Error("loadMsdValidationData requires Node.js environment. Use MSD_VALIDATION_DATA constant in browser.");
  }
  
  const XLSX = require('xlsx');
  const wb = XLSX.readFile(excelPath);

  const sheetNames = wb.SheetNames;
  if (!sheetNames.includes("E3 P4") || !sheetNames.includes("E3 P6")) {
    throw new Error('Expected sheets "E3 P4" and "E3 P6" in MSD workbook.');
  }

  function toNumberOrNull(value: any): number | null {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value === "string" && value.toLowerCase() === "nan") return null;
    const n = typeof value === "number" ? value : parseFloat(String(value));
    return isNaN(n) ? null : n;
  }

  type HeaderIndices = {
    sampleIdx: number;
    wellIdx: number;
    concIdx: number;
    signalIdx: number;
    meanIdx: number;
    calcConcIdx: number;
  };

  function getHeaderIndices(headerRow: any[]): HeaderIndices {
    const find = (label: string) =>
      headerRow.findIndex(
        c => typeof c === "string" && c.trim().toLowerCase() === label.toLowerCase()
      );

    const sampleIdx    = find("Sample");
    const wellIdx      = find("Well");
    const concIdx      = find("Concentration");
    const signalIdx    = find("Signal");
    const meanIdx      = find("Mean");
    const calcConcIdx  = find("Calc. Concentration");

    if (
      sampleIdx === -1 ||
      wellIdx === -1 ||
      concIdx === -1 ||
      signalIdx === -1 ||
      meanIdx === -1 ||
      calcConcIdx === -1
    ) {
      throw new Error("Could not locate all required header columns in MSD sheet.");
    }

    return { sampleIdx, wellIdx, concIdx, signalIdx, meanIdx, calcConcIdx };
  }

  function extractAssaysFromRows(rows: any[][]): MsdValidationSheet {
    const result: MsdValidationSheet = {};

    if (!rows.length) return result;

    // ----- GM-CSF block at the top -----
    const gmHeaderRow = rows[0];
    const gmHeaders   = getHeaderIndices(gmHeaderRow);
    let gmDataStart   = 1;

    const gmRows: number[] = [];
    for (let r = gmDataStart; r < rows.length; r++) {
      const cell = rows[r]?.[0];
      if (typeof cell === "string" && cell.startsWith("S")) {
        gmRows.push(r);
      } else {
        break;
      }
    }

    result["GM-CSF"] = gmRows.map(r => {
      const row = rows[r] || [];
      return {
        sample: String(row[gmHeaders.sampleIdx] ?? "").trim(),
        well: String(row[gmHeaders.wellIdx] ?? "").trim(),
        concentration: toNumberOrNull(row[gmHeaders.concIdx]),
        signal: toNumberOrNull(row[gmHeaders.signalIdx]),
        mean: toNumberOrNull(row[gmHeaders.meanIdx]),
        originalCalculatedConcentration: toNumberOrNull(row[gmHeaders.calcConcIdx]),
      };
    });

    // ----- Other assays: rows starting with "Standards: <Assay>" -----
    for (let i = 0; i < rows.length; i++) {
      const cell = rows[i]?.[0];
      if (
        typeof cell === "string" &&
        cell.startsWith("Standards:")
      ) {
        const assayName = cell.split("Standards:")[1].trim();
        if (!assayName || assayName === "GM-CSF") continue;

        const headerRow = rows[i + 1] || [];
        const headers   = getHeaderIndices(headerRow);

        const assayRows: number[] = [];
        for (let r = i + 2; r < rows.length; r++) {
          const c = rows[r]?.[0];
          if (typeof c === "string" && c.startsWith("S")) {
            assayRows.push(r);
          } else {
            // stop at first non-S row or next "Standards:" row
            if (typeof c === "string" && c.startsWith("Standards:")) {
              break;
            }
            break;
          }
        }

        result[assayName] = assayRows.map(r => {
          const row = rows[r] || [];
          return {
            sample: String(row[headers.sampleIdx] ?? "").trim(),
            well: String(row[headers.wellIdx] ?? "").trim(),
            concentration: toNumberOrNull(row[headers.concIdx]),
            signal: toNumberOrNull(row[headers.signalIdx]),
            mean: toNumberOrNull(row[headers.meanIdx]),
            originalCalculatedConcentration: toNumberOrNull(row[headers.calcConcIdx]),
          };
        });
      }
    }

    return result;
  }

  const parseSheet = (excelSheetName: string): MsdValidationSheet => {
    const ws = wb.Sheets[excelSheetName];
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      raw: true,
      defval: null,
    }) as any[][];
    return extractAssaysFromRows(rows);
  };

  const E3_P4 = parseSheet("E3 P4");
  const E3_P6 = parseSheet("E3 P6");

  return { E3_P4, E3_P6 };
}

