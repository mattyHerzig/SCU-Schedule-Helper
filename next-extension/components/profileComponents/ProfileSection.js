import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Stack,
  TextField,
  Tooltip,
  Snackbar,
  Alert,
} from "@mui/material";
import { Close, Check, Edit } from "@mui/icons-material";

export default function ProfileSection({ userInfo }) {
  const [editedName, setEditedName] = useState(userInfo.name || "");
  const [isEditingName, setIsEditingName] = useState(false);
  const [error, setError] = useState(null);
  const [showActionCompletedMessage, setShowActionCompletedMessage] =
    useState(false);

  useEffect(() => {
    setEditedName(userInfo.name || "");
  }, [userInfo]);

  const handlePhotoChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Invalid file type. Please upload an image.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      submitPersonal(e.target.result.split(",")[1], userInfo.name);
    };
    reader.readAsDataURL(file);
  };

  const submitPersonal = (b64Photo, name) => {
    const message = {
      type: "updateUser",
      updateItems: {
        personal: {
          photo: b64Photo,
          name,
        },
      },
    };
    if (!b64Photo) delete message.updateItems.personal.photo;
    if (!name) delete message.updateItems.personal.name;

    chrome.runtime.sendMessage(message).then((errorMessage) => {
      if (errorMessage) {
        setError(errorMessage);
      } else {
        setError(null);
        setIsEditingName(false);
      }
      setShowActionCompletedMessage(true);
    });
  };

  const handleNameChange = () => {
    if (editedName.trim() === "") {
      alert("Name cannot be empty!");
      return;
    }

    submitPersonal(null, editedName);
  };

  const cancelEditing = () => {
    setEditedName(userInfo.name || "");
    setIsEditingName(false);
  };

  const handleInputChange = (e) => {
    const newName = e.target.value;
    setEditedName(newName);
    if (newName !== userInfo.name) {
      setIsEditingName(true); // Show buttons only if there is a change
    }
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Stack direction="row" spacing={2} alignItems="center">
        {/* Profile Picture Section */}
        <label htmlFor="profile-picture-upload" style={{ cursor: "pointer" }}>
          <Box
            sx={{
              position: "relative",
              width: "100px",
              height: "100px",
              borderRadius: "50%",
              border: "7px solid #802a25",
              overflow: "hidden",
              flexShrink: 0, // Ensures it doesn't resize
            }}
          >
            <img
              src={userInfo.photoUrl}
              alt={`${userInfo.name || "User"}'s profile`}
              style={{
                width: "100px",
                height: "100px",
                objectFit: "cover",
              }}
            />
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                backgroundColor: "rgba(0, 0, 0, 0.3)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                opacity: 0,
                transition: "opacity 0.1s",
                "&:hover": {
                  opacity: 1,
                },
              }}
            >
              <Edit htmlColor="white" />
            </Box>
          </Box>
        </label>

        <input
          type="file"
          id="profile-picture-upload"
          accept="image/*"
          hidden
          onChange={handlePhotoChange}
        />

        {/* Preferred Name Section */}
        <Stack direction="column" spacing={1} sx={{ flexGrow: 1 }}>
          <Typography variant="body1" sx={{ mb: "5px" }}>
            Preferred Name:
          </Typography>

          <TextField
            variant="outlined"
            value={editedName}
            onChange={handleInputChange}
            placeholder={userInfo.name || "Enter Name"}
            sx={{
              width: "250px",
              "& .MuiOutlinedInput-root": {
                height: "40px", // Custom height for the TextField
                "& fieldset": {
                  borderColor: "#802a25",
                },
                "&:hover fieldset": {
                  borderColor: "#671f1a",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#671f1a",
                },
                "& input": {
                  padding: "10px 12px", // Custom padding for input
                },
              },
            }}
          />

          <Box sx={{ height: "40px", mt: 1 }}>
            {isEditingName && (
              <Stack direction="row" spacing={2}>
                <Tooltip title="Save">
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleNameChange}
                    sx={{
                      backgroundColor: "#802a25",
                      color: "white",
                      "&:hover": {
                        backgroundColor: "#671f1a",
                      },
                    }}
                  >
                    <Check />
                  </Button>
                </Tooltip>
                <Tooltip title="Cancel">
                  <Button
                    variant="outlined"
                    onClick={cancelEditing}
                    sx={{
                      borderColor: "#802a25",
                      color: "#802a25",
                      "&:hover": {
                        borderColor: "#802a25",
                        backgroundColor: "#802a25",
                        color: "white",
                      },
                    }}
                  >
                    <Close />
                  </Button>
                </Tooltip>
              </Stack>
            )}
          </Box>
        </Stack>
      </Stack>

      <Snackbar
        open={showActionCompletedMessage}
        autoHideDuration={3000}
        onClose={() => setShowActionCompletedMessage(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setShowActionCompletedMessage(false)}
          severity={error ? "error" : "success"}
          sx={{ width: "100%" }}
        >
          {error || "Successfully updated"}
        </Alert>
      </Snackbar>
    </Box>
  );
}
