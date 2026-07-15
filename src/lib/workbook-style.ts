import ExcelJS from "exceljs";

export const WORKBOOK_COLORS = {
  red: "EA0029",
  dark: "171717",
  gray: "64748B",
  line: "D8D8D8",
  panel: "F8FAFC",
  green: "14835F",
  greenSoft: "DCFCE7",
  amber: "A16207",
  amberSoft: "FEF3C7",
  blue: "176FC1",
  blueSoft: "DBEAFE",
  rose: "D32236",
  roseSoft: "FFE4E6",
  white: "FFFFFF"
};

export type WorkbookColumnDefinition = { header: string; key: string; width: number };

export function setupWorkbook(title: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "PROpEx | Proboca";
  workbook.company = "Proboca";
  workbook.subject = title;
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.calcProperties.fullCalcOnLoad = true;
  return workbook;
}

function titleRows(sheet: ExcelJS.Worksheet, title: string, subtitle: string, lastColumn: number) {
  sheet.mergeCells(1, 1, 1, lastColumn);
  sheet.mergeCells(2, 1, 2, lastColumn);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { bold: true, color: { argb: WORKBOOK_COLORS.white }, size: 18 };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: WORKBOOK_COLORS.red } };
  titleCell.alignment = { vertical: "middle", horizontal: "left" };
  sheet.getRow(1).height = 34;
  const subtitleCell = sheet.getCell(2, 1);
  subtitleCell.value = subtitle;
  subtitleCell.font = { color: { argb: WORKBOOK_COLORS.gray }, italic: true, size: 10 };
  subtitleCell.alignment = { vertical: "middle" };
  sheet.getRow(2).height = 24;
}

export function createDataSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  title: string,
  subtitle: string,
  columns: WorkbookColumnDefinition[]
) {
  const sheet = workbook.addWorksheet(name, { properties: { defaultRowHeight: 20 } });
  sheet.columns = columns.map((column) => ({ key: column.key, width: column.width }));
  titleRows(sheet, title, subtitle, columns.length);
  columns.forEach((column, index) => {
    const cell = sheet.getCell(4, index + 1);
    cell.value = column.header;
    cell.font = { bold: true, color: { argb: WORKBOOK_COLORS.white }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: WORKBOOK_COLORS.dark } };
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    cell.border = { bottom: { style: "medium", color: { argb: WORKBOOK_COLORS.red } } };
  });
  sheet.getRow(4).height = 30;
  sheet.views = [{ state: "frozen", ySplit: 4, showGridLines: false, zoomScale: 90 }];
  sheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: columns.length } };
  sheet.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: 9,
    margins: { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 }
  };
  sheet.headerFooter.oddFooter = "&LPROpEx | Proboca&C&P de &N&RGenerado &D";
  return sheet;
}

function statusFill(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes("asisti")) return WORKBOOK_COLORS.greenSoft;
  if (normalized.includes("ausente")) return WORKBOOK_COLORS.roseSoft;
  if (normalized.includes("complet") || normalized.includes("cerrad") || normalized.includes("aprobad")) return WORKBOOK_COLORS.greenSoft;
  if (normalized.includes("bloque") || normalized.includes("vencid") || normalized.includes("cancel") || normalized.includes("rechaz")) return WORKBOOK_COLORS.roseSoft;
  if (normalized.includes("curso") || normalized.includes("proceso") || normalized.includes("planific") || normalized.includes("implement")) return WORKBOOK_COLORS.blueSoft;
  return WORKBOOK_COLORS.amberSoft;
}

export function finalizeDataSheet(sheet: ExcelJS.Worksheet, statusKeys: string[] = []) {
  for (let rowIndex = 5; rowIndex <= sheet.rowCount; rowIndex += 1) {
    const row = sheet.getRow(rowIndex);
    row.height = 34;
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.alignment = { vertical: "top", wrapText: true };
      cell.border = { bottom: { style: "hair", color: { argb: WORKBOOK_COLORS.line } } };
      if (rowIndex % 2 === 0) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: WORKBOOK_COLORS.panel } };
    });
  }
  statusKeys.forEach((key) => {
    const column = sheet.getColumn(key);
    for (let rowIndex = 5; rowIndex <= sheet.rowCount; rowIndex += 1) {
      const cell = sheet.getCell(rowIndex, column.number);
      const value = String(cell.value ?? "");
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: statusFill(value) } };
      cell.font = { bold: true, color: { argb: WORKBOOK_COLORS.dark } };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    }
  });
}

export function addSummaryMetric(
  sheet: ExcelJS.Worksheet,
  columnStart: number,
  rowStart: number,
  label: string,
  value: string | number,
  tone: string
) {
  sheet.mergeCells(rowStart, columnStart, rowStart, columnStart + 1);
  sheet.mergeCells(rowStart + 1, columnStart, rowStart + 2, columnStart + 1);
  const labelCell = sheet.getCell(rowStart, columnStart);
  labelCell.value = label;
  labelCell.font = { bold: true, color: { argb: WORKBOOK_COLORS.gray }, size: 9 };
  labelCell.alignment = { vertical: "middle", horizontal: "center" };
  labelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: WORKBOOK_COLORS.panel } };
  const valueCell = sheet.getCell(rowStart + 1, columnStart);
  valueCell.value = value;
  valueCell.font = { bold: true, color: { argb: WORKBOOK_COLORS.dark }, size: 19 };
  valueCell.alignment = { vertical: "middle", horizontal: "center" };
  valueCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: tone } };
  for (let row = rowStart; row <= rowStart + 2; row += 1) {
    for (let column = columnStart; column <= columnStart + 1; column += 1) {
      sheet.getCell(row, column).border = {
        top: { style: "thin", color: { argb: WORKBOOK_COLORS.line } },
        left: { style: "thin", color: { argb: WORKBOOK_COLORS.line } },
        bottom: { style: "thin", color: { argb: WORKBOOK_COLORS.line } },
        right: { style: "thin", color: { argb: WORKBOOK_COLORS.line } }
      };
    }
  }
}

export function createSummarySheet(workbook: ExcelJS.Workbook, title: string, subtitle: string) {
  const sheet = workbook.addWorksheet("Resumen", { properties: { defaultRowHeight: 22 } });
  sheet.columns = Array.from({ length: 8 }, () => ({ width: 16 }));
  titleRows(sheet, title, subtitle, 8);
  sheet.views = [{ showGridLines: false, zoomScale: 95 }];
  sheet.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 1 };
  return sheet;
}
