import {
  courseTakenPattern,
  interestedSectionPattern,
  prodUserEndpoint,
} from "./constants.js";
import { fetchWithAuth, signOut } from "./authorization.js";

export async function refreshUserData(items = []) {
  const itemsQuery = items.length > 0 ? `?items=${items.join(",")}` : "";
  const response = await fetchWithAuth(`${prodUserEndpoint}/me${itemsQuery}`);
  if (!response || !response.ok) {
    return "Error fetching user data. Please try again later.";
  }
  const data = await response.json();
  if (items.includes("friends") || items.length === 0) {
    const friends = {};
    for (const friendObj of data.friends) {
      friends[friendObj.id] = friendObj;
    }
    await chrome.storage.local.set({
      friends,
    });
  }
  if (items.includes("friendRequests") || items.length === 0) {
    const friendRequestsIn = {};
    const friendRequestsOut = {};
    for (const friendReqObj of data.friendRequests) {
      if (friendReqObj.type === "incoming") {
        friendRequestsIn[friendReqObj.id] = friendReqObj;
      }
      if (friendReqObj.type === "outgoing") {
        friendRequestsOut[friendReqObj.id] = friendReqObj;
      }
    }
    await chrome.storage.local.set({
      friendRequestsIn,
      friendRequestsOut,
    });
  }
  const currentUserInfo =
    (await chrome.storage.local.get("userInfo")).userInfo || {};
  if (items.includes("personal") || items.length === 0) {
    currentUserInfo.id = data.id;
    currentUserInfo.name = data.name;
    currentUserInfo.photoUrl = data.photoUrl;
  }
  if (items.includes("preferences") || items.length === 0) {
    currentUserInfo.preferences = data.preferences;
  }
  if (items.includes("coursesTaken") || items.length === 0) {
    currentUserInfo.coursesTaken = data.coursesTaken;
  }
  if (items.includes("interestedSections") || items.length === 0) {
    currentUserInfo.interestedSections = data.interestedSections;
  }
  await chrome.storage.local.set({
    userInfo: {
      ...currentUserInfo,
    },
  });
  return null;
}

export async function updateUser(updateItems) {
  const response = await fetchWithAuth(prodUserEndpoint, {
    method: "PUT",
    body: JSON.stringify(updateItems),
  });
  if (!response) {
    return "Error updating user data (are you signed in?)";
  }
  const data = await response.json();
  if (!response.ok) {
    if (data.message) return data.message;
    return "Error updating user data. Please try again later.";
  }
  await updateLocalCache(updateItems);
  return null;
}

async function updateLocalCache(updateItems) {
  const userInfo = (await chrome.storage.local.get("userInfo")).userInfo || {};
  if (updateItems.personal) {
    userInfo.name = updateItems.personal.name;
    if (updateItems.personal.photoUrl === "default")
      userInfo.photoUrl =
        "https://scu-schedule-helper.s3.us-west-1.amazonaws.com/default-avatar.png";
    if (updateItems.personal.photo) {
      userInfo.photoUrl = getS3PhotoUrl(userId);
    }
  }
  if (updateItems.preferences) {
    if (updateItems.preferences.scoreWeighting) {
      userInfo.preferences.scoreWeighting =
        updateItems.preferences.scoreWeighting;
    }
    if (updateItems.preferences.preferredSectionTimeRange) {
      userInfo.preferences.preferredSectionTimeRange =
        updateItems.preferences.preferredSectionTimeRange;
    }
    if (updateItems.preferences.courseTracking) {
      userInfo.preferences.courseTracking =
        updateItems.preferences.courseTracking;
    }
  }
  if (updateItems.coursesTaken) {
    userInfo.coursesTaken = userInfo.coursesTaken.concat(
      updateItems.coursesTaken.add,
    );
    const coursesTaken = new Set(userInfo.coursesTaken);
    if (updateItems.coursesTaken.remove)
      for (const course of updateItems.coursesTaken.remove)
        coursesTaken.delete(course);
    userInfo.coursesTaken = Array.from(coursesTaken);
  }
  if (updateItems.interestedSections) {
    userInfo.interestedSections = userInfo.interestedSections.concat(
      updateItems.interestedSections.add,
    );
    const interestedSections = new Set(userInfo.interestedSections);
    if (updateItems.interestedSections.remove)
      for (const section of updateItems.interestedSections.remove)
        interestedSections.delete(section);
    userInfo.interestedSections = Array.from(interestedSections);
  }
  if (updateItems.friends) {
    if (updateItems.friends.add) {
      for (const friendId of updateItems.friends.add) {
        await addFriendLocally(friendId);
      }
    }
    if (updateItems.friends.remove) {
      for (const friendId of updateItems.friends.remove) {
        await removeFriendLocally(friendId);
      }
    }
  }
  if (updateItems.friendRequests) {
    if (updateItems.friendRequests.send) {
      for (const friendId of updateItems.friendRequests.send) {
        await addFriendRequestLocally(friendId, "outgoing");
      }
    }
    if (updateItems.friendRequests.removeIncoming) {
      for (const friendId of updateItems.friendRequests.removeIncoming) {
        await removeFriendRequestLocally(friendId, "incoming");
      }
    }
    if (updateItems.friendRequests.removeOutgoing) {
      for (const friendId of updateItems.friendRequests.removeOutgoing) {
        await removeFriendRequestLocally(friendId, "outgoing");
      }
    }
  }
  await chrome.storage.local.set({
    userInfo: {
      ...userInfo,
    },
  });
}

