import fs from "fs";
import OpenAI from "openai";
import jsdom from "jsdom";
import { zodResponseFormat } from "openai/helpers/zod";
import { get_encoding } from "tiktoken";
import {
  CoreCurriculumRequirements,
  CourseCatalog,
  DepartmentOrProgramInfo,
  Pathway,
  SchoolInfo,
  SpecialProgramInfo,
} from "./utils/models.js";
import {
  EXTRACT_CORE_CURRICULUM_INFO_PROMPT,
  EXTRACT_COURSES_PROMPT,
  EXTRACT_DEPT_INFO_PROMPT,
  EXTRACT_PATHWAY_INFO_PROMPT,
  EXTRACT_SCHOOL_INFO_PROMPT,
  EXTRACT_SPECIAL_PROGRAM_INFO_PROMPT,
} from "./utils/prompts.js";

const BULLETIN_CHAPTERS = Object.freeze({
  BULLETIN_OVERVIEW: 0,
  UNIVERSITY_MISSION: 1,
  LEARNING_RESOURCES: 2,
  COLLEGE_OF_ARTS_AND_SCIENCES: 3,
  LEAVEY_SCHOOL_OF_BUSINESS: 4,
  SCHOOL_OF_ENGINEERING: 5,
  UNIVERSITY_PROGRAMS: 6,
  UNDERGRADUATE_ADMISSIONS: 7,
  POLICIES_AND_REGULATIONS: 8,
  TUITION_AND_FEES: 9,
  HONOR_SOCIETIES_AND_AWARDS: 10,
});

const SCU_URL = "https://www.scu.edu";
const SCU_BULLETIN_URL = `${SCU_URL}/bulletin/undergraduate`;
const RELEVANT_CHAPTERS = new Set([
  BULLETIN_CHAPTERS.COLLEGE_OF_ARTS_AND_SCIENCES,
  BULLETIN_CHAPTERS.LEAVEY_SCHOOL_OF_BUSINESS,
  BULLETIN_CHAPTERS.SCHOOL_OF_ENGINEERING,
  BULLETIN_CHAPTERS.UNIVERSITY_PROGRAMS,
]);
// From empirical testing: if we allow more than ~4,000 tokens, the model
// complains that there is too much text to process.
const MAX_TOKENS_PER_SECTION = 3_500;
const DEFAULT_MODEL = "o4-mini";
const DEFAULT_REASONING_EFFORT = "medium";

const PATHWAYS_OVERVIEW_PAGE = "https://www.scu.edu/provost/core/integrations/pathways/pathway-listings--courses/"
const CORE_CURRICULUM_PAGES = [
  "https://www.scu.edu/provost/core/foundations/",
  "https://www.scu.edu/provost/core/explorations/",
  "https://www.scu.edu/provost/core/integrations/",
  "https://www.scu.edu/provost/core/integrations/pathways/guidelines-and-timeline/"
]

const PageTypes = {
  SCHOOL: "school",
  DEPARTMENT: "dept",
  SPECIAL_PROGRAM: "specialProgram",
  CORE_CURRICULUM: "coreCurriculum",
  PATHWAY: "pathway",
};

const PAGE_PARAMS = {
  [PageTypes.SCHOOL]: {
    name: "school",
    custom_id: "SCHOOL_INFO",
    prompt: EXTRACT_SCHOOL_INFO_PROMPT,
    responseFormat: zodResponseFormat(SchoolInfo, "School_Info"),
    model: DEFAULT_MODEL,
    reasoning_effort: "high",
  },
  [PageTypes.DEPARTMENT]: {
    name: "department",
    custom_id: "DEPT_INFO",
    prompt: EXTRACT_DEPT_INFO_PROMPT,
    responseFormat: zodResponseFormat(
      DepartmentOrProgramInfo,
      "Department_Or_Program_Info"
    ),
    model: DEFAULT_MODEL,
    reasoning_effort: "high",
  },
  [PageTypes.SPECIAL_PROGRAM]: {
    name: "specialProgram",
    custom_id: "SPECIAL_PROGRAM_INFO",
    prompt: EXTRACT_SPECIAL_PROGRAM_INFO_PROMPT,
    responseFormat: zodResponseFormat(
      SpecialProgramInfo,
      "Special_Program_Info"
    ),
    model: DEFAULT_MODEL,
    reasoning_effort: "high",
  },
  [PageTypes.CORE_CURRICULUM]: {
    name: "coreCurriculum",
    custom_id: "CORE_CURRICULUM_INFO",
    prompt: EXTRACT_CORE_CURRICULUM_INFO_PROMPT,
    responseFormat: zodResponseFormat(
      CoreCurriculumRequirements,
      "Core_Curriculum_Requirements"
    ),
    model: DEFAULT_MODEL,
    reasoning_effort: DEFAULT_REASONING_EFFORT,
  },
  [PageTypes.PATHWAY]: {
    name: "pathway",
    custom_id: "PATHWAY_INFO",
    prompt: EXTRACT_PATHWAY_INFO_PROMPT,
    responseFormat: zodResponseFormat(
      Pathway,
      "Pathway"
    ),
    model: DEFAULT_MODEL,
    reasoning_effort: DEFAULT_REASONING_EFFORT,
  },
}

