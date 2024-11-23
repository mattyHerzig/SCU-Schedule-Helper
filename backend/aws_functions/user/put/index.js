import { updateCourses } from "./utils/updateCourses.js";
import { updatePersonal } from "./utils/updatePersonal.js";
import { updateInterestedSections } from "./utils/updateInterestedSections.js";
import { updatePreferences } from "./utils/updatePreferences.js";
import { updateFriends } from "./utils/updateFriends.js";
import { updateFriendRequests } from "./utils/updateFriendRequests.js";
import { handleWithAuthorization } from "./utils/authorization.js";
import { internalServerError, validResponse } from "./model.js";
import { badRequestResponse } from "./model.js";

export async function handler(event, context) {
  return await handleWithAuthorization(event, context, putUser);
}

export async function putUser(event, context, userId) {
  try {
    const body = JSON.parse(event.body);
    const updates = [];
    if (body.coursesTaken) {
      updates.push(updateCourses(userId, body.coursesTaken));
    }

    if (body.interestedSections) {
      updates.push(updateInterestedSections(userId, body.interestedSections));
    }

    if (body.personal) {
      updates.push(updatePersonal(userId, body.personal));
    }

    if (body.preferences) {
      updates.push(updatePreferences(userId, body.preferences));
    }

    if (body.friends) {
      updates.push(updateFriends(userId, body.friends));
    }

    if (body.friendRequests) {
      updates.push(updateFriendRequests(userId, body.friendRequests));
    }

    await Promise.all(updates);

    return validResponse("All actions processed successfully");
  } catch (error) {
    console.error(error);
    if(error.cause === 400) {
      return badRequestResponse(error.message);
    }
    if(error.cause === 500) {
      return internalServerError(error.message);
    }
    return internalServerError(
      "An error occurred while processing the request. Please contact support at swdean@scu.edu.",
    );
  }
}
