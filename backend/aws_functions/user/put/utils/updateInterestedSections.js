import { UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { getSetItems } from "./getSetItems.js";
import { client } from "./dynamoClient.js";
const tableName = process.env.SCU_SCHEDULE_HELPER_DDB_TABLE_NAME;

export async function updateInterestedSections(userId, updateData) {
  const updatedSections = await getSetItems(userId, "info#interestedsections", "sections");

  updateData.sections.forEach(section => updatedSections.add(section));

  const params = {
    TableName: tableName,
    Key: {
      pk: { S: userId },
      sk: { S: "info#interestedsections" },
    },
    UpdateExpression: "SET #sections = :sections",
    ExpressionAttributeNames: {
      "#sections": "sections",
    },
    ExpressionAttributeValues: {
      ":sections": { SS: Array.from(updatedSections) },
    },
    ReturnValues: "ALL_NEW"
  };

  try {
    const result = await client.send(new UpdateItemCommand(params));
    console.log("Update successful:", result);
    return {
      statusCode: 200,
      body: JSON.stringify(result.Attributes),
    };
  } catch (error) {
    console.error("Error updating interested sections:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to update interested sections." }),
    };
  }
}