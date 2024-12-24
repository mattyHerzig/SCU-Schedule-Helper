import { z } from "zod";

export const EXTRACT_DATA_PROMPT = `Extract any data that you can from the page! Some pages will not have any useful data, and that's totally fine. Just a few notes:

For courses: the course code should be a string with four uppercase letters, representing the department, immediately followed by the course number, for example CSCI183. Don't include any leading zeros in the course code. If the page represents a page for a particular department(s), do not include courses from other departments (even if they are referenced on the page). 

Some pages may include course sequences within a singular entry. These should still be listed as separate courses. You may assume that if there is a name and fairly long description of a course on a page, then it is within that department (and should be included).

Some pages might include multiple majors/minors and emphases. Please include all of the ones that you see. Include requirements that apply to majors, minors, emphases, and also general requirements that apply to all students. You can also mark a requirement in the other category, if it doesn't fit into one of the aforementioned categories.

In general, a department must always be a four letter all-caps string like CSCI, MATH, RSOC (it is simply the string that precedes all course codes within that department).

A lower division course always has a number between 1 and 99 (inclusive), while upper division courses always have a number between 100 and 199 (inclusive). 

If a page says you need to take "any other lower division course" from a department, you can just include that as a CourseRange with startCourseCode being the department code followed by 1 and the endCourseCode being the department code followed by 99.

Furthermore, sometimes the university may require that a student take a number of courses from a pool of given courses. For example “One of the following Methods 1 courses: ANTH 111, 112, 113” is an example of a requirement where at least n=1 course is required from a pool of course codes which is {ANTH111, ANTH112, ANTH113}.

Here is a more complex example:

“Six upper-division courses selected from the following three categories (all three categories must be represented):
Archaeology (ANTH 140-149, 173, 186, 189)
Biological Anthropology (ANTH 130-139)
Cultural Anthropology (ANTH 150-179, 184, 185, 187, 188)”

In this example, the requirement can be described as {
	n: 6
	fromPools: [
[
	{
startCourseCode: “ANTH140”
endCourseCode: “ANTH149”
},
“ANTH173”,
“ANTH186”,
“ANTH189”,
],
[
	{
		startCourseCode: “ANTH130”
		endCourseCode: “ANTH139”
	}
],
[
	{
		startCourseCode: “ANTH150”
		endCourseCode: “ANTH179”
	},
	“ANTH184”,
	“ANTH185”,
	“ANTH187”,
	“ANTH188”,
]

}

Sometimes, there are requirements that don't involve courses, such as attending events or doing community service. For these, you can create a separate requirement entry with just a name and a description and the major which it applies to, and leave the required courses field blank. These types of requirements should definitely be included too.

If there is a requirement, but you can't get the necessary information from the page to figure out which courses are required, you can also leave the required courses field blank in this case. An example of this would be a requirement like “Students must complete a minimum of 175 quarter units of credit, at least 60 of which must be upper-division” but the page does not include a list of all the undergraduate departments.

If you encounter any errors or strange information on the page, you can just describe the error and mark it in the output.

Thanks for your help!`;

export const CourseCode = z
  .string()
  .describe(
    "A course code containing the department code and a number, like CSCI183",
  );

export const CourseRange = z.object({
  startCourseCode: CourseCode,
  endCourseCode: CourseCode,
});

export const CourseCodeOrRange = z
  .union([CourseCode, CourseRange])
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
  appliesTo: z.enum(["Major", "Minor", "Other"]),
  otherPleaseSpecify: z
    .string()
    .optional()
    .describe("If 'Other' is selected as the appliesTo field, please specify"),
  nameOfWhichItAppliesTo: z
    .string()
    .describe(
      "The name of the major or minor, should not include the word 'major' or 'minor'",
    ),
  departmentCode: z
    .string()
    .describe("The four-letter department code for the emphasis, like CSCI"),
});

export const Minor = z.object({
  name: z
    .string()
    .describe("The name of the minor, but should not include the word 'minor"),
  departmentCode: z
    .string()
    .describe("The four-letter department code for the minor, like CSCI"),
  description: z.string().describe("A full description of the minor"),
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
  requires: z
    .array(z.union([CourseCode, CourseRange, AnyNFromPool]))
    .describe(
      "The courses that fulfill the requirement. Can include course codes, ranges of course codes, and/or any number of courses from a pool of courses",
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

export const UniversityCatalog = z.object({
  majors: z.array(Major).optional(),
  minors: z.array(Minor).optional(),
  emphases: z.array(Emphasis).optional(),
  requirements: z.array(Requirement).optional(),
  courses: z.array(Course).optional(),
  errors: z
    .array(z.string())
    .describe("Any errors that are encountered when parsing the page"),
});
