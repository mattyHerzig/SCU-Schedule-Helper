import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getDataExpirationDate } from "./utils/dates.js";
import { handleWithAuthorization } from "./utils/authorization.js";
import { internalServerError, validResponse } from "./model.js";

const s3 = new S3Client({
  region: process.env.AWS_S3_REGION,
});

export async function handler(event, context) {
  return await handleWithAuthorization(event, context, handleGetEvalsRequest);
}

async function handleGetEvalsRequest(event, context, userId) {
  try {
    // Fetch the JSON file content from S3
    const command = new GetObjectCommand({
      Bucket: process.env.SCU_SCHEDULE_HELPER_BUCKET_NAME,
      Key: process.env.AGGREGATE_EVALS_JSON_GZ_OBJECT_KEY,
    });
    const data = await s3.send(command);
    return validResponse({
      dataExpirationDate: getDataExpirationDate(),
      data: Buffer.from(await data.Body.transformToByteArray()).toString(
        "base64",
      ),
    });
  } catch (error) {
    console.error(`INTERNAL: could not fetch evals JSON due to error ${error}`);
    return internalServerError;
  }
}
