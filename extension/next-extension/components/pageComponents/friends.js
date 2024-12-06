import React, { useState, useEffect, useRef } from "react";
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
  const [error, setError] = useState(null);
  const errorTimeout = useRef(null);

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
        setFriends(Object.values(friends));
      } catch (error) {
        console.error("Error fetching friend data:", error);
      }
    };

    fetchFriendData();
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (
        namespace === "local" &&
        (changes.friendRequestsIn ||
          changes.friendRequestsOut ||
          changes.friends)
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
      const updateError = await chrome.runtime.sendMessage(message);
      if (updateError) {
        onError(updateError);
      }
      setSelectedUser(null);
    } catch (error) {
      console.error("Error sending friend request:", error);
    }
  };

  const onError = (message) => {
    setError(message);
    if (errorTimeout.current) clearTimeout(errorTimeout.current);
    errorTimeout.current = setTimeout(() => {
      setError(null);
    }, 5000);
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
        <FriendsAccordion
          friends={friends}
          onError={onError}
        />
        <RequestsAccordion
          requestsIn={requestsIn}
          requestsOut={requestsOut}
          onError={onError}
        />
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
            sx={{
              backgroundColor: "#703331",
              '&:hover': {
                backgroundColor: "#5a2c28",
              }
            }}
          >
            Send Invite
          </Button>
        </Box>
        {error && <Typography color="error">{error}</Typography>}
        <br />
        <br />
      </Box>
    </AuthWrapper>
  );
}
