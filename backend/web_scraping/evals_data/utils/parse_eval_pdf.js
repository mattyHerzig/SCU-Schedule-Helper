import { evalsAndTerms, existingEvaluations } from "../index.js";
import PDFParser from "pdf2json";

// If a course code is changed over time, we can map it here.
const COURSE_CODE_TRANSFORMATIONS = {
  COEN: "CSEN",
};

export async function extractEvalDataFromPdf(pdfBuffer, pdfName, term) {
  const pdfParser = new PDFParser(this, true);
  let parsingResolver;
  const finishedParsing = new Promise((resolver) => {
    parsingResolver = resolver;
  });

  pdfParser.on("pdfParser_dataError", (errData) => {
    console.error(`Received error parsing PDF${pdfName}${errData.parserError}`);
    parsingResolver();
  });
  pdfParser.on("pdfParser_dataReady", (pdfData) => {
    try {
      extractToJson(pdfParser.getRawTextContent(), pdfName, term);
    } catch (e) {
      console.error(`Error parsing eval PDF ${pdfName}: ${e}`);
    }
    // console.log(pdfParser.getRawTextContent());
    parsingResolver();
  });

  pdfParser.parseBuffer(pdfBuffer);
  await finishedParsing;
  pdfParser.removeAllListeners();
}

function extractToJson(rawPdfText, pdfName, term) {
  if (!rawPdfText.toLowerCase().includes("class climate evaluation")) {
    console.error(`PDF ${pdfName} is not an evaluation ${rawPdfText}`);
    return;
  }
  if (
    rawPdfText.includes(
      "The evaluation will not be displayed due to low response rate.",
    )
  )
    return;

  const firstPage = getFirstPage(rawPdfText);
  const lastPage = getLastPage(rawPdfText);
  const profName = getProfName(lastPage);
  const deptName = getDeptName(firstPage);
  const courseCode = getCourseCode(firstPage);
  const courseName = getCourseName(profName, lastPage);

  if (
    profName === null ||
    deptName === null ||
    courseCode === null ||
    courseName === null
  ) {
    console.error(
      `Could not find prof name (${profName}), dept name (${deptName}), course code (${courseCode}), or course name (${courseName}) for pdf ${pdfName}`,
    );
    return;
  }

  const qualityRating = getQualityRating(lastPage);
  if (qualityRating === null) {
    console.error(`Could not find quality rating for eval ${pdfName}`);
    return;
  }
  const difficultyRating = getDifficultyRating(lastPage);
  const workloadRating = getWorkloadRating(rawPdfText);
  if (difficultyRating === null || workloadRating === null) {
    const hasExtraItems = lastPage.includes("1.11");
    if (!hasExtraItems) {
      console.error(
        `Could not find difficulty or workload rating for eval ${pdfName}, even though it should exist.`,
      );
      return;
    }
  }

  const evaluation = {
    name: pdfName,
    term,
    profName,
    deptName,
    courseCode,
    courseName,
    qualityRating,
    difficultyRating,
    workloadRating,
  };

  evalsAndTerms.evals.push(evaluation);
  existingEvaluations.add(pdfName);
}

const FIRST_PAGE_BREAK = "----------------Page (0) Break----------------";
function getFirstPage(rawPdfText) {
  return rawPdfText.substring(0, rawPdfText.indexOf(FIRST_PAGE_BREAK));
}

const pageBreakPattern = /----------------Page \(\d+\) Break----------------/;
function getLastPage(rawPdfText) {
  const pageBreaks = rawPdfText.match(new RegExp(pageBreakPattern, "g"));
  const lastPageBreak = pageBreaks.pop();
  const secondLastPageBreak = pageBreaks.pop();
  return rawPdfText.substring(
    rawPdfText.indexOf(secondLastPageBreak) + secondLastPageBreak.length,
    rawPdfText.indexOf(lastPageBreak),
  );
}

function getProfName(lastPageText) {
  const profName = lastPageText.match(/Name of the instructor:(.*)/);
  return profName ? profName[1] : null;
}

function transformDeptName(deptName) {
  return COURSE_CODE_TRANSFORMATIONS[deptName] ?? deptName;
}

