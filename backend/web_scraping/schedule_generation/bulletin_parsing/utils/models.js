import { z } from "zod";

export const CourseCode = z.string().describe(
  `A course code containing the 4-letter department code and a course number, with no space in-between and no leading zeroes for the course number, like CSCI163 or MATH14. 
    Note that a department code must always be a four-letter, all-caps string, such as CSCI, MATH, or RSOC. But, the department code is not always explicitly listed with the course number/title. 
    Instead, the general form for the title of a course is "<course number>. <course name>", for example, "163. Data Structures and Algorithms" corresponds to the course code CSCI163.
    For this reason, here is a list of all department codes and their corresponding subjects, so that you may infer them:
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

Also note that the course number may contain some letters, such as CSCI183A or MATH14GR. These letters should be included.
If the course requires concurrent enrollment in a lab, the course code for the lab should generally be <courseCode>L; for example if MATH14 had a lab, it would be MATH14L, unless otherwise stated.
`
);

export const OtherCourseRequirements = z.array(
  z
    .object({
      requirementName: z
        .string()
        .describe("A short, descriptive name of the requirement"),
      requirementDescription: z
        .string()
        .describe("A summary/description of the requirement"),
      requirementType: z
        .enum(["prerequisite", "corequisite"])
        .describe(
          "The type of the requirement (if it happens during the course, that should be corequisite--if it happens before, its a prerequisite)"
        ),
    })
    .describe(
      "Any requirement that is part of the course, but cannot be described as something involving specific courses. For example, attending events or doing community service. These types of requirements are important and should always be included!"
    )
);

export const OtherRequirement = z.object({
  requirementName: z
    .string()
    .describe("A short, descriptive name of the requirement"),
  requirementDescription: z
    .string()
    .describe("A summary/description of the requirement"),
}).describe(`
  A requirement that cannot be described as a requirement on number of units/courses, or a requirement to take specific course. For example, attending events or doing community service. These types of requirements are important and should always be included! 

Or, if there are requirements where the course codes cannot be feasibly determined, such as “From among the student’s lower- and upper-division courses (excluding HIST 100 and 101S), at least one course from four of the following six  fields: Global History, the United States and Canada, Latin America,  Europe, East/South Asia, Africa/West Asia,” these should also be listed as other requirements. Another example:

“Critical Thinking & Writing

Students must take one two-course sequence in composition: CTW 1 and 2

Advanced Writing

ENGL 181”

Here, the ENGL 181 requirement could be included as the course requirements, but CTW1 and 2 could not, as they are not actual course codes (remember that course codes always have a four-letter department code followed by course number, while CTW is only 3 letters). Instead, the CTW sequence would be marked as an “other” requirement.
`);

export const CourseOrUnitRequirement = z
  .object({
    requirementDescription: z
      .string()
      .describe("A summary/description of the unit requirement"),
    measuredBy: z
      .enum(["courses", "units"])
      .describe("How the requirement is measured, either in courses or units"),
    numRequired: z.number().describe("The number of courses or units required in total."),
    typeRequired: z
      .enum(["Any", "Upper Division", "Lower Division"])
      .describe(
        "The type of courses or units that must be taken, if applicable (otherwise, 'Any')"
      ),
    numRequiredFromSCU: z
      .number()
      .describe(
        "The number of courses or units that must be specifically taken at SCU, if applicable. Otherwise, should be 0."
      ),
    mustBeFromDepartmentCode: z
      .string()
      .describe(
        "The four-letter department code for the department from which the courses or units must be taken, if applicable. Otherwise, should be blank."
      ),
  })
  .describe(
    "A requirement that specifies a number of courses or units that must be taken, and from where. An example of this would be a requirement like “Students must complete a minimum of 175 quarter units of credit, at least 60 of which must be upper-division.”"
  );