const mainBatchRequestsFileName = `./local_data/main_batch_requests_${Date.now()}.jsonl`;
let mainBatchRequestsFileStream;

const courseBatchRequestsFileName = `./local_data/courses_batch_requests_${Date.now()}.jsonl`;
let courseBatchRequestFileStream;

const useSpecialModelForCourses = "";

const universityCatalog = {
  schools: [],
  deptsAndPrograms: [],
  specialPrograms: [],
  courses: [],
  coreCurriculum: {
    requirements: [],
    pathways: [],
  },
  errors: [],
};

const modes = ["batch", "local"];
const openAIClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function main() {
  const mode = process.argv[2];
  if (!modes.includes(mode)) {
    console.error(
      "Usage: node --env-file=/path/to/.env index.js <mode>, where mode is one of 'batch' or 'local'"
    );
    return;
  }
  if (mode !== "batch") await writeCatalog();
  else {
    mainBatchRequestsFileStream = fs.createWriteStream(
      mainBatchRequestsFileName,
      {
        flags: "a",
      }
    );
    if (useSpecialModelForCourses)
      courseBatchRequestFileStream = fs.createWriteStream(
        courseBatchRequestsFileName,
        {
          flags: "a",
        }
      );
  }
  await Promise.all([
    getAndProcessBulletinText(mode),
    // getAndProcessCoreCurriculumText(mode),
  ]);

  if (mode === "batch") {
    await createBatches();
    mainBatchRequestsFileStream.end();
    if (useSpecialModelForCourses) courseBatchRequestFileStream.end();
  }
}

async function writeCatalog() {
  if (!fs.existsSync("./local_data")) {
    fs.mkdirSync("./local_data");
  }
  if (!fs.existsSync("./local_data/university_catalog.json")) {
    fs.writeFileSync("./local_data/university_catalog.json", "{}");
  }
  fs.writeFileSync(
    "./local_data/university_catalog.json",
    JSON.stringify(universityCatalog, null, 2)
  );
  console.log("Catalog file updated");
}

async function getAndProcessBulletinText(mode) {
  const response = await fetch(SCU_BULLETIN_URL);
  const text = await response.text();
  const document = new jsdom.JSDOM(text).window.document;
  const sideBar = document.querySelector("#collapsibleNavbar");
  const chapters = sideBar.querySelectorAll("ul > li");
  let schoolOverviewPages = [];
  let departmentOverviewPages = [];
  let specialProgramPages = [];
  for (const chapter of chapters) {
    const chapterString = chapter.textContent.toLowerCase();
    const chapterPattern = /chapter (\d+)/;
    const chapterMatch = chapterString.match(chapterPattern);
    if (chapterMatch && RELEVANT_CHAPTERS.has(parseInt(chapterMatch[1]))) {
      const links = Array.from(chapter.querySelectorAll("a")).slice(1);
      const allLinks = [];
      for (let link of links) {
        if (link.href.startsWith(".")) {
          link.href = link.href.substring(1);
        }
        if (link.href.includes("centers-institutes-and-special-programs"))
          continue; // These pages don't have any relevant info.
        allLinks.push(SCU_BULLETIN_URL + link.href);
      }
      if (parseInt(chapterMatch[1]) === BULLETIN_CHAPTERS.UNIVERSITY_PROGRAMS) {
        specialProgramPages.push(...allLinks);
        continue;
      }
      schoolOverviewPages.push(allLinks[0]);
      departmentOverviewPages.push(...allLinks.slice(1));
    }
  }
  // Overrides for testing.
  // schoolOverviewPages = ["https://www.scu.edu/bulletin/undergraduate/chapter-5-school-of-engineering/undergraduate-degrees.html#54b1f7d6146d"];
  // departmentOverviewPages = [
  //   "https://www.scu.edu/bulletin/undergraduate/chapter-3-college-of-arts-and-sciences/music.html#98b1758c5b3d"
  // ];
  // specialProgramPages = [];

  await Promise.all(
    schoolOverviewPages.map((schoolPage) =>
      processPage(schoolPage, PageTypes.SCHOOL, mode)
    )
  );
  await Promise.all(
    departmentOverviewPages.map((departmentPage) =>
      processPage(
        departmentPage,
        PageTypes.DEPARTMENT,
        mode
      )
    )
  )
  await Promise.all(
    specialProgramPages.map((specialProgramPage) =>
      processPage(
        specialProgramPage,
        PageTypes.SPECIAL_PROGRAM,
        mode
      )
    )
  );
}

