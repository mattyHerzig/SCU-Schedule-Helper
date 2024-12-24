import OpenAI from "openai";
import Excel from "exceljs";
import jsdom from "jsdom";
import { zodResponseFormat } from "openai/helpers/zod";
import { EXTRACT_DATA_PROMPT, UniversityCatalog } from "./models.js";
import fs from "fs";

const SCU_BULLETIN_URL = "https://www.scu.edu/bulletin/undergraduate/";
const RELEVANT_CHAPTERS = new Set([3, 4, 5, 6]);
const openAIClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const universityCatalog = {
  majors: [],
  minors: [],
  emphases: [],
  requirements: [],
  courses: [],
  errors: [],
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
  await extractDataFromPage(mainContentString);
}

async function extractDataFromPage(pageText) {
  const completion = await openAIClient.beta.chat.completions.parse({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: EXTRACT_DATA_PROMPT,
      },
      { role: "user", content: pageText },
    ],
    response_format: zodResponseFormat(UniversityCatalog, "University_Catalog"),
    temperature: 0.2,
    top_p: 0.1,
  });

  console.log(JSON.stringify(completion.choices[0].message.parsed, null, 2));
  console.log(
    `Used ${completion.usage?.prompt_tokens} input tokens, and ${completion.usage?.completion_tokens} output tokens`,
  );
  const parsedData = completion.choices[0].message.parsed;
  universityCatalog.courses.push(...parsedData.courses);
  universityCatalog.requirements.push(...parsedData.requirements);
  universityCatalog.majors.push(...parsedData.majors);
  universityCatalog.minors.push(...parsedData.minors);
  universityCatalog.emphases.push(...parsedData.emphases);
  universityCatalog.errors.push(...parsedData.errors);
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
