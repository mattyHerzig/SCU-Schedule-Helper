import { authenticate, getWithCookies } from "./authentication.js";
import fs from "fs";
import dotenv from "dotenv";
import jsdom from "jsdom";

const EVALS_LINK_PREFIX = "https://www.scu.edu/apps/evaluations/";
const REQUEST_INTERVAL_MS = 50;
const MAX_RETRIES = 1;
const DATA_PATH = "persistent_data";
const LINKS_FILE_NAME = "pdf_links.txt";
const LINKS_PATH = `${DATA_PATH}/${LINKS_FILE_NAME}`;
const ALL_LINKS = fs.readFileSync(LINKS_PATH).toString().split("\n");
const ALL_EXISTING_PDFS = new Set();

// Delete last part of the pdf name after "&viewEval"
fs.readdirSync(`${DATA_PATH}/pdfs`).forEach((pdf) => {
  const nameWithoutExtension = pdf.split(".pdf")[0];
  ALL_EXISTING_PDFS.add(nameWithoutExtension);
  ALL_EXISTING_PDFS.add(nameWithoutExtension.split("&viewEval")[0]);
});

const termsWithinCutoff = new Set(
  fs.readFileSync("persistent_data/terms_within_cutoff.txt").toString().split("\n")
);

dotenv.config();

function termIsWithinCutoff(link) {
  const term = link.match(/vtrm=(\w+)$/) ?? link.match(/vtrm=(\w+)&viewEval/);

  if (!term) {
    console.error(`Couldn't find term for link ${link}`);
    return false;
  }
  return termsWithinCutoff.has(term[1]);
}

export default async function downloadPdfs() {
  console.log("Downloading pdfs...");
  if (!fs.existsSync(`${DATA_PATH}/pdfs`)) {
    fs.mkdirSync(`${DATA_PATH}/pdfs`);
  }
  let i = 0;
  while (i < ALL_LINKS.length) {
    let link = ALL_LINKS[i++];
    let pdfName = link.split("/?").pop();
    if (!link.trim() || !termIsWithinCutoff(link) || ALL_EXISTING_PDFS.has(pdfName)) continue;
    const pdfPath = `${DATA_PATH}/pdfs/${pdfName}.pdf`;
    await fetchPdfWithAuth(pdfPath, link.trim());
  }
  console.log("Finished downloading pdfs!");
}

async function fetchPdfWithAuth(fileName, link, retryAttempts = MAX_RETRIES) {
  await new Promise((resolve) => setTimeout(resolve, REQUEST_INTERVAL_MS));
  if (retryAttempts < 0) {
    console.error(`Couldn't download pdf ${link} after multiple attempts.`);
    return null;
  }
  let response;
  try {
    response = await getWithCookies(link);
  } catch (e) {
    console.error(`Error fetching pdf ${link}: ${e}`);
    return null;
  }
  const responseText = await response.clone().text();

  if (isMultipleEvaluationsPage(responseText)) return;
  if (isBadResponse(response, responseText, link)) {
    await authenticate(process.env.SCU_USERNAME, process.env.SCU_PASSWORD);
    await fetchPdfWithAuth(fileName, link, retryAttempts - 1);
  } else {
    const pdfRaw = await response.arrayBuffer();
    fs.writeFileSync(fileName, Buffer.from(pdfRaw));
  }
}

function isBadResponse(response, responseText, link) {
  if (!response || !response.headers) {
    console.log(`No response or response headers for pdf ${link}. Retrying...`);
    return true;
  } else if (!response.headers.get("content-type").includes("application/pdf")) {
    console.log(
      `Bad content type ${response.headers.get(
        "content-type"
      )} for link ${link}, reauthenticating...`
    );
    return true;
  } else if (responseText.includes("SCU Login")) {
    console.error(`Bad auth for pdf ${link}. Reauthenticating...`);
  }
  return false;
}

function isMultipleEvaluationsPage(responseText) {
  if (!responseText.includes("Multiple evaluations were found for this course.")) return false;
  const doc = new jsdom.JSDOM(responseText).window.document;
  let links = [];
  doc.querySelectorAll("a").forEach((link) => {
    if (link.textContent.includes(".pdf")) links.push(EVALS_LINK_PREFIX + link.href);
  });
  ALL_LINKS.push(...links);
  console.log(`Got links from multiple evaluations page: ${links}`);
  return true;
}

function deleteBadPdfs() {
  // Clear any file that contains <html tags.
  console.log("Deleting bad pdfs...");
  const pdfs = fs.readdirSync(`${DATA_PATH}/pdfs`);
  for (let pdf of pdfs) {
    const content = fs.readFileSync(`${DATA_PATH}/pdfs/${pdf}`).toString();
    if (content.includes("</html>") || content.includes("</body>")) {
      console.log(`Deleting bad pdf ${pdf}`);
      fs.unlinkSync(`${DATA_PATH}/pdfs/${pdf}`);
    }
  }
}
