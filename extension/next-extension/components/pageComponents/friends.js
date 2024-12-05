import React, { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import AuthWrapper from "./authWrapper";
import FriendsAccordion from "../friendComponents/FriendsAccordion";
import RequestsAccordion from "../friendComponents/RequestsAccordion";

export default function Friends() {
  const [users, setUsers] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [friends, setFriends] = useState([]);
  const [requestsIn, setRequestsIn] = useState([]);
  const [requestsOut, setRequestsOut] = useState([]);

  useEffect(() => {
    const fetchFriendData = async () => {
      try {
        let { friendRequestsIn, friendRequestsOut, friends } =
          await chrome.storage.local.get([
            "friendRequestsIn",
            "friendRequestsOut",
            "friends",
          ]);

        friendRequestsIn ||= {};
        friendRequestsOut ||= {};
        friends ||= {};

        setRequestsOut(Object.values(friendRequestsOut));
        setRequestsIn(Object.values(friendRequestsIn));
        // Transform friends data
        const transformedFriends = Object.values(friends || {}).map(
          (profile) => {
            return {
              ...profile,
              expanded: false,
              courses: {
                interested:
                  Object.keys(profile.interestedSections)
                    .map((encodedCourse) => {
                      const courseMatch = encodedCourse.match(
                        /P{(.*?)}S{(.*?)}M{(.*?)}/,
                      );
                      const meetingPatternMatch =
                        courseMatch[3].match(/(.*) \| (.*) \| (.*)/);
                      const meetingPattern = `${meetingPatternMatch[1]} at ${meetingPatternMatch[2].replaceAll(" ", "").replaceAll(":00", "").toLowerCase()}`;
                      const indexOfDash = courseMatch[2].indexOf("-");
                      let indexOfEnd = courseMatch[2].indexOf("(-)");
                      if (indexOfEnd === -1) indexOfEnd = courseMatch[2].length;
                      const courseCode = courseMatch[2]
                        .substring(0, indexOfDash)
                        .replace(" ", "");
                      const professor = courseMatch[1];
                      const courseName = courseMatch[2]
                        .substring(indexOfDash + 1, indexOfEnd)
                        .trim();
                      return courseMatch
                        ? {
                            courseCode,
                            courseName,
                            professor,
                            meetingPattern,
                          }
                        : null;
                    })
                    .filter(Boolean) || [],
                taken: profile.coursesTaken
                  ?.map((encodedCourse) => {
                    const courseMatch = encodedCourse.match(
                      /P{(.*?)}C{(.*?)}T{(.*?)}/,
                    );
                    if (!courseMatch) return null;
                    const firstDash = courseMatch[2].indexOf("-");
                    let secondDash = courseMatch[2].indexOf("-", firstDash + 1);
                    if (secondDash === -1 || secondDash - firstDash > 5) {
                      secondDash = firstDash;
                    }
                    let indexOfEnd = courseMatch[2].indexOf("(-)");
                    if (indexOfEnd === -1) indexOfEnd = courseMatch[2].length;
                    const courseCode = courseMatch[2]
                      .substring(0, firstDash)
                      .replace(" ", "");
                    const professor = courseMatch[1] || "unknown";
                    const courseName = courseMatch[2]
                      .substring(secondDash + 1, indexOfEnd)
                      .trim();
                    return courseMatch
                      ? {
                          courseCode,
                          courseName,
                          professor,
                          quarter: courseMatch[3],
                        }
                      : null;
                  })
                  .sort(mostRecentTermFirst),
              },
            };
          },
        );

        setFriends(transformedFriends);
      } catch (error) {
        console.error("Error fetching friend data:", error);
      }
    };

    fetchFriendData();
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (
        (namespace === "local" && changes.friendRequestsIn) ||
        changes.friendRequestsOut ||
        changes.friends
      )
        fetchFriendData();
    });
  }, []);

  const searchUsersByName = async (name) => {
    if (!name || name.length < 1) {
      setUsers([]);
      return;
    }

    setSearchLoading(true);
    try {
      const foundUsers = await chrome.runtime.sendMessage({
        type: "queryUserByName",
        name: name,
      });

      setUsers(foundUsers || []);
    } catch (error) {
      console.error("Error searching users:", error);
      setUsers([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const sendFriendRequest = async () => {
    if (!selectedUser) return;

    const message = {
      type: "updateUser",
      updateItems: {
        friendRequests: {
          send: [selectedUser.id],
        },
      },
    };

    try {
      await chrome.runtime.sendMessage(message);
      setSelectedUser(null);
    } catch (error) {
      console.error("Error sending friend request:", error);
    }
  };

  return (
    <AuthWrapper>
      <Box
        sx={{
          overflow: "auto",
          padding: 2,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <FriendsAccordion friends={friends} setFriends={setFriends} />
        <RequestsAccordion requestsIn={requestsIn} requestsOut={requestsOut} />
        <Box
          sx={{
            flexDirection: "column",
            display: "flex",
          }}
        >
          <Typography variant="h6" sx={{ mb: 2 }}>
            Search Users
          </Typography>
          <Autocomplete
            fullWidth
            options={users}
            loading={searchLoading}
            getOptionLabel={(option) => `${option.name} (${option.id}@scu.edu)`}
            onInputChange={(_, newInputValue) => {
              searchUsersByName(newInputValue);
            }}
            onChange={(_, newValue) => {
              setSelectedUser(newValue);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Enter name"
                variant="outlined"
                slotProps={{
                  input: {
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {searchLoading ? (
                          <CircularProgress color="inherit" size={20} />
                        ) : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  },
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": {
                      borderColor: "#ccc",
                    },
                    "&:hover fieldset": {
                      borderColor: "#ccc",
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: "#703331",
                    },
                  },
                  "& .MuiInputLabel-root": {
                    color: "#ccc",
                  },
                  "& .MuiInputLabel-outlined-root": {
                    "&.Mui-focused": {
                      color: "#703331",
                    },
                  },
                  "& .Mui-focused.MuiInputLabel-root": {
                    color: "#703331",
                  },
                }}
              />
            )}
            sx={{ mb: 2 }}
          />
          <Button
            variant="contained"
            color="primary"
            fullWidth
            disabled={!selectedUser}
            onClick={sendFriendRequest}
          >
            Send Invite
          </Button>
        </Box>
        <br />
        <br />
      </Box>
    </AuthWrapper>
  );
}

function mostRecentTermFirst(objA, objB) {
  const termA = objA.quarter || "Fall 2000";
  const termB = objB.quarter || "Fall 2000";
  const [quarterA, yearA] = termA.split(" ");
  const [quarterB, yearB] = termB.split(" ");
  if (yearA === yearB) {
    return quarterCompareDescending(quarterA, quarterB);
  } else {
    return parseInt(yearB) - parseInt(yearA);
  }
}

function quarterCompareDescending(quarterA, quarterB) {
  const quarters = ["Fall", "Summer", "Spring", "Winter"];
  return quarters.indexOf(quarterA) - quarters.indexOf(quarterB);
}
