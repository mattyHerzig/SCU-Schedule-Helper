import OpenAI from "openai";
import fs from "fs";
import sqlite from "node:sqlite";

const universityCatalog = {
  schools: [],
  deptsAndPrograms: [],
  specialPrograms: [],
  courses: [],
  errors: [],
};

const openAIClient = new OpenAI(process.env.OPENAI_API_KEY);

async function checkBatchStatus(batch_id) {
  const batch = await openAIClient.batches.retrieve(batch_id);
  console.log(JSON.stringify(batch, null, 2));
}

async function deleteAllFiles() {
  const files = await openAIClient.files.list();
  console.log(JSON.stringify(files, null, 2));
  for (const file of files.data) {
    await openAIClient.files.del(file.id);
  }
}

function mergeBatchResults(batchFilenames) {
  for (const filename of batchFilenames) {
    const data = fs
      .readFileSync(`./local_data/${filename}`, "utf-8")
      .toString();
    const lines = data.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line) {
        try {
          const result = JSON.parse(line);

          const data = JSON.parse(
            result.response.body.choices[0].message.content,
          );
          universityCatalog.errors.push(...(data.errors || []));
          delete data.errors;
          if (result.custom_id.includes("SCHOOL_INFO")) {
            universityCatalog.schools.push(data);
          }
          if (result.custom_id.includes("DEPT_INFO")) {
            universityCatalog.deptsAndPrograms.push(data);
          }
          if (result.custom_id.includes("SPECIAL_PROGRAM_INFO")) {
            universityCatalog.specialPrograms.push(data);
          }
          if (result.custom_id.includes("COURSE_INFO")) {
            universityCatalog.courses.push(data.courses);
          }
        } catch (e) {
          console.error(`Error parsing line ${i} of ${filename}`);
          console.error(e);
        }
      }
    }
  }
  fs.writeFileSync(
    "./local_data/full_university_catalog.json",
    JSON.stringify(universityCatalog),
  );
  makeSQLiteDB("full_university_catalog.json");
}

