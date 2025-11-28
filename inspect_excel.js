/**
 * Inspect Excel file structure to understand data layout
 */

const XLSX = require('xlsx');
const path = require('path');

const excelFile = path.join(__dirname, 'E3 P4 and E3 P6.xlsx');
const workbook = XLSX.readFile(excelFile);

console.log('Sheet names:', workbook.SheetNames);
console.log('\n' + '='.repeat(80));

for (const sheetName of workbook.SheetNames) {
  console.log(`\nSheet: ${sheetName}`);
  console.log('='.repeat(80));
  
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
  
  console.log(`Total rows: ${data.length}`);
  console.log('\nFirst 30 rows:');
  
  for (let i = 0; i < Math.min(30, data.length); i++) {
    const row = data[i];
    if (row && row.some(cell => cell !== null && cell !== '')) {
      console.log(`Row ${i}:`, row.slice(0, 10).map(cell => {
        if (cell === null || cell === '') return '--';
        if (typeof cell === 'string' && cell.length > 20) return cell.substring(0, 20) + '...';
        return String(cell);
      }));
    }
  }
  
  // Look for "Standards" or "Sample" keywords
  console.log('\nSearching for "Standards" or "Sample" keywords...');
  for (let i = 0; i < Math.min(100, data.length); i++) {
    const row = data[i];
    if (row && row[0]) {
      const firstCell = String(row[0]).toLowerCase();
      if (firstCell.includes('standard') || firstCell.includes('sample') || firstCell.startsWith('s00')) {
        console.log(`Row ${i}:`, row.slice(0, 10));
      }
    }
  }
  
  break; // Just inspect first sheet for now
}