export async function deleteAccount() {
  const deleteResponse = await fetchWithAuth(prodUserEndpoint, {
    method: "DELETE",
  });
  if (!deleteResponse || !deleteResponse.ok) {
    return "Error deleting account. Please try again later.";
  }
  await signOut();
  return null;
}

export async function addFriendLocally(friendId) {
  const getFriendProfileResponse = await fetchWithAuth(
    `${prodUserEndpoint}/${friendId}`,
  );
  if (!getFriendProfileResponse || !getFriendProfileResponse.ok) {
    return "Error adding friend. Please try again later.";
  }
  const userData = await getFriendProfileResponse.json();
  if (!userData.coursesTaken || !userData.interestedSections) {
    return "Error adding friend.";
  }
  await updateFriendCourseAndSectionIndexes(
    friendId,
    userData.coursesTaken,
    userData.interestedSections,
  );
  const friendProfile = {
    ...userData,
  };
  const currentFriends =
    (await chrome.storage.local.get("friends")).friends || {};
  const currentFriendRequestsOut =
    (await chrome.storage.local.get("friendRequestsOut")).friendRequestsOut ||
    {};
  delete currentFriendRequestsOut.friendRequestsOut[friendId];
  await chrome.storage.local.set({
    friends: {
      ...currentFriends,
      [friendId]: friendProfile,
    },
    friendRequestsOut: currentFriendRequestsOut.friendRequestsOut,
  });
  return null;
}

export async function updateFriendCourseAndSectionIndexes(
  friendId,
  coursesTaken,
  interestedSections,
) {
  coursesTaken = coursesTaken || [];
  interestedSections = interestedSections || [];
  const friendCoursesTaken =
    (await chrome.storage.local.get("friendCoursesTaken")).friendCoursesTaken ||
    {};
  for (const course of coursesTaken) {
    const courseMatch = courseTakenPattern.exec(course.courseCode);
    if (!courseMatch) {
      continue;
    }
    const profName = courseMatch[1];
    const courseCode = courseMatch[2].replace(/\s/g, "");
    const curCourseIndex = friendCoursesTaken[courseCode] || {};
    const curProfIndex = friendCoursesTaken[profName] || {};
    curCourseIndex[friendId] = course; // A friend should only have one course entry per course code.
    curProfIndex[friendId] = curProfIndex[friendId] || [];
    curProfIndex[friendId].push(course);
    friendCoursesTaken[courseCode] = curCourseIndex;
    friendCoursesTaken[profName] = curProfIndex;
  }
  const friendInterestedSections =
    (await chrome.storage.local.get("friendInterestedSections"))
      .friendInterestedSections || {};
  for (const section of interestedSections) {
    const sectionMatch = interestedSectionPattern.exec(section);
    if (!sectionMatch) {
      continue;
    }
    const profName = sectionMatch[1];
    const courseCode = sectionFullString
      .substring(0, sectionMatch[2].indexOf("-"))
      .replace(/\s/g, "");
    curCourseIndex = friendInterestedSections[courseCode] || {};
    curProfIndex = friendInterestedSections[profName] || {};
    curCourseIndex[friendId] = section; // A friend should only have one section entry per course code.
    curProfIndex[friendId] = curProfIndex[friendId] || [];
    curProfIndex[friendId].push(section);
    friendInterestedSections[courseCode] = curCourseIndex;
    friendInterestedSections[profName] = curProfIndex;
  }
  await chrome.storage.local.set({
    friendCoursesTaken,
    friendInterestedSections,
  });
}

