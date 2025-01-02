import { z } from "zod";

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
