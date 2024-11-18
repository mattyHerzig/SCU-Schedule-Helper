import { UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { client } from "./dynamoClient.js";
const tableName = process.env.SCU_SCHEDULE_HELPER_DDB_TABLE_NAME;

function getTimeRange(startHour, startMinute, endHour, endMinute) {
  return (startHour << 17) + (startMinute << 11) + (endHour << 6) + endMinute;
}

function getScoreWeighting(scuEvals, rmp) {
  return (scuEvals << 7) + rmp;
}

export async function updatePreferences(userId, updateData) {
  const { preferredSectionTimeRange, scoreWeighting } = updateData;

  const updateExpressionParts = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  if (preferredSectionTimeRange) {
    const { startHour, startMinute, endHour, endMinute } = preferredSectionTimeRange;

    if (startHour != null && startMinute != null && endHour != null && endMinute != null) {
      const preferredSectionTimeRangeValue = getTimeRange(startHour, startMinute, endHour, endMinute);
      updateExpressionParts.push("#preferredSectionTimeRange = :preferredSectionTimeRange");
      expressionAttributeNames["#preferredSectionTimeRange"] = "preferredSectionTimeRange";
      expressionAttributeValues[":preferredSectionTimeRange"] = { N: `${preferredSectionTimeRangeValue}` };
    }
  }

  if (scoreWeighting) {
    const { scuEvals, rmp } = scoreWeighting;

    if (scuEvals != null && rmp != null) {
      const scoreWeightingValue = getScoreWeighting(scuEvals, rmp);
      updateExpressionParts.push("#scoreWeighting = :scoreWeighting");
      expressionAttributeNames["#scoreWeighting"] = "scoreWeighting";
      expressionAttributeValues[":scoreWeighting"] = { N: `${scoreWeightingValue}` };
    }
  }

  if (updateExpressionParts.length === 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "No valid fields provided for update." }),
    };
  }

  const updateExpression = `SET ${updateExpressionParts.join(", ")}`;

  const params = {
    TableName: tableName,
    Key: {
      pk: { S: userId },
      sk: { S: "info#preferences" },
    },
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: "ALL_NEW",
  };

  try {
    const result = await client.send(new UpdateItemCommand(params));
    console.log("Update successful:", result);
    return {
      statusCode: 200,
      body: JSON.stringify(result.Attributes),
    };
  } catch (error) {
    console.error("Error updating preferences:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to update preferences." }),
    };
  }
}

