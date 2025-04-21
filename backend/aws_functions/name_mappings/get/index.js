import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { handleWithAuthorization } from "./utils/authorization.js";

import { getDataExpirationDate } from "./utils/dates.js";
import {
  internalServerError,
  notModifiedResponse,
  validResponse,
} from "./model.js";

const s3 = new S3Client({
  region: process.env.AWS_S3_REGION,
});

export async function handler(event, context) {
  return await handleWithAuthorization(
    event,
    context,
    handleGetNameMappingsRequest
  );
}

async function handleGetNameMappingsRequest(event, context, userId) {
  try {
    // Fetch the JSON file content from S3
    const ifModifiedSince = event.headers["if-modified-since"];
    const command = new GetObjectCommand({
      Bucket: process.env.SCU_SCHEDULE_HELPER_BUCKET_NAME,
      Key: process.env.PROFESSOR_NAME_MAPPINGS_JSON_OBJECT_KEY,
      ...(ifModifiedSince
        ? { IfModifiedSince: new Date(ifModifiedSince) }
        : {}),
    });
    const data = await s3.send(command);
    if (data.$metadata.httpStatusCode === 304) {
      return notModifiedResponse;
    }
    return validResponse(
      {
        "Last-Modified": data.LastModified?.toUTCString(),
      },
      {
        data: JSON.parse(await data.Body.transformToString()),
        // Deprecate soon.
        dataExpirationDate: getDataExpirationDate(),
      }
    );
  } catch (error) {
    if (error.$metadata && error.$metadata.httpStatusCode === 304) {
      return notModifiedResponse;
    }
    console.error(
      `INTERNAL: could not fetch name mappings JSON due to error ${error}`
    );
    return internalServerError;
  }
}