async function getAndProcessCoreCurriculumText(mode) {
  await Promise.all(
    CORE_CURRICULUM_PAGES.map((coreCurriculumPage) =>
      processPage(
        coreCurriculumPage,
        PageTypes.CORE_CURRICULUM,
        mode
      )
    )
  );
  const pathwaysPages = await getPathwaysPages();
  await Promise.all(
    pathwaysPages.map((pathwayPage) =>
      processPage(pathwayPage, PageTypes.PATHWAY, mode)
    )
  );
}


async function createBatches() {
  const requestsFile = await openAIClient.files.create({
    purpose: "batch",
    file: fs.createReadStream(mainBatchRequestsFileName),
  });
  const batch = await openAIClient.batches.create({
    input_file_id: requestsFile.id,
    endpoint: "/v1/chat/completions",
    completion_window: "24h",
  });

  console.log(`Created input file with id ${requestsFile.id}`);
  console.log(`Created batch with id ${batch.id}`);
  if (useSpecialModelForCourses) {
    const coursesRequestsFile = await openAIClient.files.create({
      purpose: "batch",
      file: fs.createReadStream(courseBatchRequestsFileName),
    });
    const coursesBatch = await openAIClient.batches.create({
      input_file_id: coursesRequestsFile.id,
      endpoint: "/v1/chat/completions",
      completion_window: "24h",
    });

    console.log(`Created courses input file ${coursesRequestsFile.id}`);
    console.log(`Created courses batch ${coursesBatch.id}`);
  }
}

async function processPage(link, pageType, mode) {
  const response = await fetch(link);
  const text = await response.text();
  const document = new jsdom.JSDOM(text).window.document;
  const mainContent = document.querySelector(pageType !== PageTypes.CORE_CURRICULUM ? "main" : "#content");
  let mainContentString = "";
  let mainContentClone = mainContent.cloneNode(true);
  isolateAndRemoveCourses(mainContent);
  for (const child of mainContent.children) {
    if (child.classList.contains("plink"))
      // Skip links to other pages.
      continue;
    else mainContentString += recursivelyGetTextFromElement(child) + "\n";
  }
  let coursesSectionText = "";
  // Core curriculum pages won't contain any courses.
  if (pageType !== PageTypes.CORE_CURRICULUM && pageType !== PageTypes.PATHWAY) {
    for (const child of mainContentClone.children) {
      if (child.classList.contains("plink"))
        continue;
      else coursesSectionText += recursivelyGetTextFromElement(child) + "\n";
    }
  }
  const courses = divideCourseSectionsText(coursesSectionText);
  const requests = []
  const batchRequestId = (mode === "batch" && `${PAGE_PARAMS[pageType].custom_id}_AT_${link}`) || null;
  requests.push(
    extractDataFromPage(
      batchRequestId,
      link,
      mainContentString,
      PAGE_PARAMS[pageType].prompt,
      PAGE_PARAMS[pageType].responseFormat,
      mainBatchRequestsFileStream,
      PAGE_PARAMS[pageType].model,
      PAGE_PARAMS[pageType].reasoning_effort
    )
  );
  // const coursestxt = fs.createWriteStream("./local_data/courses.txt");
  // if (pageType !== PageTypes.CORE_CURRICULUM && pageType !== PageTypes.PATHWAY)
  //   requests.push(
  //     courses.map((courseSection, i) => {
  //       const courseSectionText = courseSection.replace(/\n+/g, "\n");
  //       // coursestxt.write(courseSectionText + "\n\n\n--------------------\n\n\n");
  //       const batchRequestId =
  //         (mode === "batch" && `COURSE_INFO_${i}_AT_${link}`) || null;
  //       return extractDataFromPage(
  //         batchRequestId,
  //         link,
  //         courseSectionText,
  //         EXTRACT_COURSES_PROMPT,
  //         zodResponseFormat(CourseCatalog, "Course_Catalog"),
  //         useSpecialModelForCourses
  //           ? courseBatchRequestFileStream
  //           : mainBatchRequestsFileStream,
  //         useSpecialModelForCourses || DEFAULT_MODEL,
  //       );
  //     })
  //   );
  await Promise.all(requests);
}

