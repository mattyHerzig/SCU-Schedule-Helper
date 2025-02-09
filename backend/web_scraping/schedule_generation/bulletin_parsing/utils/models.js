import { z } from "zod";

export const CourseCode = z
  .string()
  .describe(
    "A course code containing the 4-letter department code and a course number, with no space in-between and no leading zeroes for the course number, like CSCI183 or MATH14",
  );

export const OtherRequirement = z.object({
  requirementName: z
    .string()
    .describe("A short, descriptive name of the requirement"),
  requirementDescription: z
    .string()
    .describe("A summary/description of the requirement"),
});

export const CourseOrUnitRequirement = z
  .object({
    requirementDescription: z
      .string()
      .describe("A summary/description of the unit requirement"),
    measuredBy: z.enum("courses", "units").describe("How the requirement is measured, either in courses or units"),
    numRequired: z.number().describe("The number of courses or units required"),
    type: z.enum(["Any", "Upper Division", "Lower Division"]).describe("The type of courses or units that must be taken, if applicable (otherwise, 'Any')"),
    numRequiredFromSCU: z
      .number()
      .describe("The number of courses or units that must be taken at SCU, if applicable. Otherwise, should be 0."),
    mustBeFromDepartmentCode: z
      .string()
      .describe(
        "The four-letter department code for the department from which the courses or units must be taken, if applicable. Otherwise, should be blank.",
      ),
  })
  .describe(
    "A requirement that specifies a number of courses or units that must be taken, and from where.",
  );



const COURSE_REQS_DESC =
  "A valid expression of sets of course s and/or course ranges, with potentially lower/upper bounds and/or department diversity operators, representing the course requirements. Sets can be combined with the & and | operators. CANNOT CONTAIN ANYTHING ELSE, LIKE NATURAL LANGUAGE (THOSE REQUIREMENTS SHOULD GO IN OTHERREQUIREMENTS).";

export const CourseRequirements = z.string().describe(COURSE_REQS_DESC);

export const MajorMinorCourseRequirements = z
  .string()
  .describe(
    COURSE_REQS_DESC +
    " ALSO SHOULD NOT contain any emphasis requirements. Those should be in the emphasis object.",
  );

export const UnitRequirements = z
  .array(CourseOrUnitRequirement)
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
    .describe(`
    The four-letter department code for the major. A department code must always be a four-letter, all-caps string, such as CSCI, MATH, or RSOC. It is the string that precedes all course codes within that department. Sometimes, the department code is not explicitly listed on the page. For this reason, here is a list of all department codes and their corresponding subjects:
ACTG -> Accounting
AERO -> Aerospace Studies
AMTH -> Applied Mathematics
ANTH -> Anthropology
ARAB -> Arabic
ARTH -> Art History
ARTS -> Studio Art
ASCI -> Arts and Sciences
ASIA -> Valid for the Asian Studies Minor
BIOE -> Bioengineering
BIOL -> Biology
BUSN -> Business
CENG -> Civil, Envr & Sust Engineering
CHEM -> Chemistry
CHIN -> Chinese
CHST -> Child Studies
CLAS -> Classics
COMM -> Communication
PSSE -> Posse Scholar
CSCI -> Computer Science
CSEN -> Computer Science and Engineering
DANC -> Dance
ECEN -> Electrical and Computer Engineering
ECON -> Economics
ELSJ -> Experiential Learning for Social Justice
ENGL -> English
ENGR -> Engineering
ENVS -> Environ Studies & Sciences
ETHN -> Ethnic Studies
FNCE -> Finance
FREN -> French & Francophone Studies
GERM -> German Studies
GERO -> Valid for the Gerontology minor
HIST -> History
HNRS -> Honors Program
INTL -> Valid for the international studies minor
ITAL -> Italian Studies
JAPN -> Japanese Studies
LEAD -> Lead Scholars Program
MATH -> Mathematics
MECH -> Mechanical Engineering
MGMT -> Management
MILS -> Military Science
MKTG -> Marketing
MUSC -> Music
NEUR -> Neuroscience
OMIS -> Information Systems & Analytics
PHIL -> Philosophy
PHSC -> Public Health Science
PHYS -> Physics
POLI -> Political Science
PSYC -> Psychology
RSOC -> Religion & Society
SCTR -> Scripture & Tradition
SOCI -> Sociology
SPAN -> Spanish Studies
TESP -> Theology Ethics & Spirituality
THTR -> Theatre
UGST -> Undergraduate Studies
UNIV -> University Programs
WGST -> Women's and Gender Studies

Note that some minors do not have a department, and the department code should be left blank. These types of minors only exist if the page is a non-department page (i.e., the header of the page doesn’t say 'Department of ...'). Instead, these minors come from smaller programs that have one or more directors/advisors, but not an entire department with professors.
`),
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
      `The name of the department or program, should not include 'department' or 'program'.`,
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
