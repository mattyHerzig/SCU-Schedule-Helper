import { GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { InvokeCommand } from "@aws-sdk/client-lambda";
import { dynamoClient, lambdaClient, s3Client, tableName } from "../index.js";
import { getSetItems } from "./getSetOrMapItems.js";

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
  if (updateData.photoUrl || updateData.name) {
    await updateNameIndex(userId, updateData.name, updateData.photoUrl);
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

async function updateNameIndex(userId, newName, photoUrl) {
  const getCurrentUser = {
    TableName: tableName,
    Key: {
      pk: { S: `u#${userId}` },
      sk: { S: "info#personal" },
    },
  };
  const currentUser = await dynamoClient.send(
    new GetItemCommand(getCurrentUser),
  );
  if (currentUser.$metadata.httpStatusCode !== 200) {
    throw new Error(`Error getting current user info for user ${userId}`, {
      cause: 500,
    });
  }
  if (!currentUser.Item || !currentUser.Item.name || !currentUser.Item.name.S) {
    throw new Error(`user ${userId} not found`, { cause: 404 });
  }
  const currentName = currentUser.Item.name.S;
  const invokeNameIndexUpdater = {
    FunctionName: process.env.UPDATE_NAME_INDEX_FUNCTION_NAME,
    InvocationType: "Event",
    Payload: JSON.stringify({
      userId,
      currentName,
      newName,
      photoUrl,
    }),
  };
  const response = await lambdaClient.send(
    new InvokeCommand(invokeNameIndexUpdater),
  );
  if (response.$metadata.httpStatusCode !== 202) {
    throw new Error(`Error updating name index for user ${userId}`, {
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