async function extractDataFromPage(
  batchRequestId,
  pageLink,
  pageText,
  prompt,
  responseFormat,
  batchFile,
  model = DEFAULT_MODEL,
  reasoning_effort = "medium"
) {
  const requestBody = {
    model,
    reasoning_effort,
    messages: [
      {
        role: "system",
        content: prompt,
      },
      {
        role: "user",
        content: `Here is the page, which comes from the link ${pageLink}:
        <page>
        ${pageText}
        </page>`,
      },
    ],
    response_format: responseFormat,
    temperature: 1,
  };

  if (batchRequestId) {
    batchFile.write(
      JSON.stringify({
        custom_id: batchRequestId,
        method: "POST",
        url: "/v1/chat/completions",
        body: { ...requestBody },
      }) + "\n"
    );
    return;
  }

  const completion = await openAIClient.beta.chat.completions.parse({
    ...requestBody,
  });

  console.log(
    `Used ${completion.usage?.prompt_tokens} input tokens, and ${completion.usage?.completion_tokens} output tokens`
  );

  const responseData = completion.choices[0].message.parsed;
  universityCatalog.courses.push(...(responseData?.courses ?? []));
  universityCatalog.errors.push(...(responseData?.errors ?? []));
  if (responseData?.errors && responseData.errors.length > 0) {
    console.error(`Errors experienced on page ${pageLink}`);
  }
  switch (prompt) {
    case EXTRACT_SCHOOL_INFO_PROMPT:
      universityCatalog.schools.push(responseData);
      break;
    case EXTRACT_DEPT_INFO_PROMPT:
      universityCatalog.deptsAndPrograms.push(responseData);
      break;
    case EXTRACT_SPECIAL_PROGRAM_INFO_PROMPT:
      universityCatalog.specialPrograms.push(responseData);
      break;
    case EXTRACT_CORE_CURRICULUM_INFO_PROMPT:
      universityCatalog.coreCurriculum.requirements.push(...(responseData.requirements));
      break;
    case EXTRACT_PATHWAY_INFO_PROMPT:
      universityCatalog.coreCurriculum.pathways.push(responseData);
      break;
    default:
      break;
  }
  await writeCatalog();
}

function divideCourseSectionsText(coursesText) {
  let courses = [];
  let firstCourseSection = findNextCoursesSection(coursesText, 0);
  let indexOfCoursesSection = findNextCoursesSection(
    coursesText,
    firstCourseSection + 1
  );
  if (indexOfCoursesSection === coursesText.length && coursesText.trim()) {
    courses.push(coursesText);
  } else {
    courses.push(coursesText.substring(0, indexOfCoursesSection));
  }

  while (indexOfCoursesSection !== coursesText.length) {
    let nextCoursesSection = findNextCoursesSection(
      coursesText,
      indexOfCoursesSection + 1
    );
    courses.push(
      coursesText.substring(indexOfCoursesSection, nextCoursesSection)
    );
    indexOfCoursesSection = nextCoursesSection;
  }
  let chunkedCourses = [];
  for (let i = 0; i < courses.length; i++) {
    // Expected output tokens = input tokens, because the parsed
    // courses contain the same amount of info, roughly.
    const expectedOutputTokens = countTokens(courses[i]);
    if (expectedOutputTokens > MAX_TOKENS_PER_SECTION) {
      let currentSection = "";
      let currentSectionTokens = 0;
      const lines = courses[i].split("\n");
      for (let i = 0; i < lines.length; i++) {
        // Wait for a line with course number and title (i.e. a good place to split).
        while (
          i < lines.length &&
          !lines[i].match(/^\d{1,4}[A-Z]{0,2}\. .*$/)
        ) {
          // Otherwise, just keep adding lines.
          currentSection += lines[i] + "\n";
          currentSectionTokens += countTokens(lines[i]);
          i++;
        }
        // If we are at a good place to split, and we have gone over the limit, split.
        if (currentSectionTokens > MAX_TOKENS_PER_SECTION) {
          chunkedCourses.push(currentSection);
          currentSection = "";
          currentSectionTokens = 0;
          if (i < lines.length) {
            // Start a new section with the current line.
            currentSection = lines[i] + "\n";
            currentSectionTokens = countTokens(lines[i]);
          }
        }
        // We are at a good place to split, but we have not gone over the limit, so keep adding. 
        else if (i < lines.length) {
          currentSection += lines[i] + "\n";
          currentSectionTokens += countTokens(lines[i]);
        }
      }
      if (currentSection) chunkedCourses.push(currentSection);
    } else {
      chunkedCourses.push(courses[i]);
    }
  }
  return chunkedCourses;
}

