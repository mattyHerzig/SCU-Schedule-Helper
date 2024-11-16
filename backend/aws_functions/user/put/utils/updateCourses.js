import { UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { getSetItems } from "./getSetItems.js";
import { client } from "./dynamoClient.js";
const tableName = process.env.SCU_SCHEDULE_HELPER_DDB_TABLE_NAME;

export async function updateCourses(userId, updateData) {
  const updatedCourses = await getSetItems(userId, "info#coursestaken", "courses");
  
  updateData.courses.forEach(course => updatedCourses.add(course));

  const params = {
    TableName: tableName,
    Key: {
      pk: { S: userId },
      sk: { S: "info#coursestaken" },
    },
    UpdateExpression: "SET #courses = :courses",
    ExpressionAttributeNames: {
      "#courses": "courses",
    },
    ExpressionAttributeValues: {
      ":courses": { SS: Array.from(updatedCourses) },
    },
    ReturnValues: "ALL_NEW"
  };

  try {
    const result = await client.send(new UpdateItemCommand(params));
    console.log("Courses update successful:", result);
    return {
      statusCode: 200,
      body: JSON.stringify(result.Attributes),
    };
  } catch (error) {
    console.error("Error updating courses:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to update courses." }),
    };
  }
}
