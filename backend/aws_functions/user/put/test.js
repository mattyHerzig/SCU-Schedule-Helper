import { handler } from "./index.js";

// Can add more parameters for testing. Only have friends since that was last thing to be added.
// Recommend not to test everything at once if looking to bug fix, since console will be flooded with logs.
async function runTest() {
  const event = {
    requestContext: {
      http: {
        method: "PUT",
      },
    },
    headers: {
      authorization: `Bearer ${process.env.TEST_ACCESS_JWT}`,
    },
    body: JSON.stringify({
      preferences: {
        preferredSectionTimeRange: {
          startHour: 9,
          startMinute: 30,
          endHour: 6,
          endMinute: 30,
        },
        scoreWeighting: { scuEvals: 75, rmp: 25 },
      },
      interestedSections: {
        // add: ["test"],
        // remove: ["test"],
      },
      coursesTaken: {
        // add: ["test"],
        // remove: ["test"],
      },
      personal: {
        name: "Test Update",
        subscriptions: ["test"],
        photo: null,
      },
      friendRequests: {
        // send: ["esartory"],
        // removeIncoming: ["2"],
        // removeOutgoing: ["swdean"],
      },
      friends: {
        add: ["swdean"],
        // remove: ["esartory"],
      },
    }),
  };

  try {
    const response = await handler(event, null);
    console.log("Put User Result:", response);
  } catch (error) {
    console.error("Error during putUser:", error);
  }
}
runTest();
