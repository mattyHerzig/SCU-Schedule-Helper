import { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Button,
  Stack,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import AuthWrapper from "./authWrapper";
import UserCourseDetails from "../settingsComponents/UserCourseDetails";
import { clearCourseHistory } from "../../public/utils/user.js";

export default function Settings() {
  const [userInfo, setUserInfo] = useState({});
  const [error, setError] = useState(null);
  const debounceTimerRef = useRef(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [openDialog, setOpenDialog] = useState(false); // Dialog state

  useEffect(() => {
    const storageListener = (changes, namespace) => {
      if (namespace === "local" && changes.userInfo) {
        checkUserInfo();
      }
    };
    chrome.storage.onChanged.addListener(storageListener);
    checkUserInfo();
    return () => {
      chrome.storage.onChanged.removeListener(storageListener);
    };
  }, []);

  const checkUserInfo = async () => {
    try {
      const data = await chrome.storage.local.get("userInfo");
      const userInfo = data.userInfo;

      setUserInfo(userInfo);
      setEditedName(userInfo.name || "");
    } catch (error) {
      console.error("Error checking user info:", error);
    }
  };

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
        }
      });
    }, 300);
  };

  const handleNameChange = (newName) => {
    if (newName.trim() === "") {
      alert("Name cannot be empty!");
      return;
    }

    submitPersonal(null, newName);
    setIsEditingName(false);
  };

  const cancelEditing = () => {
    setEditedName(userInfo.name || "");
    setIsEditingName(false);
  };

  const signOut = async () => {
    try {
      await chrome.runtime.sendMessage("signOut");
      setError(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const deleteAccount = async () => {
    try {
      const errorMessage = await chrome.runtime.sendMessage("deleteAccount");
      setError(errorMessage || null);
    } catch (error) {
      setError(
        "Unknown error occurred while deleting account. Please try again.",
      );
    }
  };

  const importCurrentCourses = async () => {
    try {
      const errorMessage =
        await chrome.runtime.sendMessage("importCurrentCourses");
      setError(errorMessage || null);
    } catch (error) {
      console.error("Error adding current courses:", error);
      setError("An unknown error occurred while adding current courses.");
    }
  };

  const importCourseHistory = async () => {
    try {
      const errorMessage = await chrome.runtime.sendMessage(
        "importCourseHistory",
      );
      setError(errorMessage || null);
    } catch (error) {
      console.error("Error importing course history:", error);
      setError("Unknown error occurred while importing course history.");
    }
  };

  const deleteCourseHistory = async () => {
    try {
      const error = await clearCourseHistory();
      if (error) {
        setError(error);
      } else {
        setError(null);
      }
    } catch (error) {
      console.error("Error clearing course history:", error);
      setError("An unknown error occurred while clearing course history.");
    }
  };

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  // Close Dialog without deleting the account
  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  // Confirm account deletion
  const handleConfirmDeleteAccount = async () => {
    await deleteAccount();
    setOpenDialog(false); // Close dialog after deletion
  };
  return (
    <AuthWrapper>
      <Box sx={{ padding: 2, boxSizing: "border-box" }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Settings
        </Typography>

        {/* Name Editing Section */}
        <Box sx={{ mb: 2 }}>
          {!isEditingName ? (
            <Stack direction="row" spacing={2} alignItems="center">
              <Stack direction="column" spacing={1} alignItems="flex-start">
                <Typography variant="body1">Preferred Name:</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body1">{userInfo.name}</Typography>
                  <Button
                    variant="text"
                    sx={{
                      backgroundColor: "#802a25",
                      color: "white",
                      "&:hover": {
                        backgroundColor: "#671f1a",
                      },
                    }}
                    onClick={() => setIsEditingName(true)}
                  >
                    Edit
                  </Button>
                </Stack>
              </Stack>

              <label
                htmlFor="profile-picture-upload"
                style={{ cursor: "pointer", marginLeft: "auto" }}
              >
                <img
                  src={userInfo.photoUrl}
                  alt={`${userInfo.name || "User"}'s profile`}
                  style={{
                    width: "100px",
                    height: "100px",
                    borderRadius: "50%",
                    border: "7px solid #802a25",
                    objectFit: "cover",
                  }}
                />
              </label>

              <input
                type="file"
                id="profile-picture-upload"
                accept="image/*"
                hidden
                onChange={handlePhotoChange}
              />
            </Stack>
          ) : (
            <Stack direction="column" spacing={2}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Stack direction="column" spacing={1} sx={{ width: "100%" }}>
                  <Typography variant="body1" sx={{ textAlign: "left" }}>
                    Preferred Name:
                  </Typography>
                  <TextField
                    variant="outlined"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    placeholder={userInfo.name}
                    sx={{
                      width: "250px",
                      "& .MuiOutlinedInput-root": {
                        "& fieldset": {
                          borderColor: "#802a25",
                        },
                        "&:hover fieldset": {
                          borderColor: "#671f1a",
                        },
                        "&.Mui-focused fieldset": {
                          borderColor: "#671f1a",
                        },
                      },
                    }}
                  />
                </Stack>
                <label
                  htmlFor="profile-picture-upload"
                  style={{ cursor: "pointer" }}
                >
                  <img
                    src={userInfo.photoUrl}
                    alt={`${userInfo.name || "User"}'s profile`}
                    style={{
                      width: "100px",
                      height: "100px",
                      borderRadius: "50%",
                      border: "7px solid #802a25",
                      objectFit: "cover",
                    }}
                  />
                </label>
                <input
                  type="file"
                  id="profile-picture-upload"
                  accept="image/*"
                  hidden
                  onChange={handlePhotoChange}
                />
              </Stack>
              <Box>
                <Stack direction="row" spacing={2}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => handleNameChange(editedName)}
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
              </Box>
            </Stack>
          )}
        </Box>

        {/* User Course Details Accordion */}
        <Box sx={{ mb: 3 }}>
          <UserCourseDetails />
        </Box>

        {/* Button Stack */}
        <Stack spacing={2} sx={{ width: "100%" }}>
          <Button
            sx={{
              backgroundColor: "#802a25",
              color: "white",
              "&:hover": {
                backgroundColor: "#671f1a",
              },
            }}
            onClick={importCurrentCourses}
          >
            Import Current Courses
          </Button>
          <Button
            sx={{
              backgroundColor: "#802a25",
              color: "white",
              "&:hover": {
                backgroundColor: "#671f1a",
              },
            }}
            onClick={importCourseHistory}
          >
            Import Course History
          </Button>
          <Button
            sx={{
              backgroundColor: "#802a25",
              color: "white",
              "&:hover": {
                backgroundColor: "#671f1a",
              },
            }}
            onClick={deleteCourseHistory}
          >
            Delete Course History
          </Button>
          <Button
            sx={{
              backgroundColor: "#802a25",
              color: "white",
              "&:hover": {
                backgroundColor: "#671f1a",
              },
            }}
            onClick={signOut}
          >
            Sign Out
          </Button>
          <Button
            sx={{
              backgroundColor: "red", // Red color for Delete Account
              color: "white",
              "&:hover": {
                backgroundColor: "#ff4d4d", // Lighter red on hover
              },
            }}
            onClick={handleOpenDialog}
          >
            Delete Account
          </Button>
        </Stack>
      </Box>

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to delete your account?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="primary">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDeleteAccount}
            color="secondary"
            autoFocus
          >
            Delete Account
          </Button>
        </DialogActions>
      </Dialog>
    </AuthWrapper>
  );
}
