import { PutItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { getSetItems } from "./getSetItems.js";
import { client } from "./dynamoClient.js";
const tableName = process.env.SCU_SCHEDULE_HELPER_DDB_TABLE_NAME;

export async function updateInterestedSections(userId, updateData) {
  const updatedInterestedSections = await getSetItems(
    userId,
    "info#interestedSections",
    "sections",
  );

  if (updateData.add)
    updateData.add.forEach((course) => updatedInterestedSections.add(course));
  if (updateData.remove)
    updateData.remove.forEach((course) =>
      updatedInterestedSections.delete(course),
    );

  const interestedSectionsUpdateObj =
    updatedInterestedSections.size > 0
      ? { SS: Array.from(updatedInterestedSections) }
      : { NULL: true };

  const updatedCoursesItem = {
    TableName: tableName,
    Item: {
      pk: { S: `u#${userId}` },
      sk: { S: "info#interestedSections" },
      sections: interestedSectionsUpdateObj,
    },
  };

  const result = await client.send(new PutItemCommand(updatedCoursesItem));
  if (result.$metadata.httpStatusCode !== 200) {
    console.error(`Error updating courses for user ${userId}`);
    throw new Error(`Error updating courses for user ${userId}`, {
      cause: 500,
    });
  }
}