/*
The original json schema:
export const CourseCode = z
  .string()
  .describe(
    "A course code containing the department code and a number, like CSCI183",
  );

export const UnitRequirement = z
  .object({
    requirementDescription: z
      .string()
      .describe("A summary/description of the unit requirement"),
    numUnitsRequired: z.number().describe("The number of units required"),
    typeOfUnits: z.enum(["Any", "Upper Division", "Lower Division"]),
    unitsMustBeFrom: z
      .enum(["Any", "Department"])
      .describe(
        "Where the units must come from (either any school/department, or a specific department)",
      ),
    numUnitsFromSCU: z
      .number()
      .describe("The number of units that must be taken at SCU, if applicable"),
    departmentCode: z
      .string()
      .describe(
        "The four-letter department code for the department from which the units must be taken, if applicable.",
      ),
  })
  .describe(
    "A requirement that specifies a number of units that must be taken, and from where",
  );

export const OtherRequirement = z.object({
  requirementName: z
    .string()
    .describe("A short, descriptive name of the requirement"),
  requirementDescription: z
    .string()
    .describe("A summary/description of the requirement"),
});

const COURSE_REQS_DESC =
  "A valid expression of sets of courses and/or course ranges, with potentially lower/upper bounds and/or department diversity operators, representing the course requirements. Sets can be combined with the & and | operators. CANNOT CONTAIN ANYTHING ELSE, LIKE NATURAL LANGUAGE (THOSE REQUIREMENTS SHOULD GO IN OTHERREQUIREMENTS).";
export const CourseRequirements = z.string().describe(COURSE_REQS_DESC);

export const MajorMinorCourseRequirements = z
  .string()
  .describe(
    COURSE_REQS_DESC +
      " ALSO SHOULD NOT contain any emphasis requirements. Those should be in the emphasis object.",
  );

export const UnitRequirements = z
  .array(UnitRequirement)
  .describe(
    "Requirements on the number units of a certain type that must be taken, if applicable",
  );

export const OtherRequirements = z
  .array(OtherRequirement)
  .describe("Any other requirements that are not yet covered.");

export const OtherNotes = z
  .array(z.string())
  .describe("Any other notes regarding the program.");

export const Emphasis = z.object({
  name: z
    .string()
    .describe(
      "The name of the emphasis, but should not include the word 'emphasis'",
    ),
  description: z
    .string()
    .describe(
      "A summary/description of the emphasis, but do not include the specific courses that are required for the emphasis",
    ),
  appliesTo: z.enum(["Major", "Minor", "Other"]),
  nameOfWhichItAppliesTo: z
    .string()
    .describe(
      "The name of the major/minor or other entity that it applies to, should not include the word 'major' or 'minor'",
    ),
  departmentCode: z
    .string()
    .describe("The four-letter department code for the emphasis, like CSCI"),
  courseRequirementsExpression: CourseRequirements,
  unitRequirements: UnitRequirements,
  otherRequirements: OtherRequirement,
  otherNotes: OtherNotes,
});

export const Minor = z.object({
  name: z
    .string()
    .describe("The name of the minor, but should not include the word 'minor"),
  departmentCode: z
    .string()
    .describe(
      "The four-letter department code for the minor, like CSCI, if applicable.",
    ),
  description: z.string().describe("A summary/description of the minor"),
  requiresEmphasis: z
    .boolean()
    .describe(
      "Whether the minor requires an emphasis. If true, the student must take an emphasis as part of the minor. If false, an emphasis is optional, or there are no emphases available for the minor.",
    ),
  courseRequirementsExpression: MajorMinorCourseRequirements,
  unitRequirements: UnitRequirements,
  otherRequirements: OtherRequirement,
  otherNotes: OtherNotes,
});

export const Major = z.object({
  name: z
    .string()
    .describe(
      "The name of the major, but should not include the word 'major' or the degree type",
    ),
  departmentCode: z
    .string()
    .describe("The four-letter department code for the major"),
  description: z.string().describe("A summary/description of the major"),
  requiresEmphasis: z
    .boolean()
    .describe(
      "Whether the major requires an emphasis. If true, the student must take an emphasis as part of the major. If false, an emphasis is optional, or there are no emphases available for the major.",
    ),
  courseRequirementsExpression: MajorMinorCourseRequirements,
  unitRequirements: UnitRequirements,
  otherRequirements: OtherRequirement,
  otherNotes: OtherNotes,
});

export const Course = z
  .object({
    courseCode: CourseCode,
    name: z.string().describe("The full name of the course"),
    description: z.string().describe("A description of the course"),
    numUnits: z.number().describe("The number of units of the course"),
    prerequisites: z
      .string()
      .describe(
        "A valid boolean-like expression of sets of courses, representing the prerequisites for the course. MUST ONLY HAVE A VALID EXPRESSION OF COURSE CODES AND COURSE RANGES AND NOT anything else, like any natural language (those should go in otherRequirements)",
      ),
    corequisites: z
      .string()
      .describe(
        "A valid boolean-like expression of sets of courses, representing the corequisites for the course. MUST ONLY HAVE A VALID EXPRESSION OF COURSE CODES AND COURSE RANGES AND NOT anything else, like any natural language (those should go in otherRequirements)",
      ),
    otherRequirements: OtherRequirements,
    otherNotes: z.string().describe("Any other notes about the course"),
    offeringSchedule: z
      .enum([
        "Normal",
        "On Demand",
        "Alternate Years",
        "Other (please specify)",
      ])
      .describe("The schedule of when the course is offered"),
    otherOfferingSchedule: z
      .string()
      .describe(
        "If 'Other' is selected for the offering pattern, please specify here.",
      ),
  })
  .describe("A course object.");

export const DepartmentInfo = z.object({
  name: z
    .string()
    .describe(
      "The name of the department or program, should not include 'department' or 'program'",
    ),
  description: z
    .string()
    .describe("A summary/description of the department or program"),
  majors: z.array(Major),
  minors: z.array(Minor),
  emphases: z.array(Emphasis),
  errors: z
    .array(z.string())
    .describe("Any errors that are encountered when parsing the page"),
});

export const SchoolInfo = z.object({
  name: z.string().describe("The name of the school or college"),
  description: z
    .string()
    .describe("A summary.description of the school or college."),
  courseRequirementsExpression: CourseRequirements,
  unitRequirements: UnitRequirements,
  otherRequirements: OtherRequirement,
});

export const SpecialProgramInfo = z.object({
  name: z.string().describe("The name of the special program"),
  description: z
    .string()
    .describe("A summary/description of the special program."),
  courseRequirementsExpression: CourseRequirements,
  unitRequirements: UnitRequirements,
  otherRequirements: OtherRequirement,
});

export const CourseCatalog = z.object({
  courses: z.array(Course),
  errors: z
    .array(z.string())
    .describe("Any errors that are encountered when parsing the page"),
});
*/

