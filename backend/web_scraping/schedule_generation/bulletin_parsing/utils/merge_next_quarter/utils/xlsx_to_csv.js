import { parse } from "node-xlsx";
import { nextQuarterOfferings } from "../index.js";

export function parseCourseSectionsXlsx(sourceFile) {
  var obj = parse(sourceFile);
  var rows = [];

  for (var i = 0; i < obj.length; i++) {
    var sheet = obj[i];
    for (var j = 0; j < sheet["data"].length; j++) {
      rows.push(sheet["data"][j]);
    }
  }

  const courseSectionIndex = rows[0].findIndex(
    (col) => col.trim() === "Course Section",
  );
  const profNameIndex = rows[0].findIndex(
    (col) => col.trim() === "All Instructors",
  );
  const meetingPatternsIndex = rows[0].findIndex(
    (col) => col.trim() === "Meeting Patterns",
  );
  const locationsIndex = rows[0].findIndex(
    (col) => col.trim() === "Locations",
  );
  const courseTagsIndex = rows[0].findIndex(
    (col) => col.trim() === "Course Tags",
  );
  const instructionalFormatIndex = rows[0].findIndex(
    (col) => col.trim() === "Instructional Format",
  );
  const deliveryModeIndex = rows[0].findIndex(
    (col) => col.trim() === "Delivery Mode",
  );
  if (courseSectionIndex === -1)
    console.error("No course section column found.");
  if (profNameIndex === -1)
    console.error("No professor name column found.");

  for (const row of rows.slice(1)) {
    const courseCode = row[courseSectionIndex].match(/(.*?)-/)?.[1]?.replace(/\s+/g, "");
    if (!courseCode) {
      console.error(`Course code not found for column: ${row[courseSectionIndex]}`);
      continue;
    }
    const nextQuarterOffering = {
      sectionName: row[courseSectionIndex],
      professors: row[profNameIndex],
      meetingPattern: row[meetingPatternsIndex],
      location: row[locationsIndex],
      courseTags: row[courseTagsIndex],
      instructionalFormat: row[instructionalFormatIndex],
      deliveryMode: row[deliveryModeIndex],
    }

    nextQuarterOfferings[courseCode] = (nextQuarterOfferings[courseCode] || []).concat(nextQuarterOffering);
  }
}
