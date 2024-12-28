import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import fs from "fs";

export const CourseCode = z
  .string()
  .describe(
    "A course code containing the department code and a number, like CSCI183",
  );

export const CourseRange = z.object({
  startCourseCode: CourseCode.describe(
    "The first course code in the range (inclusive)",
  ),
  endCourseCode: CourseCode.describe(
    "The last course code in the range (inclusive)",
  ),
  numFromRange: z
    .number()
    .describe(
      "The number of courses from the range that must be taken, if applicable",
    ),
  excludeCourses: z
    .array(CourseCode)
    .describe("Courses to exclude from the range"),
});

export const CourseCodeOrRange = z
  .union([CourseCode, CourseRange.omit({ numFromRange: true })])
  .describe("A course code or a range of course codes");

export const AnyNFromPool = z
  .object({
    n: z.number(),
    fromPools: z
      .array(z.array(CourseCodeOrRange).describe("A pool of courses"))
      .describe(
        "A list of pools of courses from which n courses can be taken, where at least one course must be taken from each pool",
      ),
  })
  .describe(
    "Can be used to describe requirements that are fulfilled by taking any set of n courses from a pool (or pools) of courses",
  );

export const UnitRequirement = z
  .object({
    requirementDescription: z
      .string()
      .describe("A full description of the unit requirement"),
    unitsRequired: z.number().describe("The number of units required"),
    typeOfUnits: z.enum(["Any", "Upper Division", "Lower Division"]),
    unitsMustBeFrom: z.enum(["Any", "Department"]),
    departmentCode: z
      .string()
      .describe(
        "The four-letter department code for the department from which the units must be taken, if applicable.",
      ),
  })
  .describe(
    "A requirement that specifies a number of units that must be taken, and from where",
  );

export const Emphasis = z.object({
  name: z
    .string()
    .describe(
      "The name of the emphasis, but should not include the word 'emphasis'",
    ),
  description: z
    .string()
    .describe(
      "A full description of the emphasis, but do not include the specific courses that are required for the emphasis",
    ),
  appliesTo: z.enum(["Major", "Other"]),
  otherPleaseSpecify: z
    .string()
    .optional()
    .describe("If 'Other' is selected as the appliesTo field, please specify"),
  nameOfWhichItAppliesTo: z
    .string()
    .describe(
      "The name of the major it applies to, should not include the word 'major'",
    ),
  departmentCode: z
    .string()
    .describe("The four-letter department code for the emphasis, like CSCI"),
  requiresCourses: z
    .array(CourseCode)
    .describe("The courses that must always be taken to complete the emphasis"),
  requiresCourseRanges: z
    .array(CourseRange)
    .describe(
      "Ranges of courses from which a student must take a certain number of courses",
    ),
  requiresCoursesFromPools: z
    .array(AnyNFromPool)
    .describe(
      "Courses from pools of courses from which a student must take a certain number of courses",
    ),
  requiresUnits: z
    .array(UnitRequirement)
    .describe(
      "Requirements on the number units of a certain type that must be taken, if applicable",
    ),
  otherRequirements: z
    .string()
    .describe(
      "Any other requirements that are not covered by the other fields",
    ),
});

export const Minor = z.object({
  name: z
    .string()
    .describe("The name of the minor, but should not include the word 'minor"),
  departmentCode: z
    .string()
    .describe("The four-letter department code for the minor, like CSCI"),
  description: z.string().describe("A full description of the minor"),
  requiresCourses: z
    .array(CourseCode)
    .describe("The courses that must always be taken to complete the minor"),
  requiresCourseRanges: z
    .array(CourseRange)
    .describe(
      "Ranges of courses from which a student must take a certain number of courses",
    ),
  requiresCoursesFromPools: z
    .array(AnyNFromPool)
    .describe(
      "Courses from pools of courses from which a student must take a certain number of courses",
    ),
  requiresUnits: z
    .array(UnitRequirement)
    .describe(
      "Requirements on the number units of a certain type that must be taken, if applicable",
    ),
  otherRequirements: z
    .string()
    .describe(
      "Any other requirements that are not covered by the other fields",
    ),
});

