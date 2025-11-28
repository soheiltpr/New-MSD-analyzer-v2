/**
 * Extract validation data from Excel file "E3 P4 and E3 P6.xlsx"
 * Extracts standards data including column H (Calc. Concentration)
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const excelFile = path.join(__dirname, 'E3 P4 and E3 P6.xlsx');
const workbook = XLSX.readFile(excelFile);

const assays = [
  "GM-CSF", "IFN-γ", "IL-10", "IL-1β",
  "IL-2", "IL-4", "IL-5", "IL-6", "MCP-1", "TNF-α"
];

/**
 * Parse standards rows from sheet data
 */
function parseStandards(data, assayName) {
  const standards = [];
  
  // Find the "Standards: <Assay>" row
  let startRow = -1;
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (row && row[0] && typeof row[0] === 'string') {
      if (row[0].includes('Standards:') && row[0].includes(assayName)) {
        startRow = i;
        break;
      }
    }
  }
  
  if (startRow < 0) {
    return standards;
  }
  
  // Next row should be header
  const headerRow = startRow + 1;
  if (headerRow >= data.length) {
    return standards;
  }
  
  // Column indices (0-based)
  // A: Sample (0), B: Well (1), C: Concentration (2), D: Signal (3), 
  // E: Mean (4), H: Calc. Concentration (7)
  const colIndices = {
    sample: 0,
    well: 1,
    concentration: 2,
    signal: 3,
    mean: 4,
    calcConc: 7
  };
  
  // Parse data rows starting from row after header
  for (let i = headerRow + 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;
    
    // Check if we've hit the next "Standards:" section
    if (row[0] && typeof row[0] === 'string' && row[0].includes('Standards:')) {
      break; // Next assay section
    }
    
    const sample = row[colIndices.sample];
    if (!sample || typeof sample !== 'string' || !sample.startsWith('S00')) {
      continue; // Not a standard row
    }
    
    const well = row[colIndices.well];
    const concentration = row[colIndices.concentration];
    const signal = row[colIndices.signal];
    const mean = row[colIndices.mean];
    const calcConc = row[colIndices.calcConc];
    
    // Convert values
    const standard = {
      sample: String(sample).trim(),
      well: well ? String(well).trim() : '',
      concentration: (concentration !== null && concentration !== undefined && concentration !== '') 
        ? (typeof concentration === 'number' ? concentration : parseFloat(concentration)) 
        : null,
      signal: (signal !== null && signal !== undefined && signal !== '') 
        ? (typeof signal === 'number' ? signal : parseFloat(signal)) 
        : null,
      mean: (mean !== null && mean !== undefined && mean !== '') 
        ? (typeof mean === 'number' ? mean : parseFloat(mean)) 
        : null,
      originalCalculatedConcentration: (calcConc !== null && calcConc !== undefined && calcConc !== '' && calcConc !== 'NaN') 
        ? (typeof calcConc === 'number' ? calcConc : parseFloat(calcConc)) 
        : null
    };
    
    standards.push(standard);
  }
  
  return standards;
}

/**
 * Process a sheet
 */
function processSheet(sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    console.warn(`Sheet ${sheetName} not found`);
    return {};
  }
  
  // Convert to array of arrays
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
  
  const result = {};
  
  for (const assay of assays) {
    const standards = parseStandards(data, assay);
    result[assay] = standards;
    console.log(`  ${assay}: ${standards.length} standards found`);
  }
  
  return result;
}

console.log('Extracting validation data from Excel file...\n');

const validationData = {
  E3_P4: {},
  E3_P6: {}
};

// Process E3 P4 sheet
console.log('Processing sheet "E3 P4"...');
const e3p4Sheet = workbook.SheetNames.find(name => name.includes('E3') && name.includes('P4'));
if (e3p4Sheet) {
  validationData.E3_P4 = processSheet(e3p4Sheet);
} else {
  console.warn('Sheet "E3 P4" not found');
}

console.log('\nProcessing sheet "E3 P6"...');
const e3p6Sheet = workbook.SheetNames.find(name => name.includes('E3') && name.includes('P6'));
if (e3p6Sheet) {
  validationData.E3_P6 = processSheet(e3p6Sheet);
} else {
  console.warn('Sheet "E3 P6" not found');
}

// Generate JavaScript file
const outputFile = path.join(__dirname, 'js', 'msd-validation-data.js');

const fileContent = `/**
 * MSD Validation Data - Extracted from "E3 P4 and E3 P6.xlsx"
 * Contains standards data with original calculated concentrations (column H)
 * 
 * Generated automatically from Excel file.
 * DO NOT EDIT MANUALLY - regenerate using extract_validation_data.js
 */

export const MSD_VALIDATION_DATA = ${JSON.stringify(validationData, null, 2)};

`;

fs.writeFileSync(outputFile, fileContent, 'utf8');

console.log(`\n✅ Validation data extracted and saved to ${outputFile}`);
console.log(`\nSummary:`);
console.log(`  E3_P4: ${Object.keys(validationData.E3_P4).length} assays`);
console.log(`  E3_P6: ${Object.keys(validationData.E3_P6).length} assays`);

// Print sample data
console.log('\nSample data (E3_P4 GM-CSF first 3 rows):');
if (validationData.E3_P4['GM-CSF'] && validationData.E3_P4['GM-CSF'].length > 0) {
  console.log(JSON.stringify(validationData.E3_P4['GM-CSF'].slice(0, 3), null, 2));
}
