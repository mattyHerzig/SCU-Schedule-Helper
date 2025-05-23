import {
  BatchGetItemCommand,
  DynamoDBClient,
  GetItemCommand,
  QueryCommand,
} from "@aws-sdk/client-dynamodb";
import {
  validResponse,
  notFoundError,
  internalServerError,
  UserPreferences,
  UserFullProfile,
  UserFriendProfile,
  UserLimitedProfile,
  FriendRequestProfile,
} from "./model.js";
import { handleWithAuthorization } from "./utils/authorization.js";

const ALL_ITEMS = new Set([
  "personal",
  "preferences",
  "coursesTaken",
  "interestedSections",
  "friends",
  "friendRequests",
  "academicPrograms"
]);

const ITEMS_FOR_SCOPE = Object.freeze({
  friend: ["info#personal", "info#coursesTaken", "info#interestedSections", "info#academicPrograms"],
  limited: ["info#personal"],
});

const maxAttempts = 5;
const retryMode = "standard";
const ddbRegion = process.env.AWS_DDB_REGION;
const tableName = process.env.SCU_SCHEDULE_HELPER_DDB_TABLE_NAME;
const dynamoDBClient = new DynamoDBClient({
  region: ddbRegion,
  maxAttempts,
  retryMode,
});

export async function handler(event, context) {
  return await handleWithAuthorization(event, context, handleGetUserRequest);
}

async function handleGetUserRequest(event, context, userId) {
  let userToGet = event.pathParameters.userId;
  let itemsToInclude = ALL_ITEMS;

  if (event.queryStringParameters && event.queryStringParameters.items) {
    itemsToInclude = new Set(event.queryStringParameters.items.split(","));
  }
  if (userToGet === "me") {
    userToGet = userId;
  }
  if (userToGet === userId) {
    return await getProfileResponse(userId, "full", itemsToInclude);
  }
  if (await usersAreFriends(userId, userToGet)) {
    return await getProfileResponse(userToGet, "friend", itemsToInclude);
  } else {
    return await getProfileResponse(userToGet, "limited", itemsToInclude);
  }
}

async function getProfileResponse(userId, scope, itemsToInclude) {
  try {
    return validResponse(await getProfileObject(userId, scope, itemsToInclude));
  } catch (error) {
    if (error.cause === 404) {
      console.error("Error getting user profile: ", error);
      return notFoundError("The requested user was not found.");
    }
    console.error("INTERNAL: Error getting user profile: ", error);
    return internalServerError;
  }
}

async function getProfileObject(userId, scope, itemsToInclude) {
  let userItems;
  try {
    if (scope === "full")
      userItems = await dynamoDBClient.send(makeUserQuery(userId));
    else userItems = await batchGetProfileItems(userId, scope);
  } catch (error) {
    console.error("INTERNAL: Error getting user items: ", error);
    throw new Error("could not fetch user profile from database.", {
      cause: 500,
    });
  }
  const userProfile =
    scope === "friend"
      ? new UserFriendProfile()
      : scope === "full"
        ? new UserFullProfile()
        : new UserLimitedProfile();
  if (userItems.Count === 0) {
    throw new Error(`The requested user was not found.`, {
      cause: 404,
    });
  }
  userProfile.id = userId;
  const itemPromises = [];
  for (const item of userItems.Items) {
    itemPromises.push(setItemInUser(item, userProfile, scope, itemsToInclude));
  }
  try {
    await Promise.all(itemPromises);
  } catch (error) {
    console.error(
      "INTERNAL: Error getting parsing item in user's profile: ",
      error,
    );
    throw new Error(`could not get a part of a user's (${userId}) profile.`, {
      cause: 500,
    });
  }
  return userProfile;
}

async function getFriendRequestProfile(userId, incoming) {
  const limitedProfile = await getProfileObject(userId, "limited", ALL_ITEMS);
  const friendRequestProfile = new FriendRequestProfile();
  friendRequestProfile.id = limitedProfile.id;
  friendRequestProfile.name = limitedProfile.name;
  friendRequestProfile.photoUrl = limitedProfile.photoUrl;
  friendRequestProfile.type = incoming ? "incoming" : "outgoing";
  return friendRequestProfile;
}

