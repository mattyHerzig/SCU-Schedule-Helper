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

// PUT api.scu-schedule-helper.me/user/me/friend {
// "add" : [swdean, dduong]
// "remove" : [blah, blah]
//}

// PUT api.scu-schedule-helper.me/user/me/friend_req_out {
// "add" : [dduong]
// "remove" : [blah, blah]
//}
