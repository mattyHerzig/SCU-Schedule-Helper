import { UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { dynamoClient, s3Client, tableName } from "../index.js";
import { getSetItems } from "./getSetItems.js";
import { PutObjectCommand } from "@aws-sdk/client-s3";

export async function updatePersonal(userId, updateData) {
  const updatedSubscriptions = await getSetItems(
    userId,
    "info#personal",
    "subscriptions",
  );

  if (updateData.photo) {
    updateData.photoUrl = await uploadUserPhotoToS3(userId, updateData.photo);
  }
  if (updateData.photoUrl == "default") {
    updateData.photoUrl =
      "https://scu-schedule-helper.s3.us-west-1.amazonaws.com/default-avatar.png";
  }

  if (updateData.subscriptions && Array.isArray(updateData.subscriptions)) {
    updateData.subscriptions.forEach((subscription) =>
      updatedSubscriptions.add(subscription),
    );
  }

  let updateExpression = "SET ";
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  const attributes = ["name", "photoUrl", "subscriptions"];

  attributes.forEach((attribute) => {
    if (updateData[attribute]) {
      updateExpression += `#${attribute} = :${attribute}, `;
      expressionAttributeNames[`#${attribute}`] = attribute;
      expressionAttributeValues[`:${attribute}`] =
        attribute === "subscriptions"
          ? { SS: Array.from(updatedSubscriptions) }
          : { S: updateData[attribute] };
    }
  });

  if (updateExpression === "SET ") {
    throw new Error("No valid fields to update.", { cause: 400 });
  }

  updateExpression = updateExpression.slice(0, -2); // Remove trailing comma and space.

  const updatePersonalInfo = {
    TableName: tableName,
    Key: {
      pk: { S: `u#${userId}` },
      sk: { S: "info#personal" },
    },
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: "ALL_NEW",
  };

  const result = await dynamoClient.send(
    new UpdateItemCommand(updatePersonalInfo),
  );
  if (result.$metadata.httpStatusCode !== 200) {
    throw new Error(`Error updating personal info for user ${userId}`, {
      cause: 500,
    });
  }
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
    console.error(`Error uploading profile photo to S3: ${s3Response}`);
    throw new Error(`could not upload user profile photo`, { cause: 500 });
  }
  return `https://${
    process.env.SCU_SCHEDULE_HELPER_BUCKET_NAME
  }.s3.amazonaws.com/${photoKey.replace("#", "%23")}`;
}
