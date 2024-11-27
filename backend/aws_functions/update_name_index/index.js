import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  DeleteItemCommand,
} from "@aws-sdk/client-dynamodb";

export const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_DDB_REGION,
});
const tableName = process.env.SCU_SCHEDULE_HELPER_DDB_TABLE_NAME;

export async function handler(event, context) {
  console.log(event);
  if (!event.userId) {
    throw new Error("userId is required");
  }
  if (!event.currentName && event.newName && event.photoUrl) {
    await addNameToIndex(event.userId, event.newName, event.photoUrl);
  } else if (event.currentName && (event.newName || event.photoUrl)) {
    await updateNameIndexEntry(
      event.userId,
      event.currentName,
      event.newName,
      event.photoUrl,
    );
  } else {
    await deleteNameFromIndexEntry(event.userId, event.currentName);
  }
}

async function addNameToIndex(userId, newName, photoUrl) {
  const nameIndex = {
    pk: { S: `name-index#${newName.toUpperCase().charAt(0)}` },
    sk: { S: newName },
  };
  const nameIndexResponse = await dynamoClient.send(
    new GetItemCommand({
      Key: nameIndex,
      TableName: tableName,
    }),
  );
  if (nameIndexResponse.$metadata.httpStatusCode !== 200) {
    throw new Error(
      `Received bad HTTP status code from DynamoDB: ${nameIndexResponse.$metadata.httpStatusCode}).`,
    );
  }
  const usersWithName = nameIndexResponse?.Item?.users?.SS || [];
  usersWithName.push(`U{${userId}}P{${photoUrl}}`);
  const updatedNameIndexItem = {
    pk: { S: `name-index#${newName.toUpperCase().charAt(0)}` },
    sk: { S: newName },
    users: { SS: usersWithName },
  };
  const putCommand = new PutItemCommand({
    Item: updatedNameIndexItem,
    TableName: tableName,
  });
  const putResponse = await dynamoClient.send(putCommand);
  if (putResponse.$metadata.httpStatusCode !== 200) {
    throw new Error(
      `Received bad HTTP status code from DynamoDB: ${putResponse.$metadata.httpStatusCode}).`,
    );
  }
}

async function updateNameIndexEntry(userId, currentName, newName, photoUrl) {
  const currentNameIndex = {
    pk: { S: `name-index#${currentName.toUpperCase().charAt(0)}` },
    sk: { S: currentName },
  };
  const currentNameIndexResponse = await dynamoClient.send(
    new GetItemCommand({
      Key: currentNameIndex,
      TableName: tableName,
    }),
  );
  if (currentNameIndexResponse.$metadata.httpStatusCode !== 200) {
    throw new Error(
      `Received bad HTTP status code from DynamoDB: ${currentNameIndexResponse.$metadata.httpStatusCode}).`,
    );
  }
  if (
    !currentNameIndexResponse ||
    !currentNameIndexResponse.Item ||
    !currentNameIndexResponse.Item.users ||
    !currentNameIndexResponse.Item.users.SS
  ) {
    throw new Error("Name index not found");
  }
  const usersWithName = currentNameIndexResponse.Item.users.SS;
  const currentUserNameIndexEntry = usersWithName.find((user) =>
    user.includes(`U{${userId}}P{`),
  );
  const updatedUsers = usersWithName.filter(
    (user) => !user.includes(`U{${userId}}P{`),
  );
  const nameIndexPattern = /U{(?:.*)}P{(.*)}/;
  const [, photoUrlInIndex] = nameIndexPattern.exec(currentUserNameIndexEntry);
  if (!photoUrl) {
    photoUrl = photoUrlInIndex;
  }
  if (!newName) {
    newName = currentName;
    updatedUsers.push(`U{${userId}}P{${photoUrl}}`);
  }
  if (updatedUsers.length === 0) {
    await deleteNameIndex(currentNameIndex);
  } else {
    const putOldNameIndex = new PutItemCommand({
      Item: {
        pk: { S: `name-index#${currentName.toUpperCase().charAt(0)}` },
        sk: { S: currentName },
        users: { SS: updatedUsers },
      },
      TableName: tableName,
    });
    const putOldNameIndexResponse = await dynamoClient.send(putOldNameIndex);
    if (putOldNameIndexResponse.$metadata.httpStatusCode !== 200) {
      throw new Error(
        `Received bad HTTP status code from DynamoDB: ${putOldNameIndexResponse.$metadata.httpStatusCode}).`,
      );
    }
  }
  if (newName !== currentName) {
    await addNameToIndex(userId, newName, photoUrl);
  }
}

async function deleteNameFromIndexEntry(userId, currentName) {
  const currentNameIndex = {
    pk: { S: `name-index#${currentName.toUpperCase().charAt(0)}` },
    sk: { S: currentName },
  };
  const currentNameIndexResponse = await dynamoClient.send(
    new GetItemCommand({
      Key: currentNameIndex,
      TableName: tableName,
    }),
  );
  if (currentNameIndexResponse.$metadata.httpStatusCode !== 200) {
    throw new Error(
      `Received bad HTTP status code from DynamoDB: ${currentNameIndexResponse.$metadata.httpStatusCode}).`,
    );
  }
  if (
    !currentNameIndexResponse ||
    !currentNameIndexResponse.Item ||
    !currentNameIndexResponse.Item.users ||
    !currentNameIndexResponse.Item.users.SS
  ) {
    throw new Error("Name index not found");
  }
  const usersWithName = currentNameIndexResponse.Item.users.SS;
  const updatedUsers = usersWithName.filter(
    (user) => !user.includes(`U{${userId}}P{`),
  );
  if (updatedUsers.length === 0) {
    await deleteNameIndex(currentNameIndex);
    return;
  }
  const putNameIndex = new PutItemCommand({
    Item: {
      pk: { S: `name-index#${currentName.toUpperCase().charAt(0)}` },
      sk: { S: currentName },
      users: { SS: updatedUsers },
    },
    TableName: tableName,
  });
  const putNameIndexResponse = await dynamoClient.send(putNameIndex);
  if (putNameIndexResponse.$metadata.httpStatusCode !== 200) {
    throw new Error(
      `Received bad HTTP status code from DynamoDB: ${putNameIndexResponse.$metadata.httpStatusCode}).`,
    );
  }
}

async function deleteNameIndex(key) {
  const deleteNameIndex = new DeleteItemCommand({
    Key: key,
    TableName: tableName,
  });
  const deleteNameIndexResponse = await dynamoClient.send(deleteNameIndex);
  if (deleteNameIndexResponse.$metadata.httpStatusCode !== 200) {
    throw new Error(
      `Received bad HTTP status code from DynamoDB: ${deleteNameIndexResponse.$metadata.httpStatusCode}).`,
    );
  }
}
