import OpenAI from "openai";
import { get_encoding, encoding_for_model } from "tiktoken";
import fs from "fs";
import { count } from "console";

const universityCatalog = {
  schools: [],
  majors: [],
  minors: [],
  emphases: [],
  specialPrograms: [],
  requirements: [],
  courses: [],
  errors: [],
  // ...existingCatalog,
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

function countTokens(text) {
  const enc = get_encoding("cl100k_base");
  console.log(`Text has ${enc.encode(text).length} tokens`);
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
          const {
            schools,
            majors,
            minors,
            emphases,
            specialPrograms,
            requirements,
            courses,
            errors,
          } = JSON.parse(result.response.body.choices[0].message.content);
          universityCatalog.schools.push(...(schools || []));
          universityCatalog.majors.push(...(majors || []));
          universityCatalog.minors.push(...(minors || []));
          universityCatalog.emphases.push(...(emphases || []));
          universityCatalog.specialPrograms.push(...(specialPrograms || []));
          universityCatalog.requirements.push(...(requirements || []));
          universityCatalog.courses.push(...(courses || []));
          universityCatalog.errors.push(...(errors || []));
        } catch (e) {
          console.error(`Error parsing line ${i} of ${filename}`);
          console.error(e);
        }
      }
    }
  }
  fs.writeFileSync(
    "university_catalog.json",
    JSON.stringify(universityCatalog),
  );
}

// countTokens(
//   fs
//     .readFileSync("chunk_0_gpt_4o_requests_1735329994541.jsonl", "utf-8")
//     .toString(),
// );
// checkBatchStatus("batch_676ee98e2c50819090f4342bb24effb5");

mergeBatchResults([
  "batch_676f0db4d8a88190a2b69525e93537d9_output.jsonl",
  "batch_676f0db2d0c88190a44670d75a80e0f6_output.jsonl",
]);
