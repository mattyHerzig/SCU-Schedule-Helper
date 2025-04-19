import OpenAI from "openai";
import jsdom from "jsdom";
import { zodResponseFormat } from "openai/helpers/zod";
import { get_encoding } from "tiktoken";
import {
  CourseCatalog,
  DepartmentOrProgramInfo,
  SchoolInfo,
  SpecialProgramInfo,
} from "./utils/models.js";
import fs from "fs";
import {
  EXTRACT_COURSES_PROMPT,
  EXTRACT_DEPT_INFO_PROMPT,
  EXTRACT_SCHOOL_INFO_PROMPT,
  EXTRACT_SPECIAL_PROGRAM_INFO_PROMPT,
} from "./utils/prompts.js";
import { DEPARTMENT_TOOLS } from "./utils/test_models.js";

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

const SCU_BULLETIN_URL = "https://www.scu.edu/bulletin/undergraduate";
const RELEVANT_CHAPTERS = new Set([
  BULLETIN_CHAPTERS.COLLEGE_OF_ARTS_AND_SCIENCES,
  BULLETIN_CHAPTERS.LEAVEY_SCHOOL_OF_BUSINESS,
  BULLETIN_CHAPTERS.SCHOOL_OF_ENGINEERING,
  BULLETIN_CHAPTERS.UNIVERSITY_PROGRAMS,
]);

const PageTypes = {
  SCHOOL: "school",
  DEPARTMENT: "dept",
  SPECIAL_PROGRAM: "specialProgram",
};

const mainBatchRequestsFileName = `./local_data/main_batch_requests_${Date.now()}.jsonl`;
let mainBatchRequestsFileStream;

const courseBatchRequestsFileName = `./local_data/courses_batch_requests_${Date.now()}.jsonl`;
let courseBatchRequestFileStream;

const DEFAULT_MODEL = "o4-mini";
const useSpecialModelForCourses = "";