function isolateAndRemoveCourses(pageMainElement) {
  const potentialCourses = Array.from(
    pageMainElement.querySelectorAll("h3 > span")
  );
  let coursesSectionText = "";
  const seenCourses = new Set();
  for (const potentialCourse of potentialCourses) {
    const course = potentialCourse.parentElement;
    if (
      (course.textContent.match(/^\d{1,4}[A-Z]{0,1}\. .*$/) ||
        course.textContent.match(/^[A-Z]{4} \d{1,4}\. .*$/) ||
        course.textContent.match(/^[A-Z]{4} \d{1,4}: .*$/)) &&
      !seenCourses.has(course.textContent)
    ) {
      if (!course.nextElementSibling || !course.previousElementSibling) {
        console.warn(
          `Course element with title ${course.textContent} has no next or previous element`
        );
      }
      // This is a course, add it to the list of courses
      // If the prev element is a section header for the course, add that too.
      let potentialHeading =
        course.previousElementSibling?.previousElementSibling;
      let numElementsTried = 0;

      while (
        numElementsTried < 6 &&
        potentialHeading &&
        potentialHeading.tagName !== "H2" &&
        !potentialHeading.textContent.includes("Courses") &&
        !potentialHeading.textContent.includes("Colloquim Course") // Edge case.
      ) {
        potentialHeading = potentialHeading.previousElementSibling;
        numElementsTried++;
      }

      if (
        potentialHeading &&
        ((potentialHeading.tagName === "H2" &&
          potentialHeading.textContent.includes("Courses")) ||
          potentialHeading.textContent.includes("Colloquim Course"))
      ) {
        coursesSectionText += potentialHeading.textContent + "\n\n";
        // Remove this element from the DOM
        potentialHeading.remove();
      }

      coursesSectionText += course.textContent + "\n";
      let numParagraphsTried = 0;
      let courseDescriptionElement = course.nextElementSibling;
      while (
        numParagraphsTried < 3 &&
        courseDescriptionElement.tagName === "P" &&
        courseDescriptionElement?.textContent?.trim() === ""
      ) {
        course.nextElementSibling?.remove();
        numParagraphsTried++;
        courseDescriptionElement = course.nextElementSibling;
      }
      if (
        !courseDescriptionElement ||
        courseDescriptionElement?.textContent?.trim() === "" ||
        courseDescriptionElement?.tagName !== "P"
      ) {
        console.warn(
          `Course element with title ${course.textContent} may not have a description.`
        );
      } else {
        coursesSectionText += courseDescriptionElement?.textContent + "\n\n";
        courseDescriptionElement?.remove();
      }
      // Remove these elements from the DOM
      if (
        course.previousElementSibling?.tagName === "A" &&
        !course.previousElementSibling?.textContent.trim()
      ) {
        course.previousElementSibling?.remove();
      }
      course.remove();
      seenCourses.add(course.textContent);
    }
  }
  return coursesSectionText;
}

function recursivelyGetTextFromElement(element) {
  if (!element.textContent.trim()) {
    return "";
  }
  if (element.children.length === 0) {
    return element.textContent;
  }
  if (element.tagName === "P" || element.tagName.match(/H\d/)) {
    return element.textContent + "\n";
  }
  if (element.tagName === "LI") {
    return "- " + element.textContent + "\n";
  }
  let text = "";
  for (let child of element.children) {
    const childText = recursivelyGetTextFromElement(child);
    if (childText.trim()) {
      text += childText + "\n";
    }
  }
  return text;
}

async function getPathwaysPages() {
  const response = await fetch(PATHWAYS_OVERVIEW_PAGE);
  const text = await response.text();
  const document = new jsdom.JSDOM(text).window.document;
  const links = Array.from(document.querySelectorAll("h4 > a"));
  return links.map((link) => SCU_URL + link.href);
}

function findNextCoursesSection(pageText, startIndex) {
  let nextCourses = pageText.indexOf("Lower-Division Courses:", startIndex);
  if (nextCourses === -1)
    nextCourses = pageText.indexOf("Lower-Division Courses", startIndex);
  if (nextCourses === -1)
    nextCourses = pageText.indexOf("Upper-Division Courses:", startIndex);
  if (nextCourses === -1)
    nextCourses = pageText.indexOf("Upper-Division Courses", startIndex);
  if (nextCourses === -1) nextCourses = pageText.length;
  return nextCourses;
}

function countTokens(text, approx = true) {
  if (approx) return text.length / 4;
  const enc = get_encoding("cl100k_base");
  return enc.encode(text).length;
}

main();
