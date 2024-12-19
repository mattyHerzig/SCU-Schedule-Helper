import { PutItemCommand } from "@aws-sdk/client-dynamodb";
import { getSetItems } from "./getSetOrMapItems.js";
import { dynamoClient, tableName } from "../index.js";

export async function updateCourses(userId, updateData) {
  const updatedCourses = await getSetItems(
    userId,
    "info#coursesTaken",
    "courses",
  );

  if (updateData.add)
    updateData.add.forEach((course) => updatedCourses.add(course));
  if (updateData.remove)
    updateData.remove.forEach((course) => updatedCourses.delete(course));

  const courseUpdateObj =
    updatedCourses.size > 0
      ? { SS: Array.from(updatedCourses) }
      : { NULL: true };

  const updatedCoursesItem = {
    TableName: tableName,
    Item: {
      pk: { S: `u#${userId}` },
      sk: { S: "info#coursesTaken" },
      courses: courseUpdateObj,
    },
  };

  const result = await dynamoClient.send(
    new PutItemCommand(updatedCoursesItem),
  );
  if (result.$metadata.httpStatusCode !== 200) {
    console.error(`INTERNAL: Error updating courses for user ${userId}`);
    throw new Error(`error updating courses for user ${userId}`, {
      cause: 500,
    });
  }
}
