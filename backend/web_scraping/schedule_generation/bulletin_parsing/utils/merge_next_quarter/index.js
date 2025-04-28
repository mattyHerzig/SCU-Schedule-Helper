import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { authenticate } from "./utils/authentication.js";
import { getAndProcessCourseOfferings } from "./utils/workday.js";

export const FIND_COURSE_SECTIONS_URL =
  "https://www.myworkday.com/scu/d/task/1422$3915.htmld";
export const REQUEST_INTERVAL_MS = 50;
export const REQUEST_MAX_RETRIES = 1;
export const browser = await puppeteer.launch({
  args: [],
  headless: false,
});
export const page = await browser.newPage();
export let nextQuarterOfferings = {};

const CATALOG_FILENAME = "../../local_data/full_university_catalog_v2.json";
const catalog = JSON.parse(
  fs.readFileSync(path.resolve(CATALOG_FILENAME), "utf-8")
);

export default async function main() {
  console.log(
    `Attempting to merge course data into catalog with data from term: ${process.env.ACADEMIC_PERIOD}`
  );
  try {
    await authenticate(process.env.SCU_USERNAME, process.env.SCU_PASSWORD);
    await getAndProcessCourseOfferings();
    await writeCourseOfferings();
  } catch (e) {
    console.error("Encountered error:", e);
  } finally {
    browser.close();
  }
}

async function writeCourseOfferings() {
  for (const [key, value] of Object.entries(nextQuarterOfferings)) {
    catalog.courses = catalog.courses.map((course) => {
      if (course.courseCode === key) {
        course.nextQuarterOfferings = value;
      }
      return course;
    }
    )
  }
  for (const course of catalog.courses) {
    if (!course.nextQuarterOfferings) {
      course.nextQuarterOfferings = [];
    }
  }
  fs.writeFileSync(
    path.resolve(CATALOG_FILENAME),
    JSON.stringify(catalog, null, 2)
  );
  console.log("Successfully wrote course offerings to catalog.");
}
main();
