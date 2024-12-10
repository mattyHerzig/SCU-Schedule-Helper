import { PutItemCommand } from "@aws-sdk/client-dynamodb";
import { getMap } from "./getSetOrMapItems.js";
import { dynamoClient, tableName } from "../index.js";

export async function updateInterestedSections(userId, updateData) {
  const updatedInterestedSections = await getMap(
    userId,
    "info#interestedSections",
    "sections",
  );

  if (updateData.add)
    for (const section in updateData.add)
      updatedInterestedSections.set(section, {
        S: updateData.add[section].toString(),
      });
  if (updateData.remove)
    for (const section of updateData.remove)
      updatedInterestedSections.delete(section);

  const interestedSectionsUpdateObj =
    updatedInterestedSections.size > 0
      ? { M: Object.fromEntries(updatedInterestedSections) }
      : { NULL: true };

  const updatedCoursesItem = {
    TableName: tableName,
    Item: {
      pk: { S: `u#${userId}` },
      sk: { S: "info#interestedSections" },
      sections: interestedSectionsUpdateObj,
    },
  };

  const result = await dynamoClient.send(
    new PutItemCommand(updatedCoursesItem),
  );
  if (result.$metadata.httpStatusCode !== 200) {
    console.error(`Error updating interested sections for user ${userId}`);
    throw new Error(`Error updating interested sections for user ${userId}`, {
      cause: 500,
    });
  }
}
