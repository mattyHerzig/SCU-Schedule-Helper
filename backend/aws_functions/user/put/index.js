import { updateCourses }  from "./utils/updateCourses.js";
import { updatePersonal } from "./utils/updatePersonal.js";
import { updateInterestedSections }  from "./utils/updateInterestedSections.js";
import { updatePreferences } from "./utils/updatePreferences.js";
import { friends } from "./utils/friends.js";
import { friendRequests } from "./utils/friendRequests.js";
import { handleWithAuthorization } from "./utils/authorization.js";


export async function handler(event, context) {
  return await handleWithAuthorization(event, context, putUser);
}

export async function putUser(event, context, userId) {
  
  try {
    const body = JSON.parse(event.body);

    if (body.preferences) {
      const result = await updatePreferences(userId, body.preferences);
    }

    if (body.interestedSections) {
      const result = await updateInterestedSections(userId, body.interestedSections);
    }

    if (body.personal) {
      const result = await updatePersonal(userId, body.personal);
    }

    if (body.coursesTaken) {
      const result = await updateCourses(userId, body.coursesTaken);
    }

    if (body.friends) {
      const result = await friends(userId, body.friends);
    }

    if (body.friendRequests) {
      const result = await friendRequests(userId, body.friends);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "All actions processed successfully.",
      }),
    };
  } catch (error) {
    console.error("Error in mainHandler:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "An error occurred while processings.",
        error: error.message,
      }),
    };
  }
}

