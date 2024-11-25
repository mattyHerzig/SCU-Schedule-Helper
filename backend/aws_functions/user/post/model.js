export class CreatedUserResponse {
  constructor(id, name, photoUrl, email, subscription) {
    this.id = id;
    this.name = name;
    this.photoUrl = photoUrl;
    this.email = email;
    this.subscriptions = [subscription];
    this.preferences = {
      preferredSectionTimeRange: {
        startHour: 6,
        startMinute: 0,
        endHour: 20,
        endMinute: 0,
      },
      scoreWeighting: {
        scuEvals: 50,
        rmp: 50,
      },
    };
    this.coursesTaken = [];
    this.interestedSections = [];
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
      message: `Bad request: ${message}`,
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
      message: `Could not verify user authorization due to an error: ${message}`,
    }),
  };
};

export const internalServerError = (error) => {
  return {
    statusCode: 500,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: `Internal server error: ${error}`,
    }),
  };
};