async function makeSQLiteDB(catalogJsonFilename) {
  const catalog = JSON.parse(
    fs.readFileSync(`./local_data/${catalogJsonFilename}`, "utf-8"),
  );
  const db = new sqlite.DatabaseSync("./local_data/university_catalog.db");
  db.exec(
    "CREATE TABLE IF NOT EXISTS schools (name TEXT, description TEXT, courseRequirementsExpression TEXT, unitRequirements TEXT, otherRequirements TEXT);",
  );
  // majors and minors are foreign keys to deptsAndPrograms
  db.exec(
    "CREATE TABLE IF NOT EXISTS deptsAndPrograms (name TEXT, description TEXT, deptCode TEXT);",
  );
  db.exec(
    "CREATE TABLE IF NOT EXISTS majors (name TEXT, description TEXT, deptCode TEXT, requiresEmphasis INTEGER, courseRequirementsExpression TEXT, unitRequirements TEXT, otherRequirements TEXT, otherNotes TEXT);",
  );
  db.exec(
    "CREATE TABLE IF NOT EXISTS minors (name TEXT, description TEXT, deptCode TEXT, requiresEmphasis INTEGER, courseRequirementsExpression TEXT, unitRequirements TEXT, otherRequirements TEXT, otherNotes TEXT);",
  );
  db.exec(
    "CREATE TABLE IF NOT EXISTS emphases (name TEXT, description TEXT, appliesTo TEXT, nameOfWhichItAppliesTo TEXT, deptCode TEXT, courseRequirementsExpression TEXT, unitRequirements TEXT, otherRequirements TEXT, otherNotes TEXT);",
  );
  db.exec(
    "CREATE TABLE IF NOT EXISTS specialPrograms (name TEXT, description TEXT, courseRequirementsExpression TEXT, unitRequirements TEXT, otherRequirements TEXT);",
  );
  db.exec(
    "CREATE TABLE IF NOT EXISTS courses (courseCode TEXT, name TEXT, description TEXT, numUnits INTEGER, prerequisites TEXT, corequisites TEXT, otherRequirements TEXT, otherNotes TEXT, offeringSchedule TEXT, otherOfferingSchedule TEXT);",
  );

  for (const school of catalog.schools) {
    // console.log(school);
    db.prepare(
      "INSERT INTO schools (name, description, courseRequirementsExpression, unitRequirements, otherRequirements) VALUES (?, ?, ?, ?, ?);",
    ).run(
      school.name,
      school.description,
      school.courseRequirements || school.courseRequirementsExpression,
      JSON.stringify(school.unitRequirements),
      JSON.stringify(school.otherRequirements),
    );
  }
  for (const deptOrProgram of catalog.deptsAndPrograms) {
    db.prepare(
      "INSERT INTO deptsAndPrograms (name, description, deptCode) VALUES (?, ?, ?);",
    ).run(
      deptOrProgram.name,
      deptOrProgram.description,
      getDeptCode(deptOrProgram),
    );

    for (const major of deptOrProgram.majors) {
      console.log(major);
      console.log(typeof (major.requiresEmphasis ? 1 : 0));
      db.prepare(
        "INSERT INTO majors (name, description, deptCode, requiresEmphasis, courseRequirementsExpression, unitRequirements, otherRequirements, otherNotes) VALUES (?, ?, ?, ?, ?, ?, ?, ?);",
      ).run(
        major.name,
        major.description,
        major.deptCode,
        major.requiresEmphasis ? 1 : 0,
        major.courseRequirements || major.courseRequirementsExpression,
        JSON.stringify(major.unitRequirements),
        JSON.stringify(major.otherRequirements),
        "major.otherNotes",
      );
    }
    for (const minor of deptOrProgram.minors) {
      db.prepare(
        "INSERT INTO minors (name, description, deptCode, requiresEmphasis, courseRequirementsExpression, unitRequirements, otherRequirements, otherNotes) VALUES (?, ?, ?, ?, ?, ?, ?, ?);",
      ).run(
        minor.name,
        minor.description,
        minor.deptCode,
        minor.requiresEmphasis ? 1 : 0,
        minor.courseRequirements || minor.courseRequirementsExpression,
        JSON.stringify(minor.unitRequirements),
        JSON.stringify(minor.otherRequirements),
        minor.otherNotes,
      );
    }
    for (const emphasis of deptOrProgram.emphases) {
      db.prepare(
        "INSERT INTO emphases (name, description, appliesTo, nameOfWhichItAppliesTo, deptCode, courseRequirementsExpression, unitRequirements, otherRequirements, otherNotes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);",
      ).run(
        emphasis.name,
        emphasis.description,
        emphasis.appliesTo,
        emphasis.nameOfWhichItAppliesTo,
        emphasis.deptCode,
        emphasis.courseRequirements || emphasis.courseRequirementsExpression,
        JSON.stringify(emphasis.unitRequirements),
        JSON.stringify(emphasis.otherRequirements),
        emphasis.otherNotes,
      );
    }
  }
  for (const specialProgram of catalog.specialPrograms) {
    db.prepare(
      "INSERT INTO specialPrograms (name, description, courseRequirementsExpression, unitRequirements, otherRequirements) VALUES (?, ?, ?, ?, ?);",
    ).run(
      specialProgram.name,
      specialProgram.description,
      specialProgram.courseRequirements ||
        specialProgram.courseRequirementsExpression,
      JSON.stringify(specialProgram.unitRequirements),
      JSON.stringify(specialProgram.otherRequirements),
    );
  }
  for (const course of catalog.courses) {
    db.prepare(
      "INSERT INTO courses (courseCode, name, description, numUnits, prerequisites, corequisites, otherRequirements, otherNotes, offeringSchedule, otherOfferingSchedule) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);",
    ).run(
      course.courseCode,
      course.name,
      course.description,
      course.numUnits,
      course.prerequisites,
      course.corequisites,
      JSON.stringify(course.otherRequirements),
      course.otherNotes,
      course.offeringSchedule,
      course.otherOfferingSchedule,
    );
  }
  db.close();
}

function getDeptCode(deptOrProgram) {
  return deptOrProgram.majors.length > 0
    ? deptOrProgram.majors[0].departmentCode
    : deptOrProgram.minors.length > 0
      ? deptOrProgram.minors[0].departmentCode
      : deptOrProgram.emphases.length > 0
        ? deptOrProgram.emphases[0].departmentCode
        : "";
}

mergeBatchResults(["batch_67737bc7ab2081909c4096e12286a3e3_output.jsonl"]);
