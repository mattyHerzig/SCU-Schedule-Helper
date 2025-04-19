import OpenAI from "openai";
import fs from "fs";

const universityCatalog = {
  schools: [],
  deptsAndPrograms: [],
  specialPrograms: [],
  courses: [],
  errors: [],
};

const openAIClient = new OpenAI(process.env.OPENAI_API_KEY);

async function checkBatchStatus(batch_id) {
  const batch = await openAIClient.batches.retrieve(batch_id);
  console.log(JSON.stringify(batch, null, 2));
}

async function deleteAllFiles() {
  const files = await openAIClient.files.list();
  console.log(JSON.stringify(files, null, 2));
  for (const file of files.data) {
    await openAIClient.files.del(file.id);
  }
}

function mergeBatchResults(batchFilenames) {
  const badLinks = new Set();
  for (const filename of batchFilenames) {
    universityCatalog.errors = [];
    const data = fs
      .readFileSync(`./local_data/${filename}`, "utf-8")
      .toString();
    const lines = data.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line) {
        try {
          const result = JSON.parse(line);

          const data = JSON.parse(
            result.response.body.choices[0].message.content
          );
          if (data === null) {
            console.log(result.response.body.choices[0].message.refusal);
            console.error(`Error parsing line ${i} of ${filename}`);
            console.log(
              result.custom_id.substring(result.custom_id.indexOf("AT_") + 3)
            );
            badLinks.add(
              result.custom_id.substring(result.custom_id.indexOf("AT_") + 3)
            );
            continue;
          }
          universityCatalog.errors.push(...(data.errors || []));
          delete data.errors;
          if (result.custom_id.includes("SCHOOL_INFO")) {
            universityCatalog.schools.push(data);
          }
          if (result.custom_id.includes("DEPT_INFO")) {
            universityCatalog.deptsAndPrograms.push(data);
          }
          if (result.custom_id.includes("SPECIAL_PROGRAM_INFO")) {
            universityCatalog.specialPrograms.push(data);
          }
          if (result.custom_id.includes("COURSE_INFO")) {
            // if courses already exist in the catalog, and have descriptions
            // do not let them be replaced, otherwise, allow them to be replaced
            const coursesThatCannotBeReplaced = universityCatalog.courses.filter(
              (course) => course.description
            );
            // filter to the courses that can be replaced 
            data.courses = data.courses.filter(
              (course) =>
                !coursesThatCannotBeReplaced.find(
                  (c) => c.courseCode === course.courseCode
                ) && course.description
            );
            universityCatalog.courses.push(...(data.courses || []));
            for (const course of data.courses) {
              if (!course?.description) {
                console.error(
                  `Course ${course.courseCode} is missing a description`
                );
                // console.log(result.custom_id.substring(result.custom_id.indexOf("AT_") + 3) + ",");
                badLinks.add(
                  result.custom_id.substring(
                    result.custom_id.indexOf("AT_") + 3
                  )
                );
              }
            }
          }
        } catch (e) {
          console.error(`Error parsing line ${i} of ${filename}`);
          console.error(e);
        }
      }
    }
  }
  console.log("Bad links: ", badLinks);
  fs.writeFileSync(
    "./local_data/full_university_catalog1.json",
    JSON.stringify(universityCatalog)
  );
  // makeSQLiteDB("full_university_catalog.json");
}

function getDeptCode(deptOrProgram) {
  return deptOrProgram.majors.length > 0
    ? deptOrProgram.majors[0].departmentCode
    : deptOrProgram.minors.length > 0
    ? deptOrProgram.minors[0].departmentCode
    : deptOrProgram.emphases.length > 0
    ? deptOrProgram.emphases[0].departmentCode
    : "";
}

mergeBatchResults(["batch_680405201870819093f880748ffbac11_output.jsonl"]);
