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
    "CREATE TABLE IF NOT EXISTS Schools (name TEXT, description TEXT, courseRequirementsExpression TEXT, unitRequirements TEXT, otherRequirements TEXT, otherNotes TEXT, src TEXT);"
  );
  db.exec(
    "CREATE TABLE IF NOT EXISTS DeptsAndPrograms (name TEXT, description TEXT, majors TEXT, minors TEXT, emphases TEXT, school TEXT, src TEXT);"
  );
  db.exec(
    "CREATE TABLE IF NOT EXISTS Majors (name TEXT, description TEXT, deptCode TEXT, requiresEmphasis INTEGER, courseRequirementsExpression TEXT, unitRequirements TEXT, otherRequirements TEXT, otherNotes TEXT, src TEXT);"
  );
  db.exec(
    "CREATE TABLE IF NOT EXISTS Minors (name TEXT, description TEXT, deptCode TEXT, requiresEmphasis INTEGER, courseRequirementsExpression TEXT, unitRequirements TEXT, otherRequirements TEXT, otherNotes TEXT, src TEXT);"
  );
  db.exec(
    "CREATE TABLE IF NOT EXISTS Emphases (name TEXT, description TEXT, appliesTo TEXT, nameOfWhichItAppliesTo TEXT, deptCode TEXT, courseRequirementsExpression TEXT, unitRequirements TEXT, otherRequirements TEXT, otherNotes TEXT, src TEXT);"
  );
  db.exec(
    "CREATE TABLE IF NOT EXISTS SpecialPrograms (name TEXT, description TEXT, courseRequirementsExpression TEXT, unitRequirements TEXT, otherRequirements TEXT, otherNotes TEXT, src TEXT);"
  );
  db.exec(
    "CREATE TABLE IF NOT EXISTS Courses (courseCode TEXT, name TEXT, description TEXT, numUnits INTEGER, prerequisiteCourses TEXT, corequisiteCourses TEXT, otherRequirements TEXT, otherNotes TEXT, offeringSchedule TEXT, nextQuarterOfferings TEXT, historicalBestProfessors TEXT, fulfillsCoreRequirements TEXT, src TEXT);"
  );
  db.exec(
    "CREATE TABLE IF NOT EXISTS CoreCurriculumRequirements (name TEXT, description TEXT, appliesTo TEXT, fulfilledBy TEXT, src TEXT);"
  );
  db.exec(
    "CREATE TABLE IF NOT EXISTS CoreCurriculumPathways (name TEXT, description TEXT, associatedCourses TEXT, src TEXT);"
  );

  for (const school of catalog.schools) {
    db.prepare(
      "INSERT INTO Schools (name, description, courseRequirementsExpression, unitRequirements, otherRequirements, src) VALUES (?, ?, ?, ?, ?, ?);"
    ).run(
      school.name,
      school.description,
      school.courseRequirementsExpression,
      JSON.stringify(school.unitRequirements),
      JSON.stringify(school.otherRequirements),
      school.src
    );
  }
  for (const deptOrProgram of catalog.deptsAndPrograms) {
    db.prepare(
      "INSERT INTO DeptsAndPrograms (name, description, majors, minors, emphases, school, src) VALUES (?, ?, ?, ?, ?, ?, ?);"
    ).run(
      deptOrProgram.name,
      deptOrProgram.description,
      deptOrProgram.majors.map((major) => major.name).join(", "),
      deptOrProgram.minors.map((minor) => minor.name).join(", "),
      deptOrProgram.emphases.map((emphasis) => emphasis.name).join(", "),
      deptOrProgram.school,
      deptOrProgram.src
    );

    for (const major of deptOrProgram.majors) {
      db.prepare(
        "INSERT INTO Majors (name, description, deptCode, requiresEmphasis, courseRequirementsExpression, unitRequirements, otherRequirements, otherNotes, src) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);"
      ).run(
        major.name,
        major.description,
        major.departmentCode,
        major.requiresEmphasis ? 1 : 0,
        major.courseRequirementsExpression,
        JSON.stringify(major.unitRequirements),
        JSON.stringify(major.otherRequirements),
        major.otherNotes.join("\n"),
        major.src
      );
    }
    for (const minor of deptOrProgram.minors) {
      db.prepare(
        "INSERT INTO Minors (name, description, deptCode, requiresEmphasis, courseRequirementsExpression, unitRequirements, otherRequirements, otherNotes, src) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);"
      ).run(
        minor.name,
        minor.description,
        minor.departmentCode,
        minor.requiresEmphasis ? 1 : 0,
        minor.courseRequirementsExpression,
        JSON.stringify(minor.unitRequirements),
        JSON.stringify(minor.otherRequirements),
        minor.otherNotes.join("\n"),
        minor.src
      );
    }
    for (const emphasis of deptOrProgram.emphases) {
      db.prepare(
        "INSERT INTO Emphases (name, description, appliesTo, nameOfWhichItAppliesTo, deptCode, courseRequirementsExpression, unitRequirements, otherRequirements, otherNotes, src) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);"
      ).run(
        emphasis.name,
        emphasis.description,
        emphasis.appliesTo,
        emphasis.nameOfWhichItAppliesTo,
        emphasis.departmentCode,
        emphasis.courseRequirementsExpression,
        JSON.stringify(emphasis.unitRequirements),
        JSON.stringify(emphasis.otherRequirements),
        emphasis.otherNotes.join("\n"),
        emphasis.src
      );
    }
  }
  for (const specialProgram of catalog.specialPrograms) {
    db.prepare(
      "INSERT INTO SpecialPrograms (name, description, courseRequirementsExpression, unitRequirements, otherRequirements, src) VALUES (?, ?, ?, ?, ?, ?);"
    ).run(
      specialProgram.name,
      specialProgram.description,
      specialProgram.courseRequirementsExpression,
      JSON.stringify(specialProgram.unitRequirements),
      JSON.stringify(specialProgram.otherRequirements),
      specialProgram.src
    );
  }
  for (const course of catalog.courses) {
    let offeringSchedule = `Expected schedule: ${course.otherOfferingSchedule || course.offeringSchedule}; historically, ${getHistoricalOfferingSeasons(course.courseCode)}`;
    const fulfillsCoreRequirements = Array.from(new Set(catalog.coreCurriculum.requirements.filter(
      (req) =>
        req.fulfilledBy &&
        req.fulfilledBy.includes(course.courseCode)
    ).map((req) => `"${req.requirementName}"`)));
    db.prepare(
      "INSERT INTO Courses (courseCode, name, description, numUnits, prerequisiteCourses, corequisiteCourses, otherRequirements, otherNotes, offeringSchedule, nextQuarterOfferings, historicalBestProfessors, fulfillsCoreRequirements, src) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);"
    ).run(
      course.courseCode,
      course.name,
      course.description,
      course.numUnits,
      course.prerequisiteCourses,
      course.corequisiteCourses,
      JSON.stringify(course.otherRequirements),
      course.otherNotes,
      offeringSchedule,
      JSON.stringify(course.nextQuarterOfferings),
      getHistoricalBestProfessors(course.courseCode),
      fulfillsCoreRequirements.length > 0
        ? fulfillsCoreRequirements.join(", ")
        : null,
      course.src
    );
  }
  for (const coreCurriculumRequirement of catalog.coreCurriculum.requirements) {
    db.prepare(
      "INSERT INTO CoreCurriculumRequirements (name, description, appliesTo, fulfilledBy, src) VALUES (?, ?, ?, ?, ?);"
    ).run(
      coreCurriculumRequirement.requirementName,
      coreCurriculumRequirement.requirementDescription,
      coreCurriculumRequirement.appliesTo,
      JSON.stringify(coreCurriculumRequirement.fulfilledBy),
      coreCurriculumRequirement.src
    );
  }
  for (const coreCurriculumPathway of catalog.coreCurriculum.pathways) {
    db.prepare(
      "INSERT INTO CoreCurriculumPathways (name, description, associatedCourses, src) VALUES (?, ?, ?, ?);"
    ).run(
      coreCurriculumPathway.name,
      coreCurriculumPathway.description,
      JSON.stringify(coreCurriculumPathway.associatedCourses),
      coreCurriculumPathway.src
    );
  }
  db.close();
}

