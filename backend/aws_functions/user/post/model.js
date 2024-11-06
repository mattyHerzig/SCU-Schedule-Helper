export class CreatedUserResponse {
  constructor(id, publicInfo) {
    this.id = id;
    this.publicInfo = publicInfo;
  }
}

export class PublicInfo {
  constructor(profile) {
    this.profile = profile;
  }
}

export class Profile {
  constructor(name, photoUrl, email, notificationId) {
    this.name = name;
    this.photoUrl = photoUrl;
    this.email = email;
    this.notificationIds = new Set(notificationId);
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
