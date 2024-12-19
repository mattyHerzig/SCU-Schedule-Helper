export class CreatedUserResponse {
  constructor(id, name, photoUrl, email, subscription) {
    this.id = id;
    this.name = name;
    this.photoUrl = photoUrl;
    this.email = email;
    this.subscriptions = [subscription];
    this.preferences = {
      difficulty: 0,
      preferredSectionTimeRange: {
        startHour: 8,
        startMinute: 0,
        endHour: 20,
        endMinute: 0,
      },
      scoreWeighting: {
        scuEvals: 50,
        rmp: 50,
      },
      courseTracking: true,
      showRatings: true,
    };
    this.coursesTaken = [];
    this.interestedSections = {};
  }
}

export const validResponse = (response) => {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(response),
  };
};

export const createdResponse = (response) => {
  return {
    statusCode: 201,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(response),
  };
};

export const badRequestResponse = (message) => {
  return {
    statusCode: 400,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
    }),
  };
};

export const unauthorizedError = (message) => {
  return {
    statusCode: 401,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: `Authorization failed: ${message}`,
    }),
  };
};

export const internalServerError = {
  statusCode: 500,
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    message: `Something went wrong on our end. Please try again later or contact stephenwdean@gmail.com.`,
  }),
};
