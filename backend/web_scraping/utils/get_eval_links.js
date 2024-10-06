import { authenticate, getWithCookies } from "./authentication.js";
import {
  evalsAndTerms,
  existingTerms,
  writeEvalsAndTerms,
  REQUEST_INTERVAL_MS,
  EVALUATIONS_URL,
  REQUEST_MAX_RETRIES,
} from "../main.js";
import { processEvalLinks } from "./download_evals.js";
import dotenv from "dotenv";
import jsdom from "jsdom";

dotenv.config();

const LOGIN_TITLE = "<title>SCU Login";

export let termsWithinCutoff;

export default async function getAndProcessNewEvals() {
  const schoolsAndTerms = await getSchoolsAndTerms();
  deleteExpiredEvals();
  let hadNonEmptyTerm = false;
  for (const term of schoolsAndTerms.terms) {
    if (existingTerms.has(term)) {
      hadNonEmptyTerm = true;
      console.log(`All PDFS from term ${term} have been downloaded already. Skipping...`);
      continue;
    } else if (!termsWithinCutoff.has(term)) {
      console.log(`Term ${term} is not within the cutoff. Skipping...`);
      continue;
    } else if (await termHasNoEvaluations(term)) {
      if (hadNonEmptyTerm) {
        evalsAndTerms.terms.push(term);
        console.log(
          `Term ${term} has no data (and will always have no data). Adding to finished terms and skipping...`
        );
        continue;
      }
      console.log(
        `Term ${term} is currently empty (but may have data in the future). Skipping for now...`
      );
      continue;
    }
    console.log("Getting eval links for term: " + term);
    hadNonEmptyTerm = true;
    let evalLinksForThisTerm = new Set();
    for (const school of schoolsAndTerms.schools) {
      for (let i = 0; i < 26; i++) {
        const queryResultsDoc = await fetchWithAuth(
          generateSearchLink(term, school, String.fromCharCode(97 + i))
        );
        addLinksFromQueryResults(queryResultsDoc, evalLinksForThisTerm);
      }
    }
    console.log(
      `Finished getting eval pdf links for term: ${term}.\nNow downloading and processing eval pdfs...`
    );
    await processEvalLinks(evalLinksForThisTerm, term);
    // Links from each term are unique, so we can update the file now.
    evalsAndTerms.terms.push(term);
    existingTerms.add(term);
    await writeEvalsAndTerms();
  }
  await writeEvalsAndTerms();
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
  console.log(`Using the latest 44 terms: ${latest44Terms}`);
  return { schools, terms };
}

function deleteExpiredEvals() {
  // Delete any expired terms.
  for (let i = 0; i < evalsAndTerms.terms.length; i++) {
    if (!termsWithinCutoff.has(evalsAndTerms.terms[i])) {
      console.log(
        `Detected expired term ${evalsAndTerms.terms[i]} within existing dataset. Deleting...`
      );

      evalsAndTerms.terms.splice(i, 1);
      i--;
    }
  }
  // Delete any expired evals.
  for (let i = 0; i < evalsAndTerms.evals.length; i++) {
    if (!termsWithinCutoff.has(evalsAndTerms.evals[i].term)) {
      evalsAndTerms.evals.splice(i, 1);
      i--;
    }
  }
}

function addLinksFromQueryResults(queryResultsDoc, evalLinks) {
  const resultLinks = queryResultsDoc.querySelectorAll("tr>td>a");
  for (let link of resultLinks) {
    if (link.href && link.href.trim()) evalLinks.add(`${EVALUATIONS_URL}${link.href}`);
  }
}

async function termHasNoEvaluations(term) {
  let queryResultsDoc = await fetchWithAuth(generateSearchLink(term));
  return queryResultsDoc.querySelectorAll("tr>td>a").length === 0;
}

function generateSearchLink(term, school = "", facultyFilter = "") {
  return `${EVALUATIONS_URL}?ds=1&searchq=&ds=2&term=${term}&school=${school}&faculty=${facultyFilter}&course=`;
}

async function fetchWithAuth(url, retryAttempts = REQUEST_MAX_RETRIES) {
  // Wait to prevent accidental DDoS.
  await new Promise((resolve) => setTimeout(resolve, REQUEST_INTERVAL_MS));
  const response = await getWithCookies(url);
  const responseText = await response.text();
  if (await badAuthForQueryRequest(responseText)) {
    return fetchWithAuth(url, retryAttempts - 1);
  }
  return new jsdom.JSDOM(responseText).window.document;
}

async function badAuthForQueryRequest(htmlResponse) {
  if (htmlResponse.includes(LOGIN_TITLE)) {
    console.log("Auth expired. Reauthenticating...");
    await authenticate(process.env.SCU_USERNAME, process.env.SCU_PASSWORD);
    return true;
  }
  return false;
}