export const OtherRequirement = z.object({
  requirementName: z
    .string()
    .describe("A short, descriptive name of the requirement"),
  requirementDescription: z
    .string()
    .describe("A full description of the requirement"),
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
  description: z.string().describe("A full description of the major"),
  requiresCourses: z
    .array(CourseCode)
    .describe("The courses that must always be taken to complete the major"),
  requiresCourseRanges: z
    .array(CourseRange)
    .describe(
      "Ranges of courses from which a student must take a certain number of courses",
    ),
  requiresCoursesFromPools: z
    .array(AnyNFromPool)
    .describe(
      "Courses from pools of courses from which a student must take a certain number of courses",
    ),
  requiresUnits: z
    .array(UnitRequirement)
    .describe(
      "Requirements on the number units of a certain type that must be taken, if applicable",
    ),
  otherRequirements: z
    .array(OtherRequirement)
    .describe(
      "Any other requirements that are not covered by the other fields",
    ),
});

export const Course = z
  .object({
    courseCode: CourseCode.describe("The course code, like CSCI183"),
    name: z.string().describe("The full name of the course"),
    description: z.string().describe("A description of the course"),
    numUnits: z.number().describe("The number of units of the course"),
    prerequisites: z
      .array(CourseCode)
      .describe(
        "The prerequisites courses for this course, in the form of course codes",
      ),
    corequisites: z
      .array(CourseCode)
      .describe(
        "The corequisite courses for this course, in the form of course codes",
      ),
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
  majors: z.array(Major).optional(),
  minors: z.array(Minor).optional(),
  emphases: z.array(Emphasis).optional(),
  // requirements: z.array(Requirement).optional(),
  errors: z
    .array(z.string())
    .describe("Any errors that are encountered when parsing the page"),
});

export const SchoolInfo = z.object({
  name: z.string().describe("The name of the school or college"),
  description: z.string().describe("A short description of the school"),
  requiresCourses: z
    .array(CourseCode)
    .describe("The courses that must always be taken to complete the emphasis"),
  requiresCourseRanges: z
    .array(CourseRange)
    .describe(
      "Ranges of courses from which a student must take a certain number of courses",
    ),
  requiresCoursesFromPools: z
    .array(AnyNFromPool)
    .describe(
      "Courses from pools of courses from which a student must take a certain number of courses",
    ),
  requiresUnits: z
    .array(UnitRequirement)
    .describe(
      "Requirements on the number units of a certain type that must be taken, if applicable",
    ),
  otherRequirements: z
    .string()
    .describe(
      "Any other requirements that are not covered by the other fields",
    ),
  courses: z
    .array(Course)
    .describe("General courses that the school/college offers."),
});

export const SpecialProgramInfo = z.object({
  name: z.string().describe("The name of the special program"),
  description: z
    .string()
    .describe("A full description of the special program."),
  requiresCourses: z
    .array(CourseCode)
    .describe("The courses that must always be taken to complete the emphasis"),
  requiresCourseRanges: z
    .array(CourseRange)
    .describe(
      "Ranges of courses from which a student must take a certain number of courses",
    ),
  requiresCoursesFromPools: z
    .array(AnyNFromPool)
    .describe(
      "Courses from pools of courses from which a student must take a certain number of courses",
    ),
  requiresUnits: z
    .array(UnitRequirement)
    .describe(
      "Requirements on the number units of a certain type that must be taken, if applicable",
    ),
  otherRequirements: z
    .string()
    .describe(
      "Any other requirements that are not covered by the other fields",
    ),
  courses: z
    .array(Course)
    .describe("Courses that are offered as part of the program."),
});

export const CourseCatalog = z.object({
  courses: z.array(Course),
  errors: z
    .array(z.string())
    .describe("Any errors that are encountered when parsing the page"),
});

export const DepartmentInfoSchema = zodToJsonSchema(
  DepartmentInfo,
  "DepartmentInfo",
);

export const SchoolInfoSchema = zodToJsonSchema(SchoolInfo, "SchoolInfo");

export const SpecialProgramInfoSchema = zodToJsonSchema(
  SpecialProgramInfo,
  "SpecialProgramInfo",
);

export const CourseCatalogSchema = zodToJsonSchema(
  CourseCatalog,
  "CourseCatalog",
);

fs.writeFileSync(
  "schemas/department_info.json",
  JSON.stringify(DepartmentInfoSchema, null, 2),
);
fs.writeFileSync(
  "schemas/school_info.json",
  JSON.stringify(SchoolInfoSchema, null, 2),
);
fs.writeFileSync(
  "schemas/special_program_info.json",
  JSON.stringify(SpecialProgramInfoSchema, null, 2),
);
fs.writeFileSync(
  "schemas/course_catalog.json",
  JSON.stringify(CourseCatalogSchema, null, 2),
);