const oldCourseCodePattern = /\(([A-Z]+)([0-9]+[A-Z]*)-/;
const newCourseCodePattern = /\(([A-Z]+)_(.+)_\d+_\d+_.*\)/;

function getDeptName(firstPageText) {
  const oldMatch = firstPageText.match(oldCourseCodePattern);
  const newMatch = firstPageText.match(newCourseCodePattern);

  if (oldMatch) return transformDeptName(oldMatch[1]);
  else if (newMatch) return transformDeptName(newMatch[1]);
  else return null;
}

function getCourseCode(firstPageText) {
  const oldMatches = firstPageText.match(oldCourseCodePattern);
  const newMatches = firstPageText.match(newCourseCodePattern);
  if (oldMatches) return transformDeptName(oldMatches[1]) + oldMatches[2];
  else if (newMatches) return transformDeptName(newMatches[1]) + newMatches[2];
  else return null;
}

function getCourseName(profName, lastPageText) {
  if (profName === null) return null;
  profName = profName.replace("(", "\\(").replace(")", "\\)");
  const courseNamePattern = new RegExp(`${profName},(.*)`);
  const match = lastPageText.match(courseNamePattern);
  if (match) return match[1].trim();
  else return null;
}

const decimal = /(\d+\.?\d*)/;
function getQualityRating(lastPageText) {
  // On the last page, this will be items that have 1.x) and then something.
  const itemPattern = /1\.\d+\)/g;
  const qualityItems = lastPageText.match(itemPattern);
  let countQualityItems = 0;
  let totalQualityRating = 0;
  for (const item of qualityItems) {
    const itemIndex = lastPageText.indexOf(item);
    const avIndex = lastPageText.indexOf("av.=", itemIndex);
    const ratingMatch = lastPageText.substring(avIndex).match(decimal);
    totalQualityRating += parseFloat(ratingMatch[1]);
    countQualityItems++;
  }
  return countQualityItems ? totalQualityRating / countQualityItems : null;
}

function getDifficultyRating(lastPageText) {
  const difficultyItem = lastPageText.indexOf("2.2)");
  if (difficultyItem == -1) return null;
  const avgIndex = lastPageText.indexOf("av.=", difficultyItem);
  const lastPageFromAvg = lastPageText.substring(avgIndex);
  const difficultyRating = lastPageFromAvg.match(decimal);
  return difficultyRating ? parseFloat(difficultyRating[1]) : null;
}

const upTo1HourPattern = /0-1(\d+\.?\d*)%/;
const between2And3HoursPattern = /2-3(\d+\.?\d*)%/;
const between4And5HoursPattern = /4-5(\d+\.?\d*)%/;
const between6And7HoursPattern = /6-7(\d+\.?\d*)%/;
const between8And10HoursPattern = /8-10(\d+\.?\d*)%/;
const between11And14HoursPattern = /11-14(\d+\.?\d*)%/;
const over15HoursPattern = /15\+(\d+\.?\d*)%/;

function getWorkloadRating(rawPdfText) {
  const percentStudentsUpTo1Hour = rawPdfText.match(upTo1HourPattern);
  const percentStudentsBetween2And3Hours = rawPdfText.match(
    between2And3HoursPattern,
  );
  const percentStudentsBetween4And5Hours = rawPdfText.match(
    between4And5HoursPattern,
  );
  const percentStudentsBetween6And7Hours = rawPdfText.match(
    between6And7HoursPattern,
  );
  const percentStudentsBetween8And10Hours = rawPdfText.match(
    between8And10HoursPattern,
  );
  const percentStudentsBetween11And14Hours = rawPdfText.match(
    between11And14HoursPattern,
  );
  const percentStudentsOver15Hours = rawPdfText.match(over15HoursPattern);

  if (
    !percentStudentsUpTo1Hour ||
    !percentStudentsBetween2And3Hours ||
    !percentStudentsBetween4And5Hours ||
    !percentStudentsBetween6And7Hours ||
    !percentStudentsBetween8And10Hours ||
    !percentStudentsBetween11And14Hours ||
    !percentStudentsOver15Hours
  ) {
    return null;
  }

  let avgHours = (0.5 * parseFloat(percentStudentsUpTo1Hour[1])) / 100;
  avgHours += (2.5 * parseFloat(percentStudentsBetween2And3Hours[1])) / 100;
  avgHours += (4.5 * parseFloat(percentStudentsBetween4And5Hours[1])) / 100;
  avgHours += (6.5 * parseFloat(percentStudentsBetween6And7Hours[1])) / 100;
  avgHours += (9 * parseFloat(percentStudentsBetween8And10Hours[1])) / 100;
  avgHours += (12.5 * parseFloat(percentStudentsBetween11And14Hours[1])) / 100;
  avgHours += (15 * parseFloat(percentStudentsOver15Hours[1])) / 100;

  return avgHours;
}
