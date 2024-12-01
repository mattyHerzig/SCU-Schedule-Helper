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
  const [requests, setRequests] = useState([]);

 useEffect(() => {
  const fetchFriendData = async () => {
    try {
      const { friendRequestsIn, friendRequestsOut, friends: friendsList } = 
        await chrome.storage.local.get([
          'friendRequestsIn', 
          'friendRequestsOut', 
          'friends'
        ]);

      console.log('Outgoing friend requests:', friendRequestsOut);

      const incomingRequests = Object.entries(friendRequestsIn || {}).map(([id, profile]) => ({
        id, 
        ...profile 
      }));
      setRequests(incomingRequests);

      // Transform friends data
      const transformedFriends = Object.entries(friendsList || {}).map(([id, profile]) => ({
        id,  
        ...profile, 
        expanded: false,
        courses: {
          interested: profile.interestedSections?.map(encodedCourse => {
            const courseMatch = encodedCourse.match(/P{([^}]+)}(?:C{([^}]+)}|S{([^}]+)})/);
            return courseMatch ? {
              courseCode: courseMatch[2] || courseMatch[3],
              courseName: courseMatch[2] || courseMatch[3],
              professor: courseMatch[1],
            } : null;
          }).filter(Boolean) || [],
          taken: profile.coursesTaken?.map(encodedCourse => {
            const courseMatch = encodedCourse.match(/P{([^}]+)}(?:C{([^}]+)}|S{([^}]+)})/);
            return courseMatch ? {
              courseCode: courseMatch[2] || courseMatch[3],
              courseName: courseMatch[2] || courseMatch[3],
              professor: courseMatch[1],
            } : null;
          }).filter(Boolean) || []
        }
      }));
      setFriends(transformedFriends);
    } catch (error) {
      console.error('Error fetching friend data:', error);
    }
  };

  fetchFriendData();
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
      console.error('Error searching users:', error);
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

  console.log("Message sent to updateUser:", message);

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
        <Box
          sx={{
            flexDirection: "column",
            display: "flex",
          }}
        >
          <Typography variant="h6" sx={{ mb: 2 }}>
            Search user
          </Typography>
          <Autocomplete
            fullWidth
            options={users}
            loading={searchLoading}
            getOptionLabel={(option) => `${option.name} (${option.email})`}
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
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {searchLoading ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
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

        <RequestsAccordion
          requests={requests}
          setRequests={setRequests}
          setFriends={setFriends}
        />
        <FriendsAccordion 
          friends={friends} 
          setFriends={setFriends} 
        />
      </Box>
    </AuthWrapper>
  );
}