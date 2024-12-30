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
  for (const filename of batchFilenames) {
    const data = fs.readFileSync(filename, "utf-8").toString();
    const lines = data.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line) {
        try {
          const result = JSON.parse(line);

          const data = JSON.parse(
            result.response.body.choices[0].message.content,
          );
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
            universityCatalog.courses.push(data.courses);
          }
        } catch (e) {
          console.error(`Error parsing line ${i} of ${filename}`);
          console.error(e);
        }
      }
    }
  }
  fs.writeFileSync(
    "./local_data/full_university_catalog.json",
    JSON.stringify(universityCatalog),
  );
}

mergeBatchResults(["batch_67705ff73d3081908ec6adaa2820d866_output.jsonl"]);
