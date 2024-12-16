import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Stack,
  TextField,
  Snackbar,
  Alert,
} from "@mui/material";
import { Edit } from "@mui/icons-material";
import { compress } from "compress.js/src/compress.js";

export default function ProfileSection({ userInfo }) {
  const [name, setName] = useState(userInfo.name || "");
  const [photoUrl, setPhotoUrl] = useState(
    getUniquePhotoUrl(userInfo.photoUrl) ||
      "https://scu-schedule-helper.s3.amazonaws.com/default-avatar.png",
  );
  const [isEditingName, setIsEditingName] = useState(false);
  const [error, setError] = useState(null);
  const [showActionCompletedMessage, setShowActionCompletedMessage] =
    useState(false);

  function getUniquePhotoUrl(url) {
    if (!url) return null;
    return `${url}?${new Date().getTime()}`;
  }

  useEffect(() => {
    setName(userInfo.name || "");
    setPhotoUrl(getUniquePhotoUrl(userInfo.photoUrl));
  }, [userInfo]);

  const handlePhotoChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (
      !file.type.startsWith("image/png") &&
      !file.type.startsWith("image/jpeg")
    ) {
      setError("File must be a png/jpg image.");
      setShowActionCompletedMessage(true);
      return;
    }
    const compressedFile = await compress(file, {
      quality: 0.9,
      crop: true,
      aspectRatio: "1:1",
      maxWidth: 1000,
      maxHeight: 1000,
    });
    submitPersonal(compressedFile, null);
  };

  const submitPersonal = async (photoFile, newName) => {
    const message = {
      type: "updateUser",
      updateItems: {
        personal: {
          photo: {
            size: photoFile ? photoFile.size : 0,
          },
          name: newName,
        },
      },
    };
    if (!photoFile) delete message.updateItems.personal.photo;
    if (!newName) delete message.updateItems.personal.newName;
    const response = await chrome.runtime.sendMessage(message);
    if (response && response.message && !response.message.includes("success")) {
      setError(response.message);
    } else {
      setError(null);
      setIsEditingName(false);
      if (response && response.presignedUploadUrl) {
        const uploadResponse = await fetch(response.presignedUploadUrl, {
          method: "PUT",
          body: photoFile,
          headers: {
            "Content-Type": "image/jpeg",
            "Content-Length": photoFile.size,
          },
        });
        if (!uploadResponse.ok)
          setError(
            "Failed to upload photo. Contact stephenwdean@gmail.com if this issue persists.",
          );
        else setPhotoUrl(getUniquePhotoUrl(userInfo.photoUrl));
      }
    }
    setShowActionCompletedMessage(true);
  };

  const handleNameChange = () => {
    if (name.trim() === "") {
      alert("Name cannot be empty!");
      return;
    }

    submitPersonal(null, name);
  };

  const cancelEditing = () => {
    setName(userInfo.name || "");
    setIsEditingName(false);
  };

  const handleInputChange = (e) => {
    const newName = e.target.value;
    setName(newName);
    if (newName !== userInfo.name) {
      setIsEditingName(true);
    }
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Stack direction="row" spacing={2} alignItems="center">
        <label htmlFor="profile-picture-upload" style={{ cursor: "pointer" }}>
          <Box
            sx={{
              position: "relative",
              width: "100px",
              height: "100px",
              borderRadius: "50%",
              border: "7px solid #802a25",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            <img
              src={photoUrl}
              alt={`${name || "User"}'s profile photo`}
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
              <Edit
                sx={{
                  color: "white",
                  fontSize: 25,
                }}
              />
            </Box>
          </Box>
        </label>

        <input
          type="file"
          id="profile-picture-upload"
          accept="image/png, image/jpeg"
          hidden
          onChange={handlePhotoChange}
        />
        <Stack direction="column" spacing={1} sx={{ flexGrow: 1 }}>
          <Typography variant="body1" sx={{ mb: "5px" }}>
            Preferred Name:
          </Typography>

          <TextField
            variant="outlined"
            value={name}
            onChange={handleInputChange}
            placeholder={userInfo.name || "Enter Name"}
            sx={{
              width: "250px",
              "& .MuiOutlinedInput-root": {
                height: "40px",
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
                  padding: "10px 12px",
                },
              },
            }}
          />

          <Box sx={{ height: "40px", mt: 1 }}>
            {isEditingName && (
              <Stack direction="row" spacing={2}>
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
                  Save
                </Button>
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
                  Cancel
                </Button>
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
          {error || "Updated successfully."}
        </Alert>
      </Snackbar>
    </Box>
  );
}
