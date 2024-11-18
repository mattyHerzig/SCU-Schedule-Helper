import { updateCourses } from "./utils/updateCourses.js";
import { updatePersonal } from "./utils/updatePersonal.js";
import { updateInterestedSections } from "./utils/updateInterestedSections.js";
import { updatePreferences } from "./utils/updatePreferences.js";
import { friends } from "./utils/friends.js";
import { friendRequests } from "./utils/friendRequests.js";
import { handleWithAuthorization } from "./utils/authorization.js";
import { internalServerError, validResponse } from "./model.js";

export async function handler(event, context) {
  return await handleWithAuthorization(event, context, putUser);
}

export async function putUser(event, context, userId) {
  try {
    const body = JSON.parse(event.body);

    if (body.coursesTaken) {
      await updateCourses(userId, body.coursesTaken);
    }

    if (body.interestedSections) {
      await updateInterestedSections(
        userId,
        body.interestedSections,
      );
    }

    if (body.personal) {
      await updatePersonal(userId, body.personal);
    }

    if (body.preferences) {
      await updatePreferences(userId, body.preferences);
    }

    if (body.friends) {
      await friends(userId, body.friends);
    }

    if (body.friendRequests) {
      await friendRequests(userId, body.friends);
    }

    return validResponse("All actions processed successfully");
  } catch (error) {
    console.error("Error in mainHandler:", error);
    return internalServerError(
      "An error occurred while processing the request.",
    );
  }
}
