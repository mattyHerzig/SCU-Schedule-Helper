import OpenAI from "openai";
import Excel from "exceljs";
import jsdom from "jsdom";
import { zodResponseFormat } from "openai/helpers/zod";
import { CourseCatalog, DepartmentInfo, PageSections } from "./models.js";
import fs from "fs";
import {
  EXTRACT_COURSES_PROMPT,
  EXTRACT_DEPT_INFO_PROMPT,
  EXTRACT_SECTIONS_PROMPT,
} from "./prompts.js";

const SCU_BULLETIN_URL = "https://www.scu.edu/bulletin/undergraduate/";
const RELEVANT_CHAPTERS = new Set([3, 4, 5, 6]);
const openAIClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
  majors: [],
  minors: [],
  emphases: [],
  requirements: [],
  courses: [],
  errors: [],
  // ...existingCatalog,
};

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
  const relevantLinks = [];
  for (const chapter of chapters) {
    const chapterString = chapter.textContent.toLowerCase();
    const chapterPattern = /chapter (\d+)/;
    const chapterMatch = chapterString.match(chapterPattern);
    if (chapterMatch && RELEVANT_CHAPTERS.has(parseInt(chapterMatch[1]))) {
      const links = chapter.querySelectorAll("a");
      for (let link of links) {
        if (link.href.startsWith(".")) {
          link.href = link.href.substring(1);
        }
        relevantLinks.push(SCU_BULLETIN_URL + link.href);
      }
    }
  }
  // console.log(`Need to process ${relevantLinks.length} pages`);
  await processBulletinChapterPage(relevantLinks[16]);
  // for (let link of relevantLinks) {
  //   await processBulletinChapterPage(link);
  // }
}

async function processBulletinChapterPage(link) {
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
  // console.log(`Extracting data from ${link}`);
  // console.log(mainContentString);
  // fs.writeFileSync("main_content.txt", mainContentString);
  // const sections = await breakPageIntoSections(mainContentString);

  const sections = breakPageIntoSectionsSimple(mainContentString);

  fs.writeFileSync("sections.json", JSON.stringify(sections, null, 2));

  console.log("Extracting data from department preamble");
  await extractDataFromPage(
    sections.departmentPreamble,
    EXTRACT_DEPT_INFO_PROMPT,
    zodResponseFormat(DepartmentInfo, "Department_Info"),
  );
  console.log("Extracting data from courses");
  // for (let courseSection of sections.courses) {
  //   await extractDataFromPage(
  //     courseSection,
  //     EXTRACT_COURSES_PROMPT,
  //     zodResponseFormat(CourseCatalog, "Course_Catalog"),
  //     "gpt-4o-mini",
  //   );
  // }
}

async function breakPageIntoSections(pageText) {
  const completion = await openAIClient.beta.chat.completions.parse({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: EXTRACT_SECTIONS_PROMPT,
      },
      { role: "user", content: pageText },
    ],
    response_format: zodResponseFormat(PageSections, "Page_Sections"),
    temperature: 0.2,
    top_p: 0.1,
  });

  console.log(JSON.stringify(completion.choices[0].message.parsed, null, 2));
  console.log(
    `Used ${completion.usage?.prompt_tokens} input tokens, and ${completion.usage?.completion_tokens} output tokens`,
  );
  fs.writeFileSync(
    "sections.json",
    JSON.stringify(completion.choices[0].message.parsed, null, 2),
  );
  return completion.choices[0].message.parsed;
}

function breakPageIntoSectionsSimple(pageText) {
  let departmentPreamble = "";
  let courses = [];

  let indexOfLowerDivisionCourses = pageText.indexOf("Lower-Division Courses:");
  departmentPreamble = pageText.substring(0, indexOfLowerDivisionCourses);
  while (indexOfLowerDivisionCourses !== pageText.length) {
    let nextLowerDivisionCourses = pageText.indexOf(
      "Lower-Division Courses:",
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

  // console.log(JSON.stringify(completion.choices[0].message.parsed, null, 2));
  console.log(
    `Used ${completion.usage?.prompt_tokens} input tokens, and ${completion.usage?.completion_tokens} output tokens`,
  );
  const parsedData = completion.choices[0].message.parsed;
  universityCatalog.courses.push(
    ...(parsedData.courses ? parsedData.courses : []),
  );
  universityCatalog.requirements.push(
    ...(parsedData.requirements ? parsedData.requirements : []),
  );
  universityCatalog.majors.push(
    ...(parsedData.majors ? parsedData.majors : []),
  );
  universityCatalog.minors.push(
    ...(parsedData.minors ? parsedData.minors : []),
  );
  universityCatalog.emphases.push(
    ...(parsedData.emphases ? parsedData.emphases : []),
  );
  universityCatalog.errors.push(
    ...(parsedData.errors ? parsedData.errors : []),
  );
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
