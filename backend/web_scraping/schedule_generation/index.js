import OpenAI from "openai";
import jsdom from "jsdom";
import { zodResponseFormat } from "openai/helpers/zod";
import { get_encoding } from "tiktoken";
import {
  CourseCatalog,
  DepartmentInfo,
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

const SCU_BULLETIN_URL = "https://www.scu.edu/bulletin/undergraduate/";
const RELEVANT_CHAPTERS = new Set([3, 4, 5, 6]);

const PageTypes = {
  SCHOOL: "school",
  DEPARTMENT: "dept",
  SPECIAL_PROGRAM: "specialProgram",
};

const gpt4oBatchRequestsFileName = `./local_data/gpt_4o_requests_${Date.now()}.jsonl`;
let gpt4oBatchRequestFileStream;

const gpt4oMiniBatchRequestsFileName = `./local_data/gpt_4o_mini_requests_${Date.now()}.jsonl`;
let gpt4oMiniBatchRequestFileStream;

const usingGpt4oMini = false;

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
      "Usage: node --env-file=/path/to/.env index.js <mode>, where mode is one of 'batch' or 'local'",
    );
    return;
  }
  if (mode !== "batch") await writeCatalog();
  else {
    gpt4oBatchRequestFileStream = fs.createWriteStream(
      gpt4oBatchRequestsFileName,
      {
        flags: "a",
      },
    );
    if (usingGpt4oMini)
      gpt4oMiniBatchRequestFileStream = fs.createWriteStream(
        gpt4oMiniBatchRequestsFileName,
        {
          flags: "a",
        },
      );
  }
  await getAndProcessBulletinText(mode);
}

async function writeCatalog() {
  fs.writeFileSync(
    "./local_data/university_catalog.json",
    JSON.stringify(universityCatalog, null, 2),
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
    // continue;
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
      if (parseInt(chapterMatch[1]) === 6) {
        specialProgramPages.push(...allLinks);
        continue;
      }
      schoolOverviewPages.push(allLinks[0]);
      departmentOverviewPages.push(...allLinks.slice(1));
    }
  }
  // schoolOverviewPages = [];
  // departmentOverviewPages = [];
  // specialProgramPages = [];
  for (const schoolPage of schoolOverviewPages) {
    await processBulletinChapterPage(schoolPage, PageTypes.SCHOOL, mode);
  }
  for (const specialProgramPage of specialProgramPages) {
    await processBulletinChapterPage(
      specialProgramPage,
      PageTypes.SPECIAL_PROGRAM,
      mode,
    );
  }
  for (const departmentPage of departmentOverviewPages) {
    await processBulletinChapterPage(
      departmentPage,
      PageTypes.DEPARTMENT,
      mode,
    );
  }

  if (mode === "batch") {
    await createBatches();
    gpt4oBatchRequestFileStream.end();
    if (usingGpt4oMini) gpt4oMiniBatchRequestFileStream.end();
  }
}

async function createBatches() {
  const gpt4oRequestsFile = await openAIClient.files.create({
    purpose: "batch",
    file: fs.createReadStream(gpt4oBatchRequestsFileName),
  });
  const gpt4oBatch = await openAIClient.batches.create({
    input_file_id: gpt4oRequestsFile.id,
    endpoint: "/v1/chat/completions",
    completion_window: "24h",
  });

  console.log(`Created GPT-4o input file ${gpt4oRequestsFile.id}`);
  console.log(`Created GPT-4o batch ${gpt4oBatch.id}`);
  if (usingGpt4oMini) {
    const gpt4oMiniRequestsFile = await openAIClient.files.create({
      purpose: "batch",
      file: fs.createReadStream(gpt4oMiniBatchRequestsFileName),
    });
    const gpt4oMiniBatch = await openAIClient.batches.create({
      input_file_id: gpt4oMiniRequestsFile.id,
      endpoint: "/v1/chat/completions",
      completion_window: "24h",
    });

    console.log(`Created GPT-4o-mini input file ${gpt4oMiniRequestsFile.id}`);
    console.log(`Created GPT-4o-mini batch ${gpt4oMiniBatch.id}`);
  }
}

