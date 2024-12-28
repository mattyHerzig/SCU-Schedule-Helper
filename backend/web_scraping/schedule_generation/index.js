import OpenAI from "openai";
import Excel from "exceljs";
import jsdom from "jsdom";
import { zodResponseFormat } from "openai/helpers/zod";
import { get_encoding } from "tiktoken";
import {
  CourseCatalog,
  CourseCatalogSchema,
  DepartmentInfo,
  DepartmentInfoSchema,
  SchoolInfo,
  SchoolInfoSchema,
  SpecialProgramInfo,
  SpecialProgramInfoSchema,
} from "./models.js";
import fs from "fs";
import {
  EXTRACT_COURSES_PROMPT,
  EXTRACT_DEPT_INFO_PROMPT,
  EXTRACT_SCHOOL_INFO_PROMPT,
  EXTRACT_SPECIAL_PROGRAM_INFO_PROMPT,
} from "./prompts.js";

const SCU_BULLETIN_URL = "https://www.scu.edu/bulletin/undergraduate/";
const RELEVANT_CHAPTERS = new Set([3, 4, 5, 6]);
const PageTypes = {
  SCHOOL: "school",
  DEPARTMENT: "dept",
  SPECIAL_PROGRAM: "specialProgram",
};

const gpt4oBatchRequestsFileName = `gpt_4o_requests_${Date.now()}.jsonl`;
let gpt4oBatchRequestFileStream = fs.createWriteStream(
  gpt4oBatchRequestsFileName,
  {
    flags: "a",
  },
);

const gpt4oMiniBatchRequestsFileName = `gpt_4o_mini_requests_${Date.now()}.jsonl`;
let gpt4oMiniBatchRequestFileStream = fs.createWriteStream(
  gpt4oMiniBatchRequestsFileName,
  {
    flags: "a",
  },
);

// const existingCatalog = JSON.parse(
//   fs.readFileSync("university_catalog.json", "utf8").toString(),
// ) || {
//   majors: [],
//   minors: [],
//   emphases: [],
//   requirements: [],
//   courses: [],
//   errors: [],
// };

const universityCatalog = {
  schools: [],
  majors: [],
  minors: [],
  emphases: [],
  specialPrograms: [],
  requirements: [],
  courses: [],
  errors: [],
  // ...existingCatalog,
};

const openAIClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function main() {
  const wb = new Excel.Workbook();
  await wb.xlsx.readFile("SCU_Find_Course_Sections.xlsx");
  const sheet = wb.getWorksheet("SCU Find Course Sections");
  const rows = sheet.getSheetValues();
  for (let i = 0; i < 30; i++) {
    console.log(rows[i]);
  }
  await wb.csv.writeFile("SCU_Find_Course_Sections.csv");
}

async function startProcessing() {
  await writeCatalog();
  await getAndProcessBulletinText();
}

async function writeCatalog() {
  fs.writeFileSync(
    "university_catalog.json",
    JSON.stringify(universityCatalog, null, 2),
  );
  console.log("File updated");
}

async function getAndProcessBulletinText() {
  const response = await fetch(SCU_BULLETIN_URL);
  const text = await response.text();
  const document = new jsdom.JSDOM(text).window.document;
  const sideBar = document.querySelector("#collapsibleNavbar");
  const chapters = sideBar.querySelectorAll("ul > li");
  const schoolOverviewPages = [];
  const departmentOverviewPages = [];
  const specialProgramPages = [];
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
      if (parseInt(chapterMatch[1]) === 6) {
        specialProgramPages.push(...allLinks);
        continue;
      }
      schoolOverviewPages.push(allLinks[0]);
      departmentOverviewPages.push(...allLinks.slice(1));
    }
  }
  for (const schoolPage of schoolOverviewPages) {
    await processBulletinChapterPage(schoolPage, PageTypes.SCHOOL);
  }
  for (const specialProgramPage of specialProgramPages) {
    await processBulletinChapterPage(
      specialProgramPage,
      PageTypes.SPECIAL_PROGRAM,
    );
  }
  for (const departmentPage of departmentOverviewPages) {
    await processBulletinChapterPage(departmentPage, PageTypes.DEPARTMENT);
  }
  gpt4oBatchRequestFileStream.end();
  gpt4oMiniBatchRequestFileStream.end();

  const gpt4oRequestsFile = await openAIClient.files.create({
    purpose: "batch",
    file: fs.createReadStream(gpt4oBatchRequestsFileName),
  });
  const gpt4oBatch = await openAIClient.batches.create({
    input_file_id: gpt4oRequestsFile.id,
    endpoint: "/v1/chat/completions",
    completion_window: "24h",
  });

  const gpt4oMiniRequestsFile = await openAIClient.files.create({
    purpose: "batch",
    file: fs.createReadStream(gpt4oMiniBatchRequestsFileName),
  });
  const gpt4oMiniBatch = await openAIClient.batches.create({
    input_file_id: gpt4oMiniRequestsFile.id,
    endpoint: "/v1/chat/completions",
    completion_window: "24h",
  });

  console.log(`Created gpt 4o input file ${gpt4oRequestsFile.id}`);
  console.log(`Created gpt 4o batch ${gpt4oBatch.id}`);
  console.log(`Created gpt 4o mini input file ${gpt4oMiniRequestsFile.id}`);
  console.log(`Created gpt 4o mini batch ${gpt4oMiniBatch.id}`);
}

