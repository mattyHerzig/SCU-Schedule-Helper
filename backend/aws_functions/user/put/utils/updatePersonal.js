import { UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { client } from "./dynamoClient.js";
import { getSetItems } from "./getSetItems.js";
const tableName = process.env.SCU_SCHEDULE_HELPER_DDB_TABLE_NAME;

export async function updatePersonal(userId, updateData) {
  const updatedSubscriptions = await getSetItems(userId, "info#personal", "subscriptions");

  if (updateData.subscriptions && Array.isArray(updateData.subscriptions)) {
    updateData.subscriptions.forEach(subscription => updatedSubscriptions.add(subscription));
  }

  let updateExpression = "SET ";
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  const attributes = ["name", "photo_url", "email", "subscriptions"];

  attributes.forEach(attribute => {
    if (updateData[attribute] !== undefined) { 
      updateExpression += `#${attribute} = :${attribute}, `;
      expressionAttributeNames[`#${attribute}`] = attribute;
      expressionAttributeValues[`:${attribute}`] = 
        attribute === "subscriptions" ? { SS: Array.from(updatedSubscriptions) } : { S: updateData[attribute] };
    }
  });

  if (updateExpression === "SET ") {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "No valid attributes provided to update." })
    };
  }

  updateExpression = updateExpression.slice(0, -2); 

  const params = {
    TableName: tableName,
    Key: {
      pk: { S: userId },
      sk: { S: "info#personal" },
    },
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
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
    console.error("Error updating personal information:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to update personal information." }),
    };
  }
}

