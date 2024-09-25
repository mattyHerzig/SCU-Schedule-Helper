import { authenticate, getWithCookies } from "./authentication.js";
import fs from "fs";
import dotenv from "dotenv";
import jsdom from "jsdom";

dotenv.config();

const LOGIN_TITLE = "<title>SCU Login";
const EVALUATIONS_URL = "https://www.scu.edu/apps/evaluations/";
const MAX_RETRIES = 1;
const REQUEST_INTERVAL_MS = 50;

const finishedTerms = new Set(
  fs.readFileSync("persistent_data/finished_terms.txt").toString().split("\n")
);
const existingPdfLinks = new Set(
  fs.readFileSync("persistent_data/pdf_links.txt").toString().split("\n")
);

const linksFile = fs.createWriteStream("persistent_data/pdf_links.txt", { flags: "a" });
const finishedTermsFile = fs.createWriteStream("persistent_data/finished_terms.txt", {
  flags: "a",
});

let termsWithinCutoff;

export default async function generateAllPdfLinks() {
  const schoolsAndTerms = await getSchoolsAndTerms();
  for (const term of schoolsAndTerms.terms) {
    if (
      finishedTerms.has(term) ||
      !termsWithinCutoff.has(term) ||
      (await termHasNoEvaluations(term))
    ) {
      console.log(`Term ${term} empty, not within cutoff, or already finished. Skipping...`);
      continue;
    }
    let pdfLinksForThisTerm = new Set();
    for (const school of schoolsAndTerms.schools) {
      for (let i = 0; i < 26; i++) {
        const queryResultsDoc = await fetchWithAuth(
          generateSearchLink(term, school, String.fromCharCode(97 + i))
        );
        addLinksFromQueryResults(queryResultsDoc, pdfLinksForThisTerm);
      }
    }
    console.log(`Finished getting links for term: ${term}`);
    // Links from each term are unique, so we can update the file now.
    writeToLinksFile(pdfLinksForThisTerm, term);
  }

  linksFile.end();
  finishedTermsFile.end();
}

async function termHasNoEvaluations(term) {
  let queryResultsDoc = await fetchWithAuth(generateSearchLink(term));
  return queryResultsDoc.querySelectorAll("tr>td>a").length === 0;
}

function addLinksFromQueryResults(queryResultsDoc, pdfLinks) {
  const resultLinks = queryResultsDoc.querySelectorAll("tr>td>a");
  for (let link of resultLinks) {
    if (link.href && link.href.trim()) pdfLinks.add(`${EVALUATIONS_URL}${link.href}`);
  }
}

function writeToLinksFile(pdfLinks, term) {
  for (let link of pdfLinks) {
    if (!existingPdfLinks.has(link)) {
      linksFile.write(`${link}\n`);
      existingPdfLinks.add(link);
    }
  }
  if (pdfLinks.size > 0) {
    finishedTermsFile.write(`${term}\n`);
  }
}

async function getSchoolsAndTerms() {
  const doc = await fetchWithAuth(EVALUATIONS_URL);
  const schoolElements = doc.querySelector("#school").children;
  let schools = [];
  for (let el of schoolElements) {
    if (el.value.trim() === "") continue;
    else schools.push(el.value.trim());
  }
  let termElements = doc.querySelector("#term").children;
  let terms = [];
  for (let el of termElements) {
    if (el.value.trim() === "") continue;
    else terms.push(el.value.trim());
  }
  const latest44Terms = terms.slice(0, 45);
  termsWithinCutoff = new Set(latest44Terms);
  console.log(`Got schools: ${schools}`);
  console.log(`Got terms within cutoff: ${latest44Terms}`);
  fs.writeFileSync("persistent_data/terms_within_cutoff.txt", latest44Terms.join("\n"));
  return { schools, terms };
}

function generateSearchLink(term, school = "", facultyFilter = "") {
  return `${EVALUATIONS_URL}?ds=1&searchq=&ds=2&term=${term}&school=${school}&faculty=${facultyFilter}&course=`;
}

async function fetchWithAuth(url, retryAttempts = MAX_RETRIES) {
  // Wait to prevent accidental DDoS.
  await new Promise((resolve) => setTimeout(resolve, REQUEST_INTERVAL_MS));
  const response = await getWithCookies(url);
  const responseText = await response.text();
  if (badAuthForQueryRequest(responseText)) {
    await authenticate();
    return fetchWithAuth(url, retryAttempts - 1);
  }
  return new jsdom.JSDOM(responseText).window.document;
}

function badAuthForQueryRequest(htmlResponse) {
  if (htmlResponse.includes(LOGIN_TITLE)) {
    console.log("Auth expired. Reauthenticating...");
    authenticate();
    return true;
  }
  return false;
}

function shouldIncreaseSearchGranularity(htmlDoc) {
  return htmlDoc.querySelector("#maxResultExceeded") !== null;
}
