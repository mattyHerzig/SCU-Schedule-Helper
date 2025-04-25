import OpenAI from "openai";
import fs from "fs";
 
//TODO: ADD src links to each object, add school name to the department/ program objects based on link
const universityCatalog = {
  schools: [],
  deptsAndPrograms: [],
  specialPrograms: [],
  courses: [],
  coreCurriculum: {
    requirements: [],
    pathways: [],
  },
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
            console.error(`Refusal on line ${i} of ${filename}, for ${result.custom_id.substring(result.custom_id.indexOf("AT_") + 3)}`);
            console.log(result.response.body.choices[0].message.refusal, "\n");
            badLinks.add(
              result.custom_id.substring(result.custom_id.indexOf("AT_") + 3)
            );
            continue;
          }
          universityCatalog.errors.push(...(data.errors || []));
          if (data.errors && data.errors.length > 0) {
            console.error(`Errors on line ${i} of ${filename}, for ${result.custom_id}`);
            console.error(data.errors, "\n");
            badLinks.add(
              result.custom_id.substring(result.custom_id.indexOf("AT_") + 3)
            );
          }
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
          if(result.custom_id.includes("CORE_CURRICULUM_INFO")) {
            universityCatalog.coreCurriculum.requirements.push(...(data.requirements || []));
          }
          if (result.custom_id.includes("PATHWAY_INFO")) {
            universityCatalog.coreCurriculum.pathways.push(data);
          }
        } catch (e) {
          console.error(`Error parsing line ${i} of ${filename}, for ${result.custom_id}`);
          console.error(e, "\n");
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

mergeBatchResults(["core_curriculum.jsonl", "courses.jsonl"]);
