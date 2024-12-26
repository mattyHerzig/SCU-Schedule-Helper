import { z } from "zod";

export const PageSections = z.object({
  sections: z
    .array(
      z
        .object({
          type: z.enum(["RelevantToAll", "RelevantToGroup"]),
          sectionBeginsWith: z
            .string()
            .describe(
              "The exact text from the beginning of the section, no more than a sentence",
            ),
          sectionEndsWith: z
            .string()
            .describe(
              "The exact text from the end of the section, no more than a sentence. IF the end of the section is the end of the page, use an empty string",
            ),
          groupName: z
            .string()
            .describe(
              "The name of the group, if applicable, or an empty string if not",
            ),
        })
        .describe("A section of the page"),
    )
    .describe("All the sections of the page."),
});

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
    .array(z.union([CourseCode, CourseRange, AnyNFromPool]))
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
    .array(z.union([CourseCode, CourseRange, AnyNFromPool]))
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
    .array(z.union([CourseCode, CourseRange, AnyNFromPool]))
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

export const Requirement = z.object({
  requirementName: z
    .string()
    .describe("A short, descriptive name of the requirement"),
  requirementDescription: z
    .string()
    .describe("A full description of the requirement"),
  appliesTo: z.enum([
    "All Students",
    "Department",
    "Major",
    "Minor",
    "Emphasis",
    "Other",
  ]),
  otherPleaseSpecify: z
    .string()
    .describe("If 'Other' is selected for the appliesTo field, please specify"),
  nameOfWhichItAppliesTo: z
    .string()
    .describe(
      "The name of the major, minor, or emphasis to which the requirement applies",
    ),
  requiresCourses: z
    .array(z.union([CourseCode, CourseRange, AnyNFromPool]))
    .describe(
      "The courses that must always be taken to fulfill the requirement",
    ),
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
});

export const Course = z.object({
  courseCode: CourseCode.describe("The course code, like CSCI183"),
  courseName: z.string().describe("The longer name of the course"),
  courseDescription: z.string().describe("A description of the course"),
  courseUnits: z.number().describe("The number of units of the course"),
  coursePrerequisites: z
    .array(CourseCode)
    .describe(
      "The prerequisites courses for this course, in the form of course codes",
    ),
  courseCorequisites: z
    .array(CourseCode)
    .describe(
      "The corequisite courses for this course, in the form of course codes",
    ),
  otherNotes: z.string().describe("Any other notes about the course"),
  courseOfferings: z
    .enum(["Normal", "On Demand", "Alternate Years", "Other (please specify)"])
    .describe("The frequency of when the course is offered"),
  courseOfferingOther: z
    .string()
    .describe(
      "If 'Other' is selected for the offering pattern, please specify here.",
    ),
});

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
  schoolName: z.string().describe("The name of the school or college"),
  schoolDescription: z.string().describe("A short description of the school"),
  schoolRequirements: z
    .array(
      Requirement.omit({
        appliesTo: true,
        otherPleaseSpecify: true,
        nameOfWhichItAppliesTo: true,
      }),
    )
    .describe("The requirements for the school"),
});

export const CourseCatalog = z.object({
  courses: z.array(Course),
  errors: z
    .array(z.string())
    .describe("Any errors that are encountered when parsing the page"),
});