const COURSE_REQS_DESC = `A course requirements expression, represented through expressions that combine sets of courses and/or course ranges, which are similar to boolean expressions. Each set can be prefixed with a number (the lower bound) or number range (lower bound and upper bound). The lower bound represents the minimum number of courses that must be matched in the set to fulfill the requirement. An upper bound can also be given, which represents the maximum number of courses that can be matched in the set (anything past the bound will not count towards the total number of courses matched in the set). If no bounds are provided, then a lower bound is calculated automatically, and there is no upper bound. When only one number is provided, it is assumed to be the lower bound (and with no upper bound). If a number range with two numbers is provided, it is assumed to be in the form <lowerBound>-<upperBound>. 

NEVER include anything in the course requirements expression that is not a formal course code (i.e. department code + course number) or a course range, just list it as an “other” requirement. The course requirements expression MUST contain only sets of course codes, course code ranges, optional lower and upper bounds for each set, and optional department diversity constraints with the @ operator. DO NOT include any natural language in the expression. 

Heres an example: if the page says students are required to take “one of the following courses: ANTH 111, 112, 115”, this can be represented by the expression (ANTH111 | ANTH112 | ANTH115). Or, if it said two of the following courses instead of one, that would be 2(ANTH111 | ANTH112 | ANTH115). Or, if all of the courses were required, it would be (ANTH111 & ANTH112 & ANTH115). 

As a more complex example:

The requirement: “Six (6) courses from the following lists, but no more than two (2) from List II.

List I—Production Courses:

COMM 103
COMM 130 or 130A (or COMM 130B prior toFall 2022)
COMM 131D (or COMM 132B prior to Fall 2022)
COMM 131E (or COMM 133B prior to Fall 2022)
COMM 131F (or COMM 131B prior to Fall 2022)
COMM 132
COMM 132D
COMM 133
COMM 133W (or 188B prior to Fall 2022)
COMM 134 (or COMM 134B prior to Fall 2022)
COMM 135 (or COMM 135B prior to Fall 2022)
COMM 146
List II—History/Theory Courses:

COMM 104
COMM 136S (or COMM 136A prior to Fall 2022)
COMM 136F
COMM 137 (or COMM 137A prior to Fall 2022)
COMM 137S
COMM 138 (or COMM 138A prior to Fall 2022)
COMM 139 (or Comm 139A prior to Fall 2022)
COMM 140
COMM 140B
COMM 140W
COMM 140C
COMM 140Q
COMM 141
COMM 143 (or Comm prior to Fall 2022)
COMM 145 (or Comm prior to Fall 2022)
COMM 188A if completed before Fall 2022”

Could be described as 
6(COMM103 | 
0-1(COM130 | COM130A | COMM130B) | 
0-1(COMM131D | COMM132B) |
0-1(COMM131E | COMM133B) | 
0-1(COMM131F | COMM131B) | 
COMM132 | 
COMM132D | 
COMM133 | 
0-1(COMM133W | COM188B) | 
0-1(COMM134 | COMM134B) | 
COMM146 | 
0-2(
COMM104 | 
0-1(COMM136S | COMM136A) | 
COMM136F | 
0-1(COMM137 | COMM137A) | 
COMM137S | 
0-1(COMM138 | COMM138A) | 
0-1(COMM139 | COMM139A) | 
COMM140 | 
COMM140B | 
COMM140W | 
COMM140C | 
COMM140Q | 
COMM141 | 
COMM143 | 
COMM145 | 
COMM188A)
)

Here’s one more difficult example: 
“Arabic, Islamic, and Middle Eastern Studies
Director: Farid Senzai, Ph.D.

The interdisciplinary minor in Arabic, Islamic, and Middle Eastern Studies (AIMES) provides an introduction to the people, cultures, politics,  religions and societies of the broader Middle East and North Africa. It will also include examination of peoples from the region living elsewhere and the diverse forms of Islamic practice and local religious customs observed in Muslim societies and throughout the world. This program also encourages the study of diaspora and immigrant communities where Islamic and Middle Eastern populations constitute a religious or ethnic minority.

Students enrolled in this minor have the opportunity to sample a variety of methodologies and academic disciplines—including anthropology, art history, literary criticism, history, political science, and religious studies—that address the Middle East in particular and the Islamic world at large.

The AIMES interdisciplinary minor is ideal for students who want to develop the intellectual resources for thoughtful and informed engagement with current issues in the Middle East and the Islamic world. AIMES is also well suited for students considering work with overseas aid organizations, government and military service, international business, or graduate programs in international studies.

Requirements for the Minor
Students must complete a total of nine courses—six culture courses and three Arabic language courses—for a minor in AIMES. Details concerning these requirements are as follows:

Culture Courses
Students must take a total of six culture courses relating to AIMES (two lower-level and four upper-level) from at least three different departments. No more than two courses may be counted for AIMES credit from the department in which a student majors. A maximum of three courses for AIMES credit may be taken from any one department.
Arabic Language
Three quarters of Arabic are required. Students with prior knowledge of a relevant language may take a test that certifies that they have fulfilled this requirement.

Senior Project
In lieu of one of the six required courses in Middle Eastern and Islamic cultures, students may elect to do an independent study/reading course on a project in consultation with a member of the AIMES Faculty Advisory Council. This project may entail fieldwork with local Muslim and diaspora Arab or Middle Eastern communities in the Bay Area.

Students enrolled in the AIMES minor are strongly encouraged to participate in SCU-approved study abroad programs that pertain to Arabic, Islamic, and Middle Eastern studies. Before enrolling in any such program, students should check with the director and faculty members of the AIMES minor as well as the Global Engagement Office.

Anthropology Courses
ANTH 156. Anthropology of Muslim Peoples and Practices

ANTH 187. Middle East: Gender and Sexuality

ANTH 188. Middle East: Culture and Change

Art History Courses
ARTH 24. From Damascus to Dubai: A Survey of the Visual Culture of the Middle East

ARTH 121. Venice and the Other in the Renaissance

ARTH 164. Islamic Art, 600–1350 CE

Ethnic Studies Courses
ETHN 80. Introduction to the Study of Muslim and Arab Americans in the United States

History Courses
HIST 120. The Crusades: Christian and Muslim Perspectives  

HIST 144S. Islam in Africa

Modern Languages and Literatures Courses
ARAB 1. Elementary Arabic I

ARAB 2. Elementary Arabic II

ARAB 3. Elementary Arabic III

ARAB 21. Intermediate Arabic I

ARAB 22. Intermediate Arabic II

ARAB 23. Intermediate Arabic III

ARAB 50. Intermediate Arabic Conversation

ARAB 137. Arabic Language, Culture and Identity

ARAB 171. Reading the Quran

ARAB 185: Arab American Experience

ARAB 199. Directed Reading

FREN 114. Literatures and Cultures of the Maghreb

FREN 173. Immigration, Race, and Identity in Contemporary France

Political Science Courses
POLI 139. Religion and Politics in the Developing World

POLI 142. Politics in the Middle East

POLI 192. Senior Seminar: Contemporary Politics of the Middle East

POLI 196. Senior Seminar: US Foreign Policy Towards the Middle East

Religious Studies Courses
RSOC 7. South and Southeast Asian Religious Traditions

RSOC 67. Film and Judaism

RSOC 81. Islam

RSOC 126. Sufi Islam and Christian Mysticism

RSOC 174. Jewish Philosophy: Athens and Jerusalem

RSOC 182. Shia Islam in the Contemporary World

RSOC 190. Islam: Reformation and Modernity

SCTR 19. Religions of the Book

SCTR 48.  Racializing Jesus

TESP 88. Hope and Prophetic Politics”

In this example, there is one minor, which is the minor in Arabic, Islamic, and Middle Eastern Studies. 

The course requirements are encoded as follows 
6@{min_unique_depts: 3, max_courses_from_one_dept: 3}(
4(ANTH156 | ANTH187 | ANTH188 | ARTH121 | ARTH164 | HIST120 | HIST144S | ARAB137 | ARAB171 | ARAB185 | ARAB199 | FREN114 | FREN173 | POLI139 | POLI142 | POLI192 | POLI196 | RSOC126 | RSOC174 | RSOC182 | RSOC190) & 
2(ARTH24 | ETHN180 | ARAB1 | ARAB2 | ARAB3 | ARAB21 | ARAB22 | ARAB23 | ARAB50 | RSOC7 | RSOC67 | RSOC81 | SCTR19 | SCTR48 | TESP88)).

In this case, we’re also using the department diversity operator (the @ symbol). The department diversity operator is an optional JSON string that comes after the bounds of the set, and has two (both optional) parameters: min_unique_depts, which is the minimum number of unique departments from which courses must be taken from the set; and max_courses_from_one_dept, which is the maximum number of courses that will count towards the requirement from one department. The requirement “No more than two courses may be counted for AIMES credit from the department in which a student majors” cannot be encoded with the department diversity operator, so it would be listed as an other requirement in this case. The requirement of 3 quarters of Arabic courses also goes under other requirements. The senior project substitution would be marked under other notes (not under other requirements).

A course range can be represented with two course codes separated by a dash. For example, ANTH100-199. The lower and upper bounds on a range are always inclusive, so ANTH100-199 represents all upper division courses. If a requirement said something like “One course from CSCI 183, 180, 168, or any other additional 4-5 unit upper-division CSCI course below 190” this could be represented as (CSCI183 | CSCI180 | CSCI168 | CSCI100-189). 

Sometimes, courses need to be excluded from a set (i.e. not count towards the lower bound), in this case, we can use the exclusion operator (!) at the end of the set to indicate this. If the previous example had said “Two courses from CSCI 183, 180, 168, or any other additional 4-5 unit upper-division CSCI course below 190, except CSCI 172 and CSCI170, and any course between CSCI 130-135” we could do 2((CSCI183 | CSCI180 | CSCI168 | CSCI100-189) & !(CSCI172 | CSCI170 | CSCI130-135)). Each element in the exclusionary list is separated by a comma. Notice that the lower bound goes on the outer set.

Note also: A lower division (sometimes called lower-level) course always has a number between 1 and 99 (inclusive), while upper division (sometimes called upper-level) courses always have a number between 100 and 199 (inclusive).
`;

