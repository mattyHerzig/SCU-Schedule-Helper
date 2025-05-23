import { updateCourses } from "./utils/updateCourses.js";
import { updatePersonal } from "./utils/updatePersonal.js";
import { updateInterestedSections } from "./utils/updateInterestedSections.js";
import { updatePreferences } from "./utils/updatePreferences.js";
import { updateFriends } from "./utils/updateFriends.js";
import { updateFriendRequests } from "./utils/updateFriendRequests.js";
import { handleWithAuthorization } from "./utils/authorization.js";
import { updateAcademicPrograms } from "./utils/updateAcademicPrograms.js";
import {
  internalServerError,
  validResponse,
  validResponseWithBody,
} from "./model.js";
import { badRequestResponse } from "./model.js";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { LambdaClient } from "@aws-sdk/client-lambda";
import { S3Client } from "@aws-sdk/client-s3";
import {
  sendFriendAndFriendRequestNotifications,
  sendProfileUpdateNotifications,
  sendSelfUpdateNotifications,
} from "./utils/notifications.js";

export const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_DDB_REGION,
});

export const lambdaClient = new LambdaClient({
  region: process.env.AWS_LAMBDA_REGION,
});

export const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION,
});

export const tableName = process.env.SCU_SCHEDULE_HELPER_DDB_TABLE_NAME;

export async function handler(event, context) {
  return await handleWithAuthorization(event, context, putUser);
}

async function putUser(event, context, userId) {
  try {
    const body = JSON.parse(event.body);
    const profileUpdates = [];
    const friendUpdates = [];
    if (body.coursesTaken) {
      profileUpdates.push(updateCourses(userId, body.coursesTaken));
    }

    if (body.interestedSections) {
      profileUpdates.push(
        updateInterestedSections(userId, body.interestedSections),
      );
    }

    if (body.academicPrograms) {
      profileUpdates.push(
        updateAcademicPrograms(
          userId,
          body.academicPrograms
        ),
      )
    }

    if (body.personal) {
      profileUpdates.push(updatePersonal(userId, body.personal));
    }

    if (body.preferences) {
      profileUpdates.push(updatePreferences(userId, body.preferences));
    }
    const updates = await Promise.all(profileUpdates);
    let presignedUploadUrl;
    for (const update of updates) {
      if (update && update.presignedUploadUrl) {
        presignedUploadUrl = update.presignedUploadUrl;
      }
    }
    await sendProfileUpdateNotifications(userId, body);

    if (body.friends) {
      friendUpdates.push(updateFriends(userId, body.friends));
    }

    if (body.friendRequests) {
      friendUpdates.push(updateFriendRequests(userId, body.friendRequests));
    }

    await Promise.all(friendUpdates);
    await Promise.all([
      sendFriendAndFriendRequestNotifications(userId, body),
      sendSelfUpdateNotifications(userId, body),
    ]);

    if (presignedUploadUrl) {
      return validResponseWithBody({
        message: "All actions processed successfully",
        presignedUploadUrl,
      });
    }
    return validResponse("All actions processed successfully");
  } catch (error) {
    console.error(error);
    if (error.cause === 400) {
      return badRequestResponse(error.message);
    }
    if (error.cause === 500) {
      return internalServerError;
    }
    return internalServerError;
  }
}
