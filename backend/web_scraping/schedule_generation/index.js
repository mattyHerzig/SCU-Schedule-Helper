import OpenAI from "openai";
import Excel from "exceljs";
import jsdom from "jsdom";
import { zodResponseFormat } from "openai/helpers/zod";
import {
  CourseCatalog,
  DepartmentInfo,
  PageSections,
  SchoolInfo,
} from "./models.js";
import fs from "fs";
import {
  EXTRACT_COURSES_PROMPT,
  EXTRACT_DEPT_INFO_PROMPT,
  EXTRACT_SCHOOL_INFO_PROMPT,
} from "./prompts.js";

const SCU_BULLETIN_URL = "https://www.scu.edu/bulletin/undergraduate/";
const RELEVANT_CHAPTERS = new Set([3, 4, 5, 6]);
const PageTypes = {
  SCHOOL_OVERVIEW: "schoolOverview",
  DEPARTMENT_OVERVIEW: "deptOverview",
};

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
      schoolOverviewPages.push(allLinks[0]);
      departmentOverviewPages.push(...allLinks.slice(1));
    }
  }
  for (const schoolPage of schoolOverviewPages) {
    await processBulletinChapterPage(schoolPage, PageTypes.SCHOOL_OVERVIEW);
  }
  for (const departmentPage of departmentOverviewPages) {
    await processBulletinChapterPage(
      departmentPage,
      PageTypes.DEPARTMENT_OVERVIEW,
    );
  }
}

async function processBulletinChapterPage(link, pageType) {
  const response = await fetch(link);
  const text = await response.text();
  const document = new jsdom.JSDOM(text).window.document;
  const mainContent = document.querySelector("main");
  let mainContentString = "";
  for (const child of mainContent.children) {
    if (child.classList.contains("plink")) {
      continue;
    } else mainContentString += recursivelyGetTextFromElement(child) + "\n";
  }
  if (pageType === PageTypes.DEPARTMENT_OVERVIEW) {
    const sections = breakPageIntoSectionsSimple(mainContentString);
    fs.writeFileSync("sections.json", JSON.stringify(sections, null, 2));
    console.log("Extracting data from department preamble");
    await extractDataFromPage(
      sections.departmentPreamble,
      EXTRACT_DEPT_INFO_PROMPT,
      zodResponseFormat(DepartmentInfo, "Department_Info"),
    );
    console.log("Extracting data from courses");
    for (let courseSection of sections.courses) {
      await extractDataFromPage(
        courseSection,
        EXTRACT_COURSES_PROMPT,
        zodResponseFormat(CourseCatalog, "Course_Catalog"),
        "gpt-4o-mini",
      );
    }
  } else {
    // console.log(mainContentString);
    await extractDataFromPage(
      mainContentString,
      EXTRACT_SCHOOL_INFO_PROMPT,
      zodResponseFormat(SchoolInfo, "School_Info"),
    );
  }
}

function breakPageIntoSectionsSimple(pageText) {
  let departmentPreamble = "";
  let courses = [];

  let indexOfLowerDivisionCourses = pageText.indexOf("Lower-Division Courses:");
  if (indexOfLowerDivisionCourses === -1)
    indexOfLowerDivisionCourses = pageText.indexOf("Lower-Division Courses");
  if (indexOfLowerDivisionCourses === -1)
    console.error(
      `Could not find lower division courses for pageText ${pageText}`,
    );

  departmentPreamble = pageText.substring(0, indexOfLowerDivisionCourses);
  while (indexOfLowerDivisionCourses !== pageText.length) {
    let nextLowerDivisionCourses = pageText.indexOf(
      "Lower-Division Courses:",
      indexOfLowerDivisionCourses + 1,
    );
    if (nextLowerDivisionCourses === -1)
      nextLowerDivisionCourses = pageText.indexOf(
        "Lower-Division Courses",
        indexOfLowerDivisionCourses + 1,
      );
    if (nextLowerDivisionCourses === -1)
      nextLowerDivisionCourses = pageText.length;
    courses.push(
      pageText.substring(indexOfLowerDivisionCourses, nextLowerDivisionCourses),
    );
    indexOfLowerDivisionCourses = nextLowerDivisionCourses;
  }
  return { departmentPreamble, courses };
}

async function extractDataFromPage(
  pageText,
  prompt,
  responseFormat,
  model = "gpt-4o",
) {
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
  if (prompt === EXTRACT_SCHOOL_INFO_PROMPT) {
    universityCatalog.schools.push(parsedData);
  }
  universityCatalog.courses.push(...(parsedData.courses ?? []));
  universityCatalog.requirements.push(...(parsedData.requirements ?? []));
  universityCatalog.majors.push(...(parsedData.majors ?? []));
  universityCatalog.minors.push(...(parsedData.minors ?? []));
  universityCatalog.emphases.push(...(parsedData.emphases ?? []));
  universityCatalog.errors.push(...(parsedData.errors ?? []));
  await writeCatalog();
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

startProcessing();
