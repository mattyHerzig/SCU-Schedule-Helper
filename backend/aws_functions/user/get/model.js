export class UserFullProfile {
  constructor() {
    this.id = "";
    this.name = "";
    this.email = "";
    this.photoUrl = "";
    this.preferences = new UserPreferences();
    this.coursesTaken = [];
    this.interestedSections = [];
    this.friends = [];
    this.friendRequests = [];
  }
}

export class UserFriendProfile {
  constructor() {
    this.id = "";
    this.name = "";
    this.photoUrl = "";
    this.coursesTaken = [];
    this.interestedSections = [];
  }
}

export class UserLimitedProfile {
  constructor() {
    this.id = "";
    this.name = "";
    this.photoUrl = "";
  }
}

export class FriendRequestProfile extends UserLimitedProfile {
  constructor() {
    super();
    this.type = "";
  }
}

export class UserPreferences {
  constructor() {
    this.scoreWeighting = {
      scuEvals: 0,
      rmp: 0,
    };
    this.preferredSectionTimeRange = {
      startHour: 0,
      startMinute: 0,
      endHour: 0,
      endMinute: 0,
    };
    this.courseTracking = true;
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

export const notFoundError = (error) => {
  return {
    statusCode: 404,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: error,
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
