import React, { useState, useRef } from "react";
import {
  Box,
  Typography,
  Button,
  Stack,
  TextField,
  Snackbar,
  Alert,
} from "@mui/material";
import EditIcon from '@mui/icons-material/Edit';

export default function ProfileSection({ userInfo, setUserInfo, setError }) {
  const [editedName, setEditedName] = useState(userInfo.name || "");
  const [isEditingName, setIsEditingName] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const debounceTimerRef = useRef(null);

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
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const message = {
        type: "replacePhoto", 
        photoUrl: b64Photo ? `data:image/jpeg;base64,${b64Photo}` : null,
        isDefault: !b64Photo
      };

      chrome.runtime.sendMessage(message).then((response) => {
        if (response && response.success) {
          setError(null);
          setUserInfo(prevInfo => ({
            ...prevInfo,
            photoUrl: b64Photo ? `data:image/jpeg;base64,${b64Photo}` : "https://scu-schedule-helper.s3.us-west-1.amazonaws.com/default-avatar.png",
            ...(name && { name }),
          }));

          setShowSuccessMessage(true);
          setIsEditingName(false);
        } else {
          setError(response?.error || "Photo update failed");
        }
      });
    }, 300);
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
      setIsEditingName(true); 
    }
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Stack direction="row" spacing={2} alignItems="center">
        

        <label 
          htmlFor="profile-picture-upload"
          style={{ cursor: "pointer" }}
        >
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
              <EditIcon 
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
          accept="image/*"
          hidden
          onChange={handlePhotoChange}
        />
        <Stack direction="column" spacing={1} sx={{ flexGrow: 1 }}>
          <Typography variant="body1" sx={{ mb: '5px' }}>Preferred Name:</Typography>

          <TextField
            variant="outlined"
            value={editedName}
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

          <Box sx={{ height: '40px', mt: 1 }}>
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
        open={showSuccessMessage}
        autoHideDuration={3000}
        onClose={() => setShowSuccessMessage(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setShowSuccessMessage(false)}
          severity="success"
          sx={{ width: '100%' }}
        >
          Successfully changed
        </Alert>
      </Snackbar>
    </Box>
  );
}
