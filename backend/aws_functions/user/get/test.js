import { handler } from "./index.js";
import {
  DynamoDBClient,
  PutItemCommand,
  BatchWriteItemCommand,
  QueryCommand,
} from "@aws-sdk/client-dynamodb";

const ddbRegion = process.env.AWS_DDB_REGION;
const tableName = process.env.SCU_SCHEDULE_HELPER_DDB_TABLE_NAME;
const dynamoDBClient = new DynamoDBClient({ region: ddbRegion });

async function test() {
  await createTestDDBUser(
    "test1",
    /*friends=*/ ["test2"],
    /*incomingReqs=*/ ["test3"],
    /*outgoingReqs*/ ["test4"],
  );
  await createTestDDBUser("test2", ["test1"]);
  await createTestDDBUser("test3", [], ["test1"]);
  await createTestDDBUser("test4", [], [], ["test1"]);

  console.log("Test 1 get user 1");
  const event = {
    requestContext: {
      http: {
        method: "GET",
      },
    },
    headers: {
      authorization: `Bearer ${process.env.TEST_ACCESS_JWT}`,
    },
    pathParameters: {
      userId: "test1",
    },
    queryStringParameters: {},
  };
  const response = await handler(event, null);
  console.log(JSON.stringify(JSON.parse(response.body), null, 2));

  console.log("\n\nTest 2 get user 2");
  event.pathParameters.userId = "test2";
  const response2 = await handler(event, null);
  console.log(JSON.stringify(JSON.parse(response2.body), null, 2));

  console.log("\n\nTest 3 get user 3");
  event.pathParameters.userId = "test3";
  const response3 = await handler(event, null);
  console.log(JSON.stringify(JSON.parse(response3.body), null, 2));

  console.log("\n\nTest 4 get user 4");
  event.pathParameters.userId = "test4";
  const response4 = await handler(event, null);
  console.log(JSON.stringify(JSON.parse(response4.body), null, 2));

  console.log("\n\nTest 5 user does not exist");
  event.pathParameters.userId = "test5";
  const response5 = await handler(event, null);
  console.log(JSON.stringify(JSON.parse(response5.body), null, 2));

  console.log("\n\nTest 6 user's friend doesn't exist");
  await createTestDDBUser("test1", ["test5"]);
  event.pathParameters.userId = "test1";
  const response6 = await handler(event, null);
  console.log(JSON.stringify(JSON.parse(response6.body), null, 2));

  console.log("\n\nTest 7 get user 1 with items query");
  event.queryStringParameters = { items: "friendRequests" };
  const response7 = await handler(event, null);
  console.log(JSON.stringify(JSON.parse(response7.body), null, 2));

  await deleteTestUsers(["test1", "test2", "test3", "test4", "test5"]);
}

deleteTestUsers([
  "test1",
  "test2",
  "test3",
  "test4",
  "test5",
  "test6",
  "test7",
  "test8",
]);
test();
async function createTestDDBUser(
  userId,
  friendIds = [],
  friendRequestInIds = [],
  friendRequestOutIds = [],
) {
  const personalInfoItem = {
    TableName: tableName,
    Item: {
      pk: { S: `u#${userId}` },
      sk: { S: `info#personal` },
      name: { S: "Test Name" },
      email: { S: `${userId}@scu.edu` },
      photoUrl: { S: "https://example.com" },
      subscriptions: { SS: ["testsub1", "testsub2"] },
    },
  };
  const coursesTakenItem = {
    TableName: tableName,
    Item: {
      pk: { S: `u#${userId}` },
      sk: { S: `info#coursesTaken` },
      courses: { SS: ["COEN 12", "COEN 19"] },
    },
  };
  const interestedSectionsItem = {
    TableName: tableName,
    Item: {
      pk: { S: `u#${userId}` },
      sk: { S: `info#interestedSections` },
      sections: { SS: ["COEN 12-01", "COEN 19-01"] },
    },
  };
  const preferencesItem = {
    TableName: tableName,
    Item: {
      pk: { S: `u#${userId}` },
      sk: { S: `info#preferences` },
      preferredSectionTimeRange: { N: `${getTimeRange(8, 15, 6, 30)}` },
      scoreWeighting: { N: `${getScoreWeighting(75, 25)}` },
    },
  };
  const friendItems = friendIds.map((friendId) => ({
    TableName: tableName,
    Item: {
      pk: { S: `u#${userId}` },
      sk: { S: `friend#cur#${friendId}` },
    },
  }));
  const friendRequestInItems = friendRequestInIds.map((friendRequestId) => ({
    TableName: tableName,
    Item: {
      pk: { S: `u#${userId}` },
      sk: { S: `friend#req#in#${friendRequestId}` },
    },
  }));
  const friendRequestOutItems = friendRequestOutIds.map((friendRequestId) => ({
    TableName: tableName,
    Item: {
      pk: { S: `u#${userId}` },
      sk: { S: `friend#req#out#${friendRequestId}` },
    },
  }));
  await Promise.all([
    dynamoDBClient.send(new PutItemCommand(coursesTakenItem)),
    dynamoDBClient.send(new PutItemCommand(interestedSectionsItem)),
    dynamoDBClient.send(new PutItemCommand(personalInfoItem)),
    dynamoDBClient.send(new PutItemCommand(preferencesItem)),
    ...friendItems.map((item) => dynamoDBClient.send(new PutItemCommand(item))),
    ...friendRequestInItems.map((item) =>
      dynamoDBClient.send(new PutItemCommand(item)),
    ),
    ...friendRequestOutItems.map((item) =>
      dynamoDBClient.send(new PutItemCommand(item)),
    ),
  ]);
}

async function deleteTestUsers(userIds) {
  for (const userId of userIds) {
    const query = new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "pk = :pk",
      ExpressionAttributeValues: {
        ":pk": { S: `u#${userId}` },
      },
    });
    const userItems = await dynamoDBClient.send(query);
    const deleteReqs = userItems.Items.map((item) => ({
      DeleteRequest: {
        Key: {
          pk: { S: `u#${userId}` },
          sk: { S: item.sk.S },
        },
      },
    }));
    if (deleteReqs.length === 0) return;
    await dynamoDBClient.send(
      new BatchWriteItemCommand({
        RequestItems: {
          [tableName]: deleteReqs,
        },
      }),
    );
  }
}

function getTimeRange(startHour, startMinute, endHour, endMinute) {
  return (startHour << 17) + (startMinute << 11) + (endHour << 6) + endMinute;
}

function getScoreWeighting(scuEvals, rmp) {
  return (scuEvals << 7) + rmp;
}
