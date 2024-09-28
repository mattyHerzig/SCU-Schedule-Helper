import { authenticate } from "./utils/authentication.js";
import generateAllPdfLinks from "./utils/generate_pdf_links.js";
import downloadPdfs from "./utils/download_pdfs.js";
import extractDataFromPdfs from "./utils/generate_json.js";
import dotenv from "dotenv";

dotenv.config();

export default async function main() {
  makeDirectoriesAndFiles();
  await authenticate(process.env.SCU_USERNAME, process.env.SCU_PASSWORD);
  // TODO: Ideally condense into one step, generate the link, download the pdf, and extract the data.
  await generateAllPdfLinks();
  await downloadPdfs();
  await extractDataFromPdfs();
}

function makeDirectoriesAndFiles() {
  if (!fs.existsSync("persistent_data")) {
    fs.mkdirSync("persistent_data");
  }
  if (!fs.existsSync("persistent_data/terms_within_cutoff.txt")) {
    fs.writeFileSync("persistent_data/terms_within_cutoff.txt", "");
  }
  if (!fs.existsSync("persistent_data/finished_terms.txt")) {
    fs.writeFileSync("persistent_data/finished_terms.txt", "");
  }
  if (!fs.existsSync("persistent_data/pdf_links.txt")) {
    fs.writeFileSync("persistent_data/pdf_links.txt", "");
  }
  if (!fs.existsSync("persistent_data/pdfs")) {
    fs.mkdirSync("persistent_data/pdfs");
  }
  if (!fs.existsSync("persistent_data/pdfs_evaluated.txt")) {
    fs.writeFileSync("persistent_data/pdfs_evaluated.txt", "");
  }
  if (!fs.existsSync("persistent_data/evals.json")) {
    fs.writeFileSync("persistent_data/evals.json", "");
  }
}

main();