function breakIntoChunks(fileName) {
  // Break into chunks of 90000 tokens or less, as that is the limit for GPT-4.
  const fileContents = fs.readFileSync(fileName, "utf-8").toString();
  const lines = fileContents.split("\n");
  let currentChunk = "";
  let currentChunkTokens = 0;
  let chunkNumber = 0;
  for (let line of lines) {
    const lineTokens = countTokens(line);
    if (currentChunkTokens + lineTokens > 90000) {
      fs.writeFileSync(`chunk_${chunkNumber}_${fileName}`, currentChunk);
      currentChunk = "";
      currentChunkTokens = 0;
      chunkNumber++;
    }
    currentChunk += line + "\n";
    currentChunkTokens += lineTokens;
  }
  fs.writeFileSync(`chunk_${chunkNumber}_${fileName}`, currentChunk);
}

function countTokens(text) {
  const enc = get_encoding("cl100k_base");
  return enc.encode(text).length;
}

async function processBulletinChapterPage(link, pageType) {
  const response = await fetch(link);
  const text = await response.text();
  const document = new jsdom.JSDOM(text).window.document;
  const mainContent = document.querySelector("main");
  let mainContentString = "";
  let insertCoursesIfNotPresent =
    !mainContent.textContent.includes("Lower-Division Courses") &&
    !mainContent.textContent.includes("Upper-Division Courses");
  for (const child of mainContent.children) {
    if (child.classList.contains("plink")) {
      continue;
    } else
      mainContentString +=
        recursivelyGetTextFromElement(child, insertCoursesIfNotPresent) + "\n";
    insertCoursesIfNotPresent =
      insertCoursesIfNotPresent &&
      !mainContentString.includes("Lower-Division Courses");
  }
  const sections = breakPageIntoSectionsSimple(
    mainContentString,
    pageType,
    link,
  );
  if (pageType === PageTypes.DEPARTMENT) {
    // fs.writeFileSync("sections.json", JSON.stringify(sections, null, 2));
    batchExtractDataFromPage(
      `DEPT_INFO_AT_${link}`,
      sections.preamble,
      EXTRACT_DEPT_INFO_PROMPT,
      zodResponseFormat(DepartmentInfo, "Department_Info"),
      gpt4oBatchRequestFileStream,
    );
  } else if (pageType === PageTypes.SCHOOL) {
    batchExtractDataFromPage(
      `SCHOOL_INFO_AT_${link}`,
      sections.preamble,
      EXTRACT_SCHOOL_INFO_PROMPT,
      zodResponseFormat(SchoolInfo, "School_Info"),
      gpt4oBatchRequestFileStream,
    );
  } else {
    batchExtractDataFromPage(
      `SPECIAL_PROGRAM_INFO_AT_${link}`,
      sections.preamble,
      EXTRACT_SPECIAL_PROGRAM_INFO_PROMPT,
      zodResponseFormat(SpecialProgramInfo, "Special_Program_Info"),
      gpt4oBatchRequestFileStream,
    );
  }
  for (let i = 0; i < sections.courses.length; i++) {
    const courseSection = sections.courses[i];
    batchExtractDataFromPage(
      `COURSES_SECTION_${i}_AT_${link}`,
      courseSection,
      EXTRACT_COURSES_PROMPT,
      zodResponseFormat(CourseCatalog, "Course_Catalog"),
      gpt4oMiniBatchRequestFileStream,
      "gpt-4o-mini",
    );
  }
}

