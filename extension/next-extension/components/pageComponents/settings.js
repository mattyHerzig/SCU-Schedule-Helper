import { useState, useEffect, useRef } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import AuthWrapper from "./authWrapper";
import { clearCourseHistory } from "../../../../extension/next-extension/public/service_worker_utils/user.js";


export default function Settings() {
  const [userName, setUserName] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [profilePicture, setProfilePicture] = useState(null);
  const debounceTimerRef = useRef(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");

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
      const loggedIn = !!userInfo?.name;

      setIsLoggedIn(loggedIn);
      setUserName(userInfo?.name || null);
      setProfilePicture(userInfo?.photoUrl || null);
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
      const newPhotoUrl = e.target.result;
      setProfilePicture(newPhotoUrl);
      submitPersonal(newPhotoUrl, userName, null);
    };
    reader.readAsDataURL(file);
  };

  const submitPersonal = (newPhotoUrl, name, email) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const message = {
        type: "updateUser",
        updateItems: {
          personal: {
            photo_url: newPhotoUrl || profilePicture,
            name: name || userName,
            email: email || "placeholder@gmail.com", // Placeholder for now
          },
        },
        allowLocalOnly: true,
      };

      chrome.runtime.sendMessage(message).then((errorMessage) => {
        if (errorMessage) {
          setError(errorMessage);
        } else {
          setError(null);

          chrome.storage.local.get("userInfo", (data) => {
            const updatedUserInfo = {
              ...data.userInfo,
              photoUrl: newPhotoUrl || data.userInfo?.photoUrl,
              name: name || data.userInfo?.name,
              email: email || data.userInfo?.email,
            };

            chrome.storage.local.set({ userInfo: updatedUserInfo }, () => {
              console.log("Updated user info saved to Chrome storage.");
            });
          });
        }
      });
    }, 300);
  };

  const handleNameChange = (newName) => {
    if (newName.trim() === "") {
      alert("Name cannot be empty!");
      return;
    }

    submitPersonal(null, newName, null);
    setUserName(newName);
    setIsEditingName(false);
  };

  const cancelEditing = () => {
    setEditedName(userName); // Reset edited name to original
    setIsEditingName(false); // Exit edit mode
  };

  const handleSignIn = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const errorMsg = await chrome.runtime.sendMessage("signIn");
      if (!errorMsg) setError(null);
      else setError(errorMsg);
    } catch (error) {
      setError("Unknown error occurred while signing in. Please try again.");
    } finally {
      setIsLoading(false);
    }
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
      setError("Unknown error occurred while deleting account. Please try again.");
    }
  };

  const importCourseHistory = async () => {
    try {
      const errorMessage = await chrome.runtime.sendMessage("importCourseHistory");
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

  return (
    <AuthWrapper>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          overflow: "auto",
        }}
      >
        <Typography variant="h6" sx={{ mb: 2 }}>
          Settings
        </Typography>
        {/* Name Editing Section */}
        {isLoggedIn && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            {isEditingName ? (
              <>
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  style={{
                    padding: "5px",
                    borderRadius: "4px",
                    border: "1px solid #ccc",
                  }}
                />
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => handleNameChange(editedName)}
                >
                  Save
                </Button>
                <Button variant="outlined" onClick={cancelEditing}>
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Typography variant="body1">{userName || "Guest"}</Typography>
                <Button variant="text" onClick={() => setIsEditingName(true)}>
                  Edit
                </Button>
              </>
            )}
          </div>
        )}
        {/* Profile Picture */}
        {isLoggedIn && (
          <div style={{ textAlign: "center", marginBottom: "16px" }}>
            <label htmlFor="profile-picture-upload" style={{ cursor: "pointer" }}>
              <img
                src={profilePicture || "https://via.placeholder.com/100"}
                alt={`${userName || "User"}'s profile`}
                style={{
                  width: "100px",
                  height: "100px",
                  borderRadius: "50%",
                  border: "2px solid #ccc",
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
          </div>
        )}
        {/* Buttons */}
        <Stack spacing={2} sx={{ width: "100%" }}>
          <Button
            variant="contained"
            onClick={handleSignIn}
            disabled={isLoggedIn || isLoading}
          >
            {isLoggedIn ? "Logged In" : "Login with Google"}
          </Button>
          {isLoggedIn && (
            <>
              <Button onClick={importCourseHistory}>Import Course History</Button>
              <Button onClick={deleteCourseHistory}>Delete Course History</Button>
              <Button onClick={signOut}>Sign Out</Button>
              <Button variant="contained" color="error" onClick={deleteAccount}>
                Delete My Account
              </Button>
            </>
          )}
        </Stack>
      </Box>
    </AuthWrapper>
  );
}
