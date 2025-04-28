import { browser, page } from "../index.js";
import { parseCourseSectionsXlsx } from "./xlsx_to_csv.js";
import fs from "fs";

export async function getAndProcessCourseOfferings() {
  // Skip the "Remember this device" page.
  await page.waitForSelector('[data-automation-id="linkButton"]');
  const skipButton = await page.$('[data-automation-id="linkButton"]');
  await skipButton.click();
  await page.waitForNavigation({
    waitUntil: "load",
  });

  // Wait for the academic period search box to appear.
  await page.waitForSelector("input[placeholder='Search']");
  const searchBox = await page.$$("input[placeholder='Search']");
  await searchBox[0].click();
  await page.waitForSelector('[data-automation-label="Future Periods"]');

  // Select the academic period.
  await searchBox[0].type(process.env.ACADEMIC_PERIOD);
  await searchBox[0].press("Enter");
  await page.waitForSelector('input[type="checkbox"]');
  const checkbox = await page.$('input[type="checkbox"]');
  if(!checkbox) {
    console.error("Checkbox not found. Exiting.");
    return;
  }
  await checkbox.click();
  await page.waitForSelector('[data-automation-id="selectedItem"]');

  // Click out of the search box to close it.
  const header = await page.$('[data-automation-id="pageHeader"]');
  if(!header) {
    console.error("Header not found. Exiting.");
    return;
  }
  await header.click();

  // Click on the academic level search box.
  await searchBox[1].click();
  await page.waitForSelector('input[type="checkbox"]');

  await new Promise((resolve) => setTimeout(resolve, 1000));
  // Press down arrow four times to select undergraduate courses.
  await page.keyboard.press("ArrowDown");

  await new Promise((resolve) => setTimeout(resolve, 1000));
  await page.keyboard.press("ArrowDown");
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await page.keyboard.press("ArrowDown");
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");

  // Proceed to the next page.
  const okButton = await page.$('button[title="OK"]');
  await okButton.click();

  // Download and parse the course sections spreadsheet.
  await page.waitForSelector("[title='Export to Excel']");
  const exportToExcelButton = await page.$('[title="Export to Excel"]');
  await exportToExcelButton.click();
  await page.waitForSelector("button[title='Download']");
  const downloadButton = await page.$('button[title="Download"]');
  const client = await browser.target().createCDPSession();
  const curDirectory = process.cwd();
  await client.send("Browser.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: curDirectory,
    eventsEnabled: true,
  });
  await downloadButton.click();
  await waitForDownload(client);
  parseCourseSectionsXlsx(`${curDirectory}/SCU_Find_Course_Sections.xlsx`);

  // Clean up the downloaded file.
  fs.rmSync(`${curDirectory}/SCU_Find_Course_Sections.xlsx`);
}

async function waitForDownload(session) {
  return new Promise((resolve) => {
    session.on("Browser.downloadProgress", (e) => {
      if (e.state === "completed") {
        console.log("Successfully downloaded course section spreadsheet.");
        resolve();
      }
    });
  });
}