const universityCatalog = {
  schools: [],
  deptsAndPrograms: [],
  specialPrograms: [],
  courses: [],
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
  await getAndProcessBulletinText(mode);
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
  // schoolOverviewPages = [];
  // departmentOverviewPages = [
  //   "https://www.scu.edu/bulletin/undergraduate/chapter-3-college-of-arts-and-sciences/gender-and-sexuality-studies.html#81c027c34540",
  // ];
  // specialProgramPages = [];
  for (const schoolPage of schoolOverviewPages) {
    await processBulletinChapterPage(schoolPage, PageTypes.SCHOOL, mode);
  }
  for (const specialProgramPage of specialProgramPages) {
    await processBulletinChapterPage(
      specialProgramPage,
      PageTypes.SPECIAL_PROGRAM,
      mode
    );
  }
  for (const departmentPage of departmentOverviewPages) {
    await processBulletinChapterPage(
      departmentPage,
      PageTypes.DEPARTMENT,
      mode
    );
  }

  if (mode === "batch") {
    await createBatches();
    mainBatchRequestsFileStream.end();
    if (useSpecialModelForCourses) courseBatchRequestFileStream.end();
  }
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

async function processBulletinChapterPage(link, pageType, mode) {
  const response = await fetch(link);
  const text = await response.text();
  const document = new jsdom.JSDOM(text).window.document;
  const mainContent = document.querySelector("main");
  let mainContentString = "";
  let mainContentClone = mainContent.cloneNode(true);
  isolateAndRemoveCourses(mainContent);
  for (const child of mainContent.children) {
    if (child.classList.contains("plink")) {
      // Skip links to other pages.
      continue;
    } else mainContentString += recursivelyGetTextFromElement(child) + "\n";
  }
  let coursesSectionText = "";
  for (const child of mainContentClone.children) {
    if (child.classList.contains("plink")) {
      // Skip links to other pages.
      continue;
    } else coursesSectionText += recursivelyGetTextFromElement(child) + "\n";
  }
  const courses = divideCourseSectionsText(coursesSectionText);
  if (pageType === PageTypes.DEPARTMENT) {
    const batchRequestId = (mode === "batch" && `DEPT_INFO_AT_${link}`) || null;
    // await extractDataFromPage(
    //   batchRequestId,
    //   mainContentString,
    //   EXTRACT_DEPT_INFO_PROMPT,
    //   zodResponseFormat(DepartmentOrProgramInfo, "Department_Or_Program_Info"),
    //   mainBatchRequestsFileStream
    // );
  } else if (pageType === PageTypes.SCHOOL) {
    const batchRequestId =
      (mode === "batch" && `SCHOOL_INFO_AT_${link}`) || null;
    // await extractDataFromPage(
    //   batchRequestId,
    //   mainContentString,
    //   EXTRACT_SCHOOL_INFO_PROMPT,
    //   zodResponseFormat(SchoolInfo, "School_Info"),
    //   mainBatchRequestsFileStream
    // );
  } else {
    const batchRequestId =
      (mode === "batch" && `SPECIAL_PROGRAM_INFO_AT_${link}`) || null;
    // await extractDataFromPage(
    //   batchRequestId,
    //   mainContentString,
    //   EXTRACT_SPECIAL_PROGRAM_INFO_PROMPT,
    //   zodResponseFormat(SpecialProgramInfo, "Special_Program_Info"),
    //   mainBatchRequestsFileStream
    // );
  }
  // const coursestxt = fs.createWriteStream("./local_data/courses.txt", {
  //   flags: "a",
  // });
  for (let i = 0; i < courses.length; i++) {
    const courseSection = courses[i];
    // coursestxt.write(courseSection + "\n\n\n--------------------\n\n\n");

    const batchRequestId =
      (mode === "batch" && `COURSE_INFO_${i}_AT_${link}`) || null;
    await extractDataFromPage(
      batchRequestId,
      courseSection,
      EXTRACT_COURSES_PROMPT,
      zodResponseFormat(CourseCatalog, "Course_Catalog"),
      mainBatchRequestsFileStream,
      useSpecialModelForCourses || DEFAULT_MODEL
    );
  }
}

async function extractDataFromPage(
  batchRequestId,
  pageText,
  prompt,
  responseFormat,
  batchFile,
  model = DEFAULT_MODEL
) {
  const requestBody = {
    model,
    messages: [
      {
        role: "system",
        content: prompt,
      },
      {
        role: "user",
        content: `Here is the page:
        <page>
        ${pageText}
        </page>`,
      },
    ],
    response_format: responseFormat,
    temperature: 1,
    // top_p: 0.1,
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
  if (prompt === EXTRACT_SCHOOL_INFO_PROMPT) {
    universityCatalog.schools.push(responseData);
  }
  if (prompt === EXTRACT_DEPT_INFO_PROMPT) {
    universityCatalog.deptsAndPrograms.push(responseData);
  }
  if (prompt === EXTRACT_SPECIAL_PROGRAM_INFO_PROMPT) {
    universityCatalog.specialPrograms.push(responseData);
  }
  await writeCatalog();
}

// An experimental version to test accuracy when using function calls (tools).
async function extractDataFromPageWithFunctionCalls(
  batchRequestId,
  pageText,
  prompt,
  responseFormat,
  batchFile,
  model = "gpt-4o"
) {
  const messages = [
    {
      role: "system",
      content: prompt,
    },
    {
      role: "user",
      content: `Here is the page:
      <page>
      ${pageText}
      </page>`,
    },
  ];
  const requestBody = {
    model,
    messages,
    temperature: 0,
    tools: DEPARTMENT_TOOLS,
    parallel_tool_calls: false,
    // top_p: 0.1,
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

  let completion = await openAIClient.chat.completions.create({
    ...requestBody,
  });

  console.log(JSON.stringify(completion.choices, null, 2));

  if (
    !(
      completion.choices[0].finish_reason === "tool_calls" &&
      completion.choices[0].message.tool_calls[0].function.name ===
        "save_department_or_program_info"
    )
  ) {
    // Console log the completion and respond to any tool calls.
    const toolCall = completion.choices[0].message.tool_calls?.[0];
    if (toolCall) {
      console.log(`made request to ${toolCall.function.name}`);
      console.log(JSON.stringify(toolCall.function, null, 2));
    }
  } else {
    console.log("went directly to save_department_or_program_info");
  }

  console.log(
    `Used ${completion.usage?.prompt_tokens} input tokens, and ${completion.usage?.completion_tokens} output tokens`
  );

  // const responseData = completion.choices[0].message.parsed;
  // universityCatalog.courses.push(...(responseData.courses ?? []));
  // universityCatalog.errors.push(...(responseData.errors ?? []));
  // if (prompt === EXTRACT_SCHOOL_INFO_PROMPT) {
  //   universityCatalog.schools.push(responseData);
  // }
  // if (prompt === EXTRACT_DEPT_INFO_PROMPT) {
  //   universityCatalog.deptsAndPrograms.push(responseData);
  // }
  // if (prompt === EXTRACT_SPECIAL_PROGRAM_INFO_PROMPT) {
  //   universityCatalog.specialPrograms.push(responseData);
  // }
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
    const expectedOutputTokens = countTokens(courses[i]); // Input/output tokens should be roughly the same.
    if (expectedOutputTokens > 15000) {
      let currentCourseDescription = "";
      let currentCourseTokens = 0;
      let currentSection = "";
      let currentSectionTokens = 0;
      const lines = courses[i].split("\n");
      for (let i = 0; i < lines.length; i++) {
        while (
          i < lines.length &&
          lines[i] &&
          !lines[i].match(/^\d{1,4}\. .*$/)
        ) {
          // Wait for the first line to be a course number and title.
          currentCourseDescription += lines[i] + "\n";
          currentCourseTokens += countTokens(lines[i]);
          i++;
        }
        if (currentCourseTokens + currentSectionTokens > 15000) {
          chunkedCourses.push(currentSection);
          currentSection = "";
          currentSectionTokens = 0;
          if (i < lines.length) currentCourseDescription = lines[i] + "\n";
          currentCourseTokens = countTokens(lines[i]);
        } else if (i < lines.length) {
          currentSection += currentCourseDescription;
          currentSectionTokens += currentCourseTokens;
          currentCourseDescription = lines[i] + "\n";
          currentCourseTokens = countTokens(lines[i]);
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
          `Course element with title ${course.textContent} has no next element with text content`
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