const COURSE_REQS_BASIC_DESC =
  "A course requirements expression, represented through expressions that combine sets of courses and/or course ranges, the same as the one used for majors.";

export const CourseRequirements = z.string().describe(COURSE_REQS_DESC);

export const MajorMinorCourseRequirements = (isMajor) =>
  z
    .string()
    .describe(
      COURSE_REQS_DESC +
      ` ALSO, because this is for a ${isMajor ? "major" : "minor"
      }, this expression should NOT contain any emphasis requirements. Those should be in the emphasis object, if any.`
    );

export const UnitRequirements = z
  .array(CourseOrUnitRequirement)
  .describe(
    "Requirements on the number units of a certain type that must be taken, if applicable"
  );

export const OtherRequirements = z
  .array(OtherRequirement)
  .describe("Any other requirements that are not yet covered.");

export const OtherNotes = z
  .array(z.string())
  .describe(
    "Any other notes regarding the program. For example, students are actively encouraged to participate in research."
  );

export const Emphasis = z.object({
  name: z
    .string()
    .describe(
      "The name of the emphasis, but should not include the word 'emphasis'"
    ),
  description: z
    .string()
    .describe(
      "A summary/description of the emphasis, but do not include the specific courses that are required for the emphasis."
    ),
  appliesTo: z.enum(["Major", "Minor", "Other"]),
  nameOfWhichItAppliesTo: z
    .string()
    .describe(
      "The name of the major/minor or other entity that it applies to, should not include the word 'major' or 'minor'"
    ),
  departmentCode: z
    .string()
    .describe("The four-letter department code for the emphasis, like CSCI"),
  courseRequirementsExpression: z.string().describe(COURSE_REQS_BASIC_DESC),
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
      `The four-letter department code (same as described as for majors) for the minor, like CSCI. Note that some minors do not have a department, and the department code should be left blank. These types of minors only exist if the page is a non-department page (i.e., the header of the page doesn’t say 'Department of ...'). Instead, these minors come from smaller programs that have one or more directors/advisors, but not an entire department with professors.`
    ),
  description: z.string().describe("A summary/description of the minor"),
  requiresEmphasis: z
    .boolean()
    .describe(
      "Whether the minor requires an emphasis. If true, the student must take an emphasis as part of the minor. If false, an emphasis is optional, or there are no emphases available for the minor."
    ),
  courseRequirementsExpression: z.string().describe(
    COURSE_REQS_BASIC_DESC +
    `
    ALSO, because this is for a minor, this expression should NOT contain any emphasis requirements. Those should be in the emphasis object, if any.`
  ),
  unitRequirements: UnitRequirements,
  otherRequirements: OtherRequirement,
  otherNotes: OtherNotes,
});

