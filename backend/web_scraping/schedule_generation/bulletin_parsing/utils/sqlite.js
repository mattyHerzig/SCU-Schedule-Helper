import sqlite from "node:sqlite";
import fs from "fs";

const aggregateCourseEvalsFile = "./local_data/aggregate_evals.json";
const aggregateCourseEvals = JSON.parse(
  fs.readFileSync(aggregateCourseEvalsFile, "utf-8")
);

async function makeSQLiteDB(catalogJsonFilename) {
  const catalog = JSON.parse(
    fs.readFileSync(`./local_data/${catalogJsonFilename}`, "utf-8")
  );
  const db = new sqlite.DatabaseSync("./local_data/university_catalog.db");
  db.exec(
    "CREATE TABLE IF NOT EXISTS schools (name TEXT, description TEXT, courseRequirementsExpression TEXT, unitRequirements TEXT, otherRequirements TEXT);"
  );
  // majors and minors are foreign keys to deptsAndPrograms
  db.exec(
    "CREATE TABLE IF NOT EXISTS deptsAndPrograms (name TEXT, description TEXT, majors TEXT, minors TEXT, emphases TEXT);"
  );
  db.exec(
    "CREATE TABLE IF NOT EXISTS majors (name TEXT, description TEXT, deptCode TEXT, requiresEmphasis INTEGER, courseRequirementsExpression TEXT, unitRequirements TEXT, otherRequirements TEXT, otherNotes TEXT);"
  );
  db.exec(
    "CREATE TABLE IF NOT EXISTS minors (name TEXT, description TEXT, deptCode TEXT, requiresEmphasis INTEGER, courseRequirementsExpression TEXT, unitRequirements TEXT, otherRequirements TEXT, otherNotes TEXT);"
  );
  db.exec(
    "CREATE TABLE IF NOT EXISTS emphases (name TEXT, description TEXT, appliesTo TEXT, nameOfWhichItAppliesTo TEXT, deptCode TEXT, courseRequirementsExpression TEXT, unitRequirements TEXT, otherRequirements TEXT, otherNotes TEXT);"
  );
  db.exec(
    "CREATE TABLE IF NOT EXISTS specialPrograms (name TEXT, description TEXT, courseRequirementsExpression TEXT, unitRequirements TEXT, otherRequirements TEXT);"
  );
  db.exec(
    "CREATE TABLE IF NOT EXISTS courses (courseCode TEXT, name TEXT, description TEXT, numUnits INTEGER, prerequisiteCourses TEXT, corequisiteCourses TEXT, otherRequirements TEXT, otherNotes TEXT, offeringSchedule TEXT, otherOfferingSchedule TEXT, historicalBestProfessors TEXT, historicalOfferingSeasons TEXT);"
  );

  for (const school of catalog.schools) {
    // console.log(school);
    db.prepare(
      "INSERT INTO schools (name, description, courseRequirementsExpression, unitRequirements, otherRequirements) VALUES (?, ?, ?, ?, ?);"
    ).run(
      school.name,
      school.description,
      school.courseRequirements || school.courseRequirementsExpression,
      JSON.stringify(school.unitRequirements),
      JSON.stringify(school.otherRequirements)
    );
  }
  for (const deptOrProgram of catalog.deptsAndPrograms) {
    db.prepare(
      "INSERT INTO deptsAndPrograms (name, description, majors, minors, emphases) VALUES (?, ?, ?, ?, ?);"
    ).run(
      deptOrProgram.name,
      deptOrProgram.description,
      deptOrProgram.majors.map((major) => major.name).join(", "),
      deptOrProgram.minors.map((minor) => minor.name).join(", "),
      deptOrProgram.emphases.map((emphasis) => emphasis.name).join(", ")
    );

    for (const major of deptOrProgram.majors) {
      db.prepare(
        "INSERT INTO majors (name, description, deptCode, requiresEmphasis, courseRequirementsExpression, unitRequirements, otherRequirements, otherNotes) VALUES (?, ?, ?, ?, ?, ?, ?, ?);"
      ).run(
        major.name,
        major.description,
        major.departmentCode,
        major.requiresEmphasis ? 1 : 0,
        major.courseRequirementsExpression,
        JSON.stringify(major.unitRequirements),
        JSON.stringify(major.otherRequirements),
        major.otherNotes.join("\n")
      );
    }
    for (const minor of deptOrProgram.minors) {
      db.prepare(
        "INSERT INTO minors (name, description, deptCode, requiresEmphasis, courseRequirementsExpression, unitRequirements, otherRequirements, otherNotes) VALUES (?, ?, ?, ?, ?, ?, ?, ?);"
      ).run(
        minor.name,
        minor.description,
        minor.departmentCode,
        minor.requiresEmphasis ? 1 : 0,
        minor.courseRequirements || minor.courseRequirementsExpression,
        JSON.stringify(minor.unitRequirements),
        JSON.stringify(minor.otherRequirements),
        minor.otherNotes.join("\n")
      );
    }
    for (const emphasis of deptOrProgram.emphases) {
      db.prepare(
        "INSERT INTO emphases (name, description, appliesTo, nameOfWhichItAppliesTo, deptCode, courseRequirementsExpression, unitRequirements, otherRequirements, otherNotes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);"
      ).run(
        emphasis.name,
        emphasis.description,
        emphasis.appliesTo,
        emphasis.nameOfWhichItAppliesTo,
        emphasis.departmentCode,
        emphasis.courseRequirements || emphasis.courseRequirementsExpression,
        JSON.stringify(emphasis.unitRequirements),
        JSON.stringify(emphasis.otherRequirements),
        emphasis.otherNotes.join("\n")
      );
    }
  }
  for (const specialProgram of catalog.specialPrograms) {
    db.prepare(
      "INSERT INTO specialPrograms (name, description, courseRequirementsExpression, unitRequirements, otherRequirements) VALUES (?, ?, ?, ?, ?);"
    ).run(
      specialProgram.name,
      specialProgram.description,
      specialProgram.courseRequirements ||
        specialProgram.courseRequirementsExpression,
      JSON.stringify(specialProgram.unitRequirements),
      JSON.stringify(specialProgram.otherRequirements)
    );
  }
  for (const course of catalog.courses) {
    db.prepare(
      "INSERT INTO courses (courseCode, name, description, numUnits, prerequisiteCourses, corequisiteCourses, otherRequirements, otherNotes, offeringSchedule, otherOfferingSchedule, historicalBestProfessors, historicalOfferingSeasons) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);"
    ).run(
      course.courseCode,
      course.name,
      course.description,
      course.numUnits,
      course.prerequisiteCourses,
      course.corequisiteCourses,
      JSON.stringify(course.otherRequirements),
      course.otherNotes,
      course.offeringSchedule,
      course.otherOfferingSchedule,
      getHistoricalBestProfessors(course.courseCode),
      getHistoricalOfferingSeasons(course.courseCode)
    );
  }
  db.close();
}

