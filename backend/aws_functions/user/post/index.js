import { DynamoDBClient, GetItemCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
  validResponse,
  createdResponse,
  internalServerError,
  CreatedUserResponse,
  Profile,
  PublicInfo,
  badRequestResponse,
} from "./model.js";
import { handleWithAuthorization } from "./utils/authorization.js";

const DEFAULT_PHOTO_URL =
  "https://scu-schedule-helper.s3.us-west-1.amazonaws.com/default-avatar.png";
const maxAttempts = 5;
const retryMode = "standard";
const ddbRegion = process.env.AWS_DDB_REGION;
const s3Region = process.env.AWS_S3_REGION;
const tableName = process.env.SCU_SCHEDULE_HELPER_DDB_TABLE_NAME;
const dynamoDBClient = new DynamoDBClient({ ddbRegion, maxAttempts, retryMode });
const s3Client = new S3Client({ s3Region });

export async function handler(event, context) {
  return await handleWithAuthorization(event, context, handlePostUserRequest);
}

async function handlePostUserRequest(event, context, userId) {
  // Check that the request contains name, email, notification_id, and photo.
  const request = JSON.parse(event.body);
  if (!request.name || !request.notification_id) {
    const missingFields = [];
    if (!request.name) missingFields.push("name");
    if (!request.notification_id) missingFields.push("notification_id");
    return badRequestResponse(
      `missing required fields. Required fields: ${missingFields.join(", ")}.`
    );
  }

  // Check if the user already exists;
  try {
    if (await userAlreadyExists(userId)) {
      return validResponse({ message: `User already exists.` });
    }
  } catch (error) {
    console.error(error);
    return internalServerError(`error checking if user already exists.`);
  }

  // Upload the user's photo to S3, if they uploaded a photo.
  let photoURL = request.photo_url;
  if (!photoURL && request.photo) {
    try {
      photoURL = await uploadUserPhotoToS3(userId, request.photo);
    } catch (error) {
      console.error(error);
      return internalServerError(`error uploading profile photo to S3.`);
    }
  } else photoURL = DEFAULT_PHOTO_URL;

  // Add the user to the database.
  try {
    return await addUserToDatabase(userId, request.name, request.notification_id, photoURL);
  } catch (error) {
    console.error(error);
    return internalServerError(`error adding user to database.`);
  }
}

async function userAlreadyExists(userId) {
  const input = {
    Key: {
      pk: {
        S: `u#${userId}`,
      },
      sk: {
        S: "info#profile",
      },
    },
    TableName: tableName,
  };
  const command = new GetItemCommand(input);
  const response = await dynamoDBClient.send(command);
  if (response.$metadata.httpStatusCode !== 200) {
    throw new Error(
      `error checking if user already exists (received HTTP status code from DynamoDB: ${response.$metadata.httpStatusCode}).`
    );
  }
  return response.Item !== undefined;
}

async function uploadUserPhotoToS3(userId, base64EncodedPhoto) {
  const photoKey = `u#${userId}/photo`;
  const photoParams = {
    Bucket: process.env.SCU_SCHEDULE_HELPER_BUCKET_NAME,
    Key: photoKey,
    Body: Buffer.from(base64EncodedPhoto, "base64"),
    ContentType: "image/jpeg",
    ACL: "public-read",
  };
  const s3Response = await s3Client.send(new PutObjectCommand(photoParams));
  if (s3Response.$metadata.httpStatusCode !== 200) {
    throw new Error(
      `error uploading profile photo to S3 (received HTTP status code from S3: ${s3Response.$metadata.httpStatusCode}).`
    );
  }
  return `https://${
    process.env.SCU_SCHEDULE_HELPER_BUCKET_NAME
  }.s3.amazonaws.com/${photoKey.replace("#", "%23")}`;
}

async function addUserToDatabase(userId, name, notificationId, photoUrl) {
  const item = {
    pk: { S: `u#${userId}` },
    sk: { S: "info#profile" },
    name: { S: name },
    email: { S: `${userId}@scu.edu` },
    notification_ids: { SS: [notificationId] },
    photo_url: { S: photoUrl },
  };
  const putInput = {
    Item: item,
    TableName: tableName,
  };
  dynamoDBClient.send(new PutItemCommand(putInput));
  const dbResponse = await dynamoDBClient.send(new PutItemCommand(putInput));
  if (dbResponse.$metadata.httpStatusCode !== 200) {
    throw new Error(
      `error adding user to database (received HTTP status code from DynamoDB: ${dbResponse.$metadata.httpStatusCode}).`
    );
  }
  const createdUserProfile = new Profile(name, photoUrl, `${userId}@scu.edu`, notificationId);
  return createdResponse(new CreatedUserResponse(userId, new PublicInfo(createdUserProfile)));
}
