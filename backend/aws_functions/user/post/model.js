class User {
  id;
  publicInfo;
  preferences;
  friends;
  incomingFriendRequests;
  outgoingFriendRequests;
  constructor() {
    this.publicInfo = new PublicInfo();
    this.preferences = new Preferences();
    this.friends = new Set().add(new User());
    this.incomingFriendRequests = new Set();
    this.outgoingFriendRequests = new Set();
  }
}

class PublicInfo {
  constructor() {
    this.profile = new Profile();
    this.coursesTaken = new Set();
    this.sectionsInterested = new Set();
  }
}

class Profile {
  name;
  photoUrl;
  email;
  notificationIds = new Set();
}

class Preferences {
  startHour;
  startMinute;
  endHour;
  endMinute;
  percentRateMyProfessors;
  percentScuEvals;
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
