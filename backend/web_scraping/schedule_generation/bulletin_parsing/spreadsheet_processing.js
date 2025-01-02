import Excel from "exceljs";

async function main() {
  const wb = new Excel.Workbook();
  await wb.xlsx.readFile("SCU_Find_Course_Sections.xlsx");
  const sheet = wb.getWorksheet("SCU Find Course Sections");
  const rows = sheet.getSheetValues();
  for (let i = 0; i < 30; i++) {
    console.log(rows[i]);
  }
  await wb.csv.writeFile("SCU_Find_Course_Sections.csv");
}
