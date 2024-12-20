import { parse } from "node-xlsx";
import { professorNameMappings } from "../index.js";

export function parseCourseSectionsXlsx(sourceFile) {
  var obj = parse(sourceFile);
  var rows = [];

  for (var i = 0; i < obj.length; i++) {
    var sheet = obj[i];
    for (var j = 0; j < sheet["data"].length; j++) {
      rows.push(sheet["data"][j]);
    }
  }

  const profIndex = rows[0].findIndex(
    (col) => col.trim() === "All Instructors",
  );
  if (profIndex === -1) {
    console.error("Couldn't find professor name column");
  }
  for (const row of rows.slice(1)) {
    const profName = row[profIndex]?.trim() || "";
    const indexOfPipe = profName.indexOf("|");
    if (!profName.trim() || indexOfPipe === -1) continue;
    const realName = profName.substring(0, indexOfPipe).trim();
    professorNameMappings[realName] = profName;
  }
}