export const Major = z.object({
  name: z
    .string()
    .describe(
      "The name of the major, but should not include the word 'major' or the degree type"
    ),
  departmentCode: z.string().describe(`
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
`),
  description: z.string().describe("A summary/description of the major"),
  requiresEmphasis: z
    .boolean()
    .describe(
      "Whether the major requires an emphasis. If true, the student must take an emphasis as part of the major. If false, an emphasis is optional, or there are no emphases available for the major."
    ),
  courseRequirementsExpression: MajorMinorCourseRequirements(true),
  unitRequirements: UnitRequirements,
  otherRequirements: OtherRequirement,
  otherNotes: OtherNotes,
});

export const Course = z
  .object({
    courseCode: CourseCode,
    name: z.string().describe("The full name of the course"),
    description: z.string().describe(`A description of the course. If this is a cross-listed course, and it has no description other than "See cross-listed course", then you can include the "See cross-listed course" as the description.`),
    numUnits: z.string().describe(`The number of units of the course, i.e. "4" or a range of units of the form <lower>-<upper>, if the number of units can vary. For example, "2-5". If not given put, "N/A"`),
    prerequisiteCourses: z
      .string()
      .describe(
        "A valid boolean-like expression of sets of courses, representing the prerequisite courses for the course. MUST ONLY HAVE A VALID EXPRESSION OF COURSE CODES AND COURSE RANGES AND NOT anything else, like any natural language (those should go in otherRequirements)"
      ),
    corequisiteCourses: z
      .string()
      .describe(
        "A valid boolean-like expression of sets of courses, representing the corequisite courses for the course. MUST ONLY HAVE A VALID EXPRESSION OF COURSE CODES AND COURSE RANGES AND NOT anything else, like any natural language (those should go in otherRequirements)"
      ),
    otherRequirements: OtherCourseRequirements,
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
        "If 'Other' is selected for the offering pattern, please specify here."
      ),
  })
  .describe("A course object.");

