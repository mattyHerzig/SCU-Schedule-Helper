import { GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { InvokeCommand } from "@aws-sdk/client-lambda";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { dynamoClient, lambdaClient, s3Client, tableName } from "../index.js";
import { getSetItems } from "./getSetOrMapItems.js";

export async function updatePersonal(userId, updateData) {
  let presignedUploadUrl;
  const updatedSubscriptions = await getSetItems(
    userId,
    "info#personal",
    "subscriptions",
  );
  if (updateData.name === "") {
    throw new Error("Name cannot be empty.", { cause: 400 });
  }
  if (updateData.photo) {
    if (!updateData.photo.size) {
      throw new Error("Photo size is required.", { cause: 400 });
    }
    updateData.photoUrl = getUserPhotoUrl(userId);
    if (updateData.photo.size > 10 * 1024 * 1024) {
      throw new Error("Photo must be less than 10MB.", { cause: 400 });
    }
    presignedUploadUrl = await createPresignedUrlWithClient(
      `u#${userId}/photo`,
      updateData.photo.size,
    );
  }
  if (updateData.photoUrl == "default") {
    updateData.photoUrl =
      "https://scu-schedule-helper.s3.us-west-1.amazonaws.com/default-avatar.jpg";
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
    throw new Error(
      `INTERNAL: Error updating personal info for user ${userId}`,
      {
        cause: 500,
      },
    );
  }
  if (presignedUploadUrl) {
    return { presignedUploadUrl };
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
    throw new Error(
      `INTERNAL: Error getting current user info for user ${userId}`,
      {
        cause: 500,
      },
    );
  }
  if (!currentUser.Item || !currentUser.Item.name || !currentUser.Item.name.S) {
    throw new Error(`Your account could not be found.`, { cause: 404 });
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
    throw new Error(`INTERNAL: Error updating name index for user ${userId}`, {
      cause: 500,
    });
  }
}

function getUserPhotoUrl(userId) {
  const photoKey = encodeURIComponent(`u#${userId}/photo`);
  return `https://${
    process.env.SCU_SCHEDULE_HELPER_BUCKET_NAME
  }.s3.amazonaws.com/${photoKey}`;
}

function createPresignedUrlWithClient(key, contentLength) {
  const command = new PutObjectCommand({
    Bucket: process.env.SCU_SCHEDULE_HELPER_BUCKET_NAME,
    Key: key,
    ContentType: "image/jpeg",
    ACL: "public-read",
    ContentLength: contentLength,
  });
  return getSignedUrl(s3Client, command, { expiresIn: 3600 });
}
