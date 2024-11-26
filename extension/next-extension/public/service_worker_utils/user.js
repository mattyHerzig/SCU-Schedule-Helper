import { prodUserEndpoint } from "./constants.js";
import { fetchWithAuth, signOut } from "./authorization.js";

export async function refreshUserData(items = []) {
  const itemsQuery = items.length > 0 ? `?items=${items.join(",")}` : "";
  const response = await fetchWithAuth(`${prodUserEndpoint}/me${itemsQuery}`);

  if (!response || !response.ok) {
    return "Error fetching user data. Please try again later.";
  }
  const data = await response.json();
  const friends = {};
  const friendRequestsIn = {};
  const friendRequestsOut = {};
  for (const friendObj of data.friends) {
    friends[friendObj.id] = friendObj;
  }
  for (const friendReqObj of data.friendRequests) {
    if (friendReqObj.type === "incoming") {
      friendRequestsIn[friendReqObj.id] = friendReqObj;
    }
    if (friendReqObj.type === "outgoing") {
      friendRequestsOut[friendReqObj.id] = friendReqObj;
    }
  }
  await chrome.storage.local.set({
    userInfo: {
      id: data.id,
      name: data.name,
      photoUrl: data.photoUrl,
      preferences: data.preferences,
      coursesTaken: data.coursesTaken,
      interestedSections: data.interestedSections,
    },
    friends,
    friendRequestsIn,
    friendRequestsOut,
  });
  return null;
}

export async function updateUser(updateItems) {
  const response = await fetchWithAuth(prodUserEndpoint, {
    method: "PUT",
    body: JSON.stringify(updateItems),
  });
  if (!response) {
    return "Error updating user data. Please try again later.";
  }
  const data = await response.json();
  if (response.status !== 200) {
    return data.message;
  }
  await updateLocalCache(updateItems);
  return null;
}

async function updateLocalCache(updateItems) {
  const userInfo = (await chrome.storage.local.get("userInfo"))?.userInfo || {};
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
  }
  if (updateItems.coursesTaken) {
    const coursesTaken = new Set(userInfo.coursesTaken);
    userInfo.coursesTaken.concat(updateItems.coursesTaken.add);
    updateItems.coursesTaken.remove.forEach((course) => {
      coursesTaken.delete(course);
    });
    userInfo.coursesTaken = Array.from(coursesTaken);
  }
  if (updateItems.interestedSections) {
    const interestedSections = new Set(userInfo.interestedSections);
    userInfo.interestedSections.concat(updateItems.interestedSections.add);
    updateItems.interestedSections.remove.forEach((section) => {
      interestedSections.delete(section);
    });
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
  const friendProfile = {
    ...userData,
  };
  const currentFriends =
    (await chrome.storage.local.get("friends"))?.friends || {};
  const currentFriendRequestsOut =
    (await chrome.storage.local.get("friendRequestsOut"))?.friendRequestsOut ||
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

export async function addFriendRequestLocally(friendId, type) {
  const getUserPublicProfileResponse = await fetchWithAuth(
    `${prodUserEndpoint}/${friendId}`,
  );
  if (!getUserPublicProfileResponse || !getUserPublicProfileResponse.ok) {
    return "Error adding friend. Please try again later.";
  }
  const userData = await getFriendProfileResponse.json();
  const friendRequestsKey =
    type === "incoming" ? "friendRequestsIn" : "friendRequestsOut";
  const existingFriendRequests =
    (await chrome.storage.local.get(friendRequestsKey))?.[friendRequestsKey] ||
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
    (await chrome.storage.local.get("friends"))?.friends || {};
  delete currentFriends[friendId];
  await chrome.storage.local.set({ friends: currentFriends });
}

export async function removeFriendRequestLocally(friendId, type) {
  const friendRequestsKey =
    type === "incoming" ? "friendRequestsIn" : "friendRequestsOut";
  const existingFriendRequests =
    (await chrome.storage.local.get(friendRequestsKey))?.[friendRequestsKey] ||
    {};
  delete existingFriendRequests[friendId];
  await chrome.storage.local.set({
    [friendRequestsKey]: existingFriendRequests,
  });
}

function getS3PhotoUrl(userId) {
  return `https://scu-schedule-helper.s3.amazonaws.com/u%23${userId}/photo`;
}