function breakPageIntoSectionsSimple(pageText, pageType, pageLink) {
  let preamble = "";
  let courses = [];

  let indexOfCourses = findNextCoursesSection(pageText, 0);
  // if (indexOfCourses === pageText.length && pageType === PageTypes.DEPARTMENT)
  //   console.error(
  //     `Could not find lower division courses for pageText ${pageText.substring(
  //       0,
  //       20,
  //     )}`,
  //   );
  // if (indexOfCourses !== pageText.length && pageType !== PageTypes.DEPARTMENT)
  //   console.log(`Found courses section on non-department page ${pageLink}`);

  preamble = pageText.substring(0, indexOfCourses);
  while (indexOfCourses !== pageText.length) {
    let nextLowerDivisionCourses = pageText.indexOf(
      "Lower-Division Courses:",
      indexOfCourses + 1,
    );
    if (nextLowerDivisionCourses === -1)
      nextLowerDivisionCourses = pageText.indexOf(
        "Lower-Division Courses",
        indexOfCourses + 1,
      );
    if (nextLowerDivisionCourses === -1)
      nextLowerDivisionCourses = pageText.length;
    courses.push(pageText.substring(indexOfCourses, nextLowerDivisionCourses));
    indexOfCourses = nextLowerDivisionCourses;
  }
  return { preamble, courses };
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

function batchExtractDataFromPage(
  requestId = Date.now().toString(),
  pageText,
  prompt,
  responseFormat,
  batchFile,
  model = "gpt-4o",
) {
  batchFile.write(
    JSON.stringify({
      custom_id: requestId,
      method: "POST",
      url: "/v1/chat/completions",
      body: {
        model,
        messages: [
          {
            role: "system",
            content: prompt,
          },
          { role: "user", content: pageText },
        ],
        response_format: responseFormat,
        temperature: 0.2,
        top_p: 0.1,
      },
    }) + "\n",
  );
}

async function extractDataFromPage(
  pageText,
  prompt,
  responseFormat,
  model = "gpt-4o",
) {
  zodResponseFormat;
  const completion = await openAIClient.beta.chat.completions.parse({
    model,
    messages: [
      {
        role: "system",
        content: prompt,
      },
      { role: "user", content: pageText },
    ],
    response_format: responseFormat,
    temperature: 0.2,
    top_p: 0.1,
  });

  console.log(
    `Used ${completion.usage?.prompt_tokens} input tokens, and ${completion.usage?.completion_tokens} output tokens`,
  );
  const parsedData = completion.choices[0].message.parsed;
  universityCatalog.courses.push(...(parsedData.courses ?? []));
  universityCatalog.requirements.push(...(parsedData.requirements ?? []));
  universityCatalog.majors.push(...(parsedData.majors ?? []));
  universityCatalog.minors.push(...(parsedData.minors ?? []));
  universityCatalog.emphases.push(...(parsedData.emphases ?? []));
  universityCatalog.errors.push(...(parsedData.errors ?? []));
  if (prompt === EXTRACT_SCHOOL_INFO_PROMPT) {
    delete parsedData.courses;
    universityCatalog.schools.push(parsedData);
  }
  if (prompt === EXTRACT_SPECIAL_PROGRAM_INFO_PROMPT) {
    delete parsedData.courses;
    universityCatalog.specialPrograms.push(parsedData);
  }
  await writeCatalog();
}

function recursivelyGetTextFromElement(
  element,
  insertCoursesIfNotPresent = false,
) {
  if (!element.textContent.trim()) {
    return "";
  }
  if (element.children.length === 0) {
    return element.textContent;
  }
  if (element.tagName === "P" || element.tagName.match(/H\d/)) {
    // IF element is h3 and has a direct child with class .gdbold, then it is a course, and we should insert it.
    if (
      element.tagName === "H3" &&
      element.querySelector("span.gdbold") &&
      insertCoursesIfNotPresent
    ) {
      return "Lower-Division Courses" + "\n" + element.textContent + "\n";
    }
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

startProcessing();