export async function clearFriendCourseAndSectionIndexes(friendId) {
  const friendCoursesTaken =
    (await chrome.storage.local.get("friendCoursesTaken")).friendCoursesTaken ||
    {};
  const friendInterestedSections =
    (await chrome.storage.local.get("friendInterestedSections"))
      .friendInterestedSections || {};
  for (const courseCode in friendCoursesTaken) {
    if (friendCoursesTaken[courseCode][friendId]) {
      delete friendCoursesTaken[courseCode][friendId];
    }
  }
  for (const profName in friendCoursesTaken) {
    if (friendCoursesTaken[profName][friendId]) {
      delete friendCoursesTaken[profName][friendId];
    }
  }
  for (const courseCode in friendInterestedSections) {
    if (friendInterestedSections[courseCode][friendId]) {
      delete friendInterestedSections[courseCode][friendId];
    }
  }
  for (const profName in friendInterestedSections) {
    if (friendInterestedSections[profName][friendId]) {
      delete friendInterestedSections[profName][friendId];
    }
  }
  await chrome.storage.local.set({
    friendCoursesTaken,
    friendInterestedSections,
  });
}

export async function addFriendRequestLocally(friendId, type) {
  const getUserPublicProfileResponse = await fetchWithAuth(
    `${prodUserEndpoint}/${friendId}`,
  );
  if (!getUserPublicProfileResponse || !getUserPublicProfileResponse.ok) {
    return "Error adding friend. Please try again later.";
  }
  const userData = await getUserPublicProfileResponse.json();
  const friendRequestsKey =
    type === "incoming" ? "friendRequestsIn" : "friendRequestsOut";
  const existingFriendRequests =
    (await chrome.storage.local.get(friendRequestsKey))[friendRequestsKey] ||
    {};
  existingFriendRequests[friendId] = {
    ...userData,
  };
  await chrome.storage.local.set({
    [friendRequestsKey]: existingFriendRequests,
  });
}

export async function removeFriendLocally(friendId) {
  const currentFriends =
    (await chrome.storage.local.get("friends")).friends || {};
  delete currentFriends[friendId];
  await chrome.storage.local.set({ friends: currentFriends });
  await clearFriendCourseAndSectionIndexes(friendId);
}

export async function removeFriendRequestLocally(friendId, type) {
  const friendRequestsKey =
    type === "incoming" ? "friendRequestsIn" : "friendRequestsOut";
  const existingFriendRequests =
    (await chrome.storage.local.get(friendRequestsKey))[friendRequestsKey] ||
    {};
  delete existingFriendRequests[friendId];
  await chrome.storage.local.set({
    [friendRequestsKey]: existingFriendRequests,
  });
}

export async function refreshInterestedSections() {
  // Check the expiration date of the interestedSections, delete if expired, and also delete from the remote server.
  const userInfo = (await chrome.storage.local.get("userInfo")).userInfo || {};
  const interestedSections = userInfo.interestedSections || [];
  for (const section of interestedSections) {
    const sectionMatch = interestedSectionPattern.exec(section);
    if (!sectionMatch) {
      continue;
    }
    const expirationDate = sectionMatch[4];
    if (new Date() > new Date(expirationDate)) {
      await updateUser({ interestedSections: { remove: [section] } });
    }
  }
}

export async function queryUserByName(name) {
  const response = await fetchWithAuth(
    `${prodUserEndpoint}/query?name=${encodeURIComponent(name)}`,
  );
  if (!response || !response.ok) {
    return "Error fetching user data. Please try again later.";
  }
  const data = await response.json();
  return data;
}

function getS3PhotoUrl(userId) {
  return `https://scu-schedule-helper.s3.amazonaws.com/u%23${userId}/photo`;
}
