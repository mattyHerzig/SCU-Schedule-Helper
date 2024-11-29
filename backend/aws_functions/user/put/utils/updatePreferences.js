import { UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { dynamoClient, tableName } from "../index.js";

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
    const { startHour, startMinute, endHour, endMinute } =
      preferredSectionTimeRange;
    if (
      !startHour ||
      !startMinute ||
      !endHour ||
      !endMinute ||
      startHour < 0 ||
      startHour > 23 ||
      endHour < 0 ||
      endHour > 23 ||
      startMinute < 0 ||
      startMinute > 59 ||
      endMinute < 0 ||
      endMinute > 59
    ) {
      throw new Error("Invalid preferred time range.", { cause: 400 });
    }
    const preferredSectionTimeRangeValue = getTimeRange(
      startHour,
      startMinute,
      endHour,
      endMinute,
    );
    updateExpressionParts.push(
      "#preferredSectionTimeRange = :preferredSectionTimeRange",
    );
    expressionAttributeNames["#preferredSectionTimeRange"] =
      "preferredSectionTimeRange";
    expressionAttributeValues[":preferredSectionTimeRange"] = {
      N: `${preferredSectionTimeRangeValue}`,
    };
  }

  if (scoreWeighting) {
    if (
      !scoreWeighting.scuEvals ||
      !scoreWeighting.rmp ||
      scoreWeighting.scuEvals + scoreWeighting.rmp > 100
    ) {
      throw new Error("Invalid score weighting.", { cause: 400 });
    }
    const { scuEvals, rmp } = scoreWeighting;

    const scoreWeightingValue = getScoreWeighting(scuEvals, rmp);
    updateExpressionParts.push("#scoreWeighting = :scoreWeighting");
    expressionAttributeNames["#scoreWeighting"] = "scoreWeighting";
    expressionAttributeValues[":scoreWeighting"] = {
      N: `${scoreWeightingValue}`,
    };
  }

  if (updateExpressionParts.length === 0) {
    throw new Error("No valid preferences to update.", { cause: 400 });
  }

  const updateExpression = `SET ${updateExpressionParts.join(", ")}`;

  const params = {
    TableName: tableName,
    Key: {
      pk: { S: `u#${userId}` },
      sk: { S: "info#preferences" },
    },
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
  };

  const result = await dynamoClient.send(new UpdateItemCommand(params));
  if (result.$metadata.httpStatusCode !== 200) {
    console.error(`Error updating preferences for user ${userId}`);
    throw new Error(`Error updating preferences for user ${userId}`, {
      cause: 500,
    });
  }
}