async function setItemInUser(item, userProfile, scope, itemsToGet) {
  switch (item.sk.S) {
    case `info#coursesTaken`:
      if (
        scope === "limited" ||
        !itemsToGet.has("coursesTaken") ||
        !item.courses.SS
      )
        break;
      userProfile.coursesTaken = item.courses.SS;
      break;
    case `info#interestedSections`:
      if (
        scope === "limited" ||
        !itemsToGet.has("interestedSections") ||
        !item.sections.M
      )
        break;
      for (const section in item.sections.M) {
        userProfile.interestedSections[section] =
          item.sections.M[section].S;
      }
      break;
    case `info#academicPrograms`:
      if (scope === "limited" || !itemsToGet.has("academicPrograms")) break;
      userProfile.majors = item.majors?.SS || [];
      userProfile.minors = item.minors?.SS || [];
      userProfile.emphases = item.emphases?.SS || [];
      break;
    case `info#personal`:
      if (!itemsToGet.has("personal")) break;
      userProfile.name = item.name.S;
      userProfile.email = item.email.S;
      userProfile.photoUrl = item.photoUrl.S;
      break;
    case `info#preferences`:
      if (scope !== "full" || !itemsToGet.has("preferences")) break;
      const preferences = new UserPreferences();
      preferences.difficulty = parseInt(item.difficulty.N);
      const swBits = parseInt(item.scoreWeighting.N);
      const pstrBits = parseInt(item.preferredSectionTimeRange.N);
      preferences.scoreWeighting.scuEvals = swBits >> 7;
      preferences.scoreWeighting.rmp = swBits & 0b1111111;
      preferences.preferredSectionTimeRange.startHour = pstrBits >> 17;
      preferences.preferredSectionTimeRange.startMinute =
        (pstrBits >> 11) & 0b111111;
      preferences.preferredSectionTimeRange.endHour = (pstrBits >> 6) & 0b11111;
      preferences.preferredSectionTimeRange.endMinute = pstrBits & 0b111111;
      preferences.courseTracking = item.courseTracking.BOOL;
      preferences.showRatings = item.showRatings.BOOL;
      userProfile.preferences = preferences;
      break;
    default:
      if (scope !== "full") break;
      if (item.sk.S.startsWith("friend#cur#") && itemsToGet.has("friends")) {
        userProfile.friends.push(
          await getProfileObject(
            item.sk.S.split("friend#cur#")[1],
            "friend",
            ALL_ITEMS,
          ),
        );
      } else if (
        item.sk.S.startsWith("friend#req#in#") &&
        itemsToGet.has("friendRequests")
      ) {
        userProfile.friendRequests.push(
          await getFriendRequestProfile(
            item.sk.S.split("friend#req#in#")[1],
            true,
          ),
        );
      } else if (
        item.sk.S.startsWith("friend#req#out#") &&
        itemsToGet.has("friendRequests")
      ) {
        userProfile.friendRequests.push(
          await getFriendRequestProfile(
            item.sk.S.split("friend#req#out#")[1],
            false,
          ),
        );
      }
      break;
  }
}

async function usersAreFriends(userId, friendId) {
  const getItemCommand = new GetItemCommand({
    TableName: tableName,
    Key: {
      pk: { S: `u#${userId}` },
      sk: { S: `friend#cur#${friendId}` },
    },
  });
  try {
    const getFriend = await dynamoDBClient.send(getItemCommand);
    return getFriend.Item;
  } catch (error) {
    console.error("INTERNAL: Error getting friend item: ", error);
    return internalServerError;
  }
}

function makeUserQuery(userId) {
  return new QueryCommand({
    TableName: tableName,
    KeyConditionExpression: "pk = :pk",
    ExpressionAttributeValues: {
      ":pk": { S: `u#${userId}` },
    },
  });
}

async function batchGetProfileItems(userId, scope) {
  const keys = ITEMS_FOR_SCOPE[scope].map((item) => ({
    pk: { S: `u#${userId}` },
    sk: { S: `${item}` },
  }));

  const batchGetCommand = {
    RequestItems: {
      [tableName]: {
        Keys: keys,
      },
    },
  };

  try {
    const response = await dynamoDBClient.send(
      new BatchGetItemCommand(batchGetCommand),
    );
    return {
      Items: response.Responses[tableName],
    };
  } catch (error) {
    console.error("INTERNAL: Error getting user items: ", error);
    throw new Error("could not fetch user profile from database.", {
      cause: 500,
    });
  }
}
