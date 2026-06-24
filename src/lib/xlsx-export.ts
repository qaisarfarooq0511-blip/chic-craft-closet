import * as XLSX from "xlsx";

export function exportRowsToXlsx(rows: Record<string, unknown>[], sheetName: string, fileName: string) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31) || "Sheet1");
  const stamp = new Date().toISOString().slice(0, 10);
  const finalName = fileName.endsWith(".xlsx") ? fileName : `${fileName}-${stamp}.xlsx`;
  XLSX.writeFile(wb, finalName);
}
