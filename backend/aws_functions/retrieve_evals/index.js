import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getUserAuthorization, generateDataAccessToken } from "./utils/authorization.js";
import { getDataExpirationDate } from "./utils/dates.js";
import {
  unauthorizedErrorBody,
  internalServerErrorBody,
  validResponseBody,
} from "./utils/http_responses.js";

const s3 = new S3Client({
  region: process.env.AWS_S3_BUCKET_REGION,
});

export async function handler(event, context) {
  const userAuthorization = await getUserAuthorization(event);
  if (!userAuthorization.isAuthorized) return unauthorizedErrorBody(userAuthorization.authError);
  try {
    // Fetch the JSON file content from S3
    const command = new GetObjectCommand({
      Bucket: process.env.EVALS_BUCKET_NAME,
      Key: process.env.EVALS_JSON_OBJECT_KEY,
    });
    const data = await s3.send(command);
    return validResponseBody(
      generateDataAccessToken(userAuthorization.email),
      getDataExpirationDate(),
      JSON.parse(await data.Body.transformToString())
    );
  } catch (error) {
    console.error(`Error fetching JSON file: ${error}`);
    return internalServerErrorBody(error);
  }
}
