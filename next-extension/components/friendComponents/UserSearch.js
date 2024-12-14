import { useState } from "react";
import {
  Autocomplete,
  TextField,
  Button,
  CircularProgress,
  Typography,
} from "@mui/material";

export default function UserSearch({ onError = () => {} }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

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

  return (
    <>
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
          "&:hover": {
            backgroundColor: "#5a2c28",
          },
        }}
      >
        Send Invite
      </Button>
    </>
  );
}