function getHistoricalBestProfessors(courseCode) {
  const courseEval = aggregateCourseEvals[courseCode];
  if (!courseEval) {
    console.error(`No course evaluations found for ${courseCode}`);
    return null;
  }
  const bestProfs = courseEval.professors
    .filter((professor) => {
      const professorEntry = aggregateCourseEvals[professor][courseCode];
      // Make sure professor has taught within last 2 years
      const lastTaughtQuarter = professorEntry.recentTerms[0];
      const lastSeasonTaught = lastTaughtQuarter.split(" ")[0];
      const lastYearTaught = parseInt(lastTaughtQuarter.split(" ")[1]);
      const lastMonthTaught =
        lastSeasonTaught === "Winter"
          ? 3
          : lastSeasonTaught === "Spring"
          ? 6
          : lastSeasonTaught === "Summer"
          ? 8
          : 12;

      const lastDateTaught = new Date(
        `${lastYearTaught}-${lastMonthTaught}-01`
      );
      const currentQuarterDate = new Date();
      const msPerDay = 86400000;
      const daysSinceLastTaught =
        (currentQuarterDate - lastDateTaught) / msPerDay;
      return daysSinceLastTaught <= 730; // 2 years in days
    })
    .sort((profA, profB) => {
      const profAEval = aggregateCourseEvals[profA][courseCode];
      const profBEval = aggregateCourseEvals[profB][courseCode];
      profAEval.qualityAvg = profAEval.qualityTotal / profAEval.qualityCount;
      profAEval.difficultyAvg =
        profAEval.difficultyTotal / profAEval.difficultyCount;
      profAEval.workloadAvg = profAEval.workloadTotal / profAEval.workloadCount;
      profBEval.qualityAvg = profBEval.qualityTotal / profBEval.qualityCount;
      profBEval.difficultyAvg =
        profBEval.difficultyTotal / profBEval.difficultyCount;
      profBEval.workloadAvg = profBEval.workloadTotal / profBEval.workloadCount;
      const scoreA =
        profAEval.qualityAvg +
        (5 - profAEval.difficultyAvg) +
        (15 - profAEval.workloadAvg);
      const scoreB =
        profBEval.qualityAvg +
        (5 - profBEval.difficultyAvg) +
        (15 - profBEval.workloadAvg);
      // Sort by score descending
      return scoreB - scoreA;
    });

  return bestProfs.join(", ");
}

function getHistoricalOfferingSeasons(courseCode) {
  const courseEval = aggregateCourseEvals[courseCode];
  if (!courseEval) {
    console.error(`No course evaluations found for ${courseCode}`);
    return null;
  }
  const offeringSeasons = {};
  for (const professor of courseEval.professors) {
    const professorEntry = aggregateCourseEvals[professor][courseCode];
    for (const term of professorEntry.recentTerms) {
      const [season, year] = term.split(" ");
      offeringSeasons[season] = (offeringSeasons[season] || 0) + 1;
    }
  }
  return (
    "Offered " +
    Object.entries(offeringSeasons)
      .map(([season, count]) => `${count} times during ${season}`)
      .join(", ") +
    "."
  );
}

makeSQLiteDB("full_university_catalog.json");