async function processBulletinChapterPage(link, pageType, mode) {
  const response = await fetch(link);
  const text = await response.text();
  const document = new jsdom.JSDOM(text).window.document;
  const mainContent = document.querySelector("main");
  let mainContentString = "";
  let coursesSectionText = isolateAndRemoveCourses(mainContent);
  for (const child of mainContent.children) {
    if (child.classList.contains("plink")) {
      continue;
    } else mainContentString += recursivelyGetTextFromElement(child) + "\n";
  }
  const courses = divideCourseSectionsText(coursesSectionText);
  if (pageType === PageTypes.DEPARTMENT) {
    const batchRequestId = (mode === "batch" && `DEPT_INFO_AT_${link}`) || null;
    await extractDataFromPage(
      batchRequestId,
      mainContentString,
      EXTRACT_DEPT_INFO_PROMPT,
      zodResponseFormat(DepartmentInfo, "Department_Or_Program_Info"),
      gpt4oBatchRequestFileStream,
    );
  } else if (pageType === PageTypes.SCHOOL) {
    const batchRequestId =
      (mode === "batch" && `SCHOOL_INFO_AT_${link}`) || null;
    await extractDataFromPage(
      batchRequestId,
      mainContentString,
      EXTRACT_SCHOOL_INFO_PROMPT,
      zodResponseFormat(SchoolInfo, "School_Info"),
      gpt4oBatchRequestFileStream,
    );
  } else {
    const batchRequestId =
      (mode === "batch" && `SPECIAL_PROGRAM_INFO_AT_${link}`) || null;
    await extractDataFromPage(
      batchRequestId,
      mainContentString,
      EXTRACT_SPECIAL_PROGRAM_INFO_PROMPT,
      zodResponseFormat(SpecialProgramInfo, "Special_Program_Info"),
      gpt4oBatchRequestFileStream,
    );
  }
  for (let i = 0; i < courses.length; i++) {
    const courseSection = courses[i];
    const batchRequestId =
      (mode === "batch" && `COURSE_INFO_${i}_AT_${link}`) || null;
    await extractDataFromPage(
      batchRequestId,
      courseSection,
      EXTRACT_COURSES_PROMPT,
      zodResponseFormat(CourseCatalog, "Course_Catalog"),
      gpt4oBatchRequestFileStream,
    );
  }
}

async function extractDataFromPage(
  batchRequestId,
  pageText,
  prompt,
  responseFormat,
  batchFile,
  model = "gpt-4o",
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
    temperature: 0,
    // top_p: 0.1,
  };

  if (batchRequestId) {
    batchFile.write(
      JSON.stringify({
        custom_id: batchRequestId,
        method: "POST",
        url: "/v1/chat/completions",
        body: { ...requestBody },
      }) + "\n",
    );
    return;
  }

  const completion = await openAIClient.beta.chat.completions.parse({
    ...requestBody,
  });

  console.log(
    `Used ${completion.usage?.prompt_tokens} input tokens, and ${completion.usage?.completion_tokens} output tokens`,
  );

  const responseData = completion.choices[0].message.parsed;
  universityCatalog.courses.push(...(responseData.courses ?? []));
  universityCatalog.errors.push(...(responseData.errors ?? []));
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

function divideCourseSectionsText(coursesText) {
  let courses = [];
  let indexOfCoursesSection = findNextCoursesSection(coursesText, 0);
  if (indexOfCoursesSection === coursesText.length && coursesText.trim()) {
    courses.push(coursesText);
  }
  while (indexOfCoursesSection !== coursesText.length) {
    let nextCoursesSection = findNextCoursesSection(
      coursesText,
      indexOfCoursesSection + 1,
    );
    courses.push(
      coursesText.substring(indexOfCoursesSection, nextCoursesSection),
    );
    indexOfCoursesSection = nextCoursesSection;
  }

  let chunkedCourses = [];
  for (let i = 0; i < courses.length; i++) {
    const expectedOutputTokens = countTokens(courses[i]);
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
    pageMainElement.querySelectorAll("h3 > span"),
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
          `Course element with title ${course.textContent} has no next or previous element`,
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
      coursesSectionText += course.nextElementSibling?.textContent + "\n\n";
      // Remove these elements from the DOM
      if (
        course.previousElementSibling?.tagName === "A" &&
        !course.previousElementSibling?.textContent.trim()
      ) {
        course.previousElementSibling?.remove();
      }
      course.nextElementSibling?.remove();
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