export const CoreCurriculumRequirement = z.object({
  requirementName: z
    .string()
    .describe("A short, descriptive name of the requirement"),
  requirementDescription: z
    .string()
    .describe("A summary/description of the requirement, e.g. goals of the requirement, learning objectives, etc."),
  appliesTo: z.string().describe(`The name of the program that this requirement applies to, potentially school and degree/major type, or "All" if it could apply to any program.
    Note the different schools:
    College of Arts and Sciences
    Leavey School of Business
    School of Engineering
    `),
  fulfilledBy: z.array(
    z.string().describe("A course code containing the 4-letter department code and a course number, with no space in-between and no leading zeroes for the course number, like CSCI163 or MATH14. Note that the course number can also include letters after it, such as in MATH14A")
  ).describe(`A list of course codes that fulfill this requirement, if applicable. This must be filled out even if the list is extensive. Or, if it is a general requirement with no specific courses, just put "N/A"`),
});

export const Pathway = z.object({
  name: z
    .string()
    .describe("The name of the pathway, but should not include the word 'pathway'"),
  description: z
    .string()
    .describe("A summary/description of the pathway"),
  associatedCourses: z
    .array(z.string().describe("A course code containing the 4-letter department code and a course number, with no space in-between and no leading zeroes for the course number, like CSCI163 or MATH14. Note that the course number can also include letters after it, such as in MATH14A"))
    .describe("A list of courses that are associated with the pathway"),
});

export const DepartmentOrProgramInfo = z.object({
  name: z
    .string()
    .describe(
      `The name of the department or program, should not include 'department' or 'program'.`
    ),
  description: z
    .string()
    .describe("A summary/description of the department or program"),
  majors: z.array(Major),
  minors: z.array(Minor),
  emphases: z.array(Emphasis),
  errors: z
    .array(z.string())
    .describe("Any errors that are encountered when parsing the page, or anything that could not be parsed into the format (maybe the format would not allow it)."),
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
  courses: z.array(Course).describe("The courses from the page--only the ones that have a full description, not merely referenced. Courses that are cross-listed as another course should be included."),
  errors: z
    .array(z.string())
    .describe("Any errors that are encountered when parsing the courses, or anything that could not be parsed into the format (maybe the format would not allow it). Please do explain."),
});

export const CoreCurriculumRequirements = z.object({
  requirements: z.array(CoreCurriculumRequirement).describe("The core curriculum requirements. Note that sequence requirements should be listed as separate requirements. For example, C&I 1 and 2 are separate. Also, even if a requirement differs between programs--even if it has the same name--there should be separate entries for each school. All requirements from the page MUST be included even if the page is very long."),
  errors: z
    .array(z.string())
    .describe("Any errors that are encountered when parsing the core curriculum requirements, or anything that could not be parsed into the format (maybe the format would not allow it). Please do explain."),
});