function getHistoricalBestProfessors(courseCode) {
  const courseEval = aggregateCourseEvals[courseCode];
  if (!courseEval) {
    // console.error(`No course evaluations found for ${courseCode}`);
    return null;
  }
  const bestProfs = courseEval.professors
    .filter((professor) => {
      const professorEntry = aggregateCourseEvals[professor][courseCode];
      // Make sure professor has taught within last 2 years
      const lastTermTaught = professorEntry.recentTerms[0];
      return termWithinDays(lastTermTaught, 730);
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
    // console.error(`No course evaluations found for ${courseCode}`);
    return null;
  }
  const offeringSeasons = {};
  for (const professor of courseEval.professors) {
    const professorEntry = aggregateCourseEvals[professor][courseCode];
    for (const term of professorEntry.recentTerms) {
      const season = term.split(" ")[0];
      if (termWithinDays(term, 730))
        offeringSeasons[season] = (offeringSeasons[season] || 0) + 1;
    }
  }
  return (
    "in the past 2 years, was offered " +
    Object.entries(offeringSeasons)
      .map(([season, count]) => `${count} times during ${season}`)
      .join(", ") +
    "."
  );
}

function termWithinDays(term, days) {
  const [season, year] = term.split(" ");
  const month =
    season === "Winter"
      ? 3
      : season === "Spring"
        ? 6
        : season === "Summer"
          ? 8
          : 12;

  const dateOfTerm = new Date(
    `${year}-${month}-01`
  );
  const currentQuarterDate = new Date();
  const msPerDay = 86400000;
  const daysSinceTerm =
    (currentQuarterDate - dateOfTerm) / msPerDay;
  return daysSinceTerm <= days;
}

makeSQLiteDB("full_university_catalog_v2.json");
