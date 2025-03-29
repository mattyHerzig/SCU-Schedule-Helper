import React, { useState, useEffect } from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Button from "@mui/material/Button";
import Badge from "@mui/material/Badge";
import {
  Home,
  AccountCircle,
  Search,
  Tune,
  PersonAdd,
  Close,
} from "@mui/icons-material";

export const supportEmail = "swdean@scu.edu";

export default function NavMenu({ navigateToPage, openLandingPage }) {
  const [activeMenu, setActiveMenu] = useState("main");
  const [friendNotificationCount, setFriendNotificationCount] = useState(0);

  useEffect(() => {
    async function updateFriendNotificationCount() {
      try {
        const { friendRequestsIn } =
          await chrome.storage.local.get("friendRequestsIn");
        if (!friendRequestsIn) return;
        setFriendNotificationCount(Object.values(friendRequestsIn).length);
      } catch (error) {
        console.error("Error fetching friend data:", error);
      }
    }

    updateFriendNotificationCount();
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === "local" && changes.friendRequestsIn) {
        updateFriendNotificationCount();
      }
    });
  }, []);
  const menuItems = [
    { icon: <Search />, id: "main", action: () => navigateToPage("main") },
    {
      icon: <Tune />,
      id: "preferences",
      action: () => navigateToPage("preferences"),
    },
    {
      icon: <PersonAdd />,
      id: "friends",
      action: () => navigateToPage("friends"),
    },
    {
      icon: <AccountCircle />,
      id: "profile",
      action: () => navigateToPage("profile"),
    },
  ];

  useEffect(() => {
    setActiveMenu("main");
  }, []);

  function handleClose() {
    window.close();
  }

  return (
    <Box sx={{ mb: 1 }}>
      <AppBar
        position="static"
        sx={{
          backgroundColor: "white",
          boxShadow: "none",
          borderBottom: "2px solid #d1d1d1",
        }}
      >
        <Toolbar
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: "white",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              flexGrow: 1,
              minWidth: 0,
            }}
          >
            <Button
              sx={{
                position: "relative",
                color: "black",
                display: "flex",
                alignItems: "center",
                padding: "4px 4px",
                "&:hover": {
                  backgroundColor: "#f0f0f0",
                },
                "&:hover::after, &.active::after": {
                  backgroundColor: "#703331",
                  width: "calc(100% - 8px)", // Adjusted to match padding
                },
                "&::after": {
                  content: '""',
                  position: "absolute",
                  bottom: -2,
                  left: "4px", // Matches horizontal padding
                  height: "2px",
                  width: 0,
                  backgroundColor: "transparent",
                  transition: "background-color 0.3s, width 0.3s",
                },
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              onClick={() => {
                setActiveMenu("home");
                openLandingPage();
              }}
              className={activeMenu === "home" ? "active" : ""}
            >
              <Home
                sx={{
                  fontSize: 24,
                  color: activeMenu === "home" ? "#703331" : "#d1d1d1",
                  marginRight: 1,
                  transition: "color 0.3s",
                  "&:hover, button:hover &": {
                    color: "#703331", // Icon changes color on hover of the button or text
                  },
                }}
              />
              <Box
                sx={{
                  position: "relative",
                  color: activeMenu === "home" ? "#703331" : "black",
                  fontWeight: "bold",
                  fontSize: { xs: "0.9rem", sm: "1rem" },
                  // Removed hover underline effect for SCU Schedule Helper text
                  "&::after": {
                    content: '""',
                    position: "absolute",
                    bottom: -2,
                    left: "4px", // Matches horizontal padding
                    right: "4px", // Matches horizontal padding
                    height: "2px",
                    backgroundColor: "transparent", // No underline on hover
                    width: 0,
                    transition: "background-color 0.3s, width 0.3s",
                  },
                }}
              >
                SCU Schedule Helper
              </Box>
            </Button>
          </Box>

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-evenly", // Ensures buttons are evenly spaced
              alignItems: "center",
              flexGrow: 1,
              minWidth: 0,
              gap: "8px", // Added gap to create space between the icons
            }}
          >
            {menuItems.map((item) => (
              <Button
                key={item.id}
                sx={{
                  minWidth: "auto",
                  padding: "4px 4px", // Adjusted horizontal padding
                  position: "relative",
                  color: "black",
                  "&:hover": {
                    backgroundColor: "#f0f0f0",
                    "& .menu-icon": {
                      color: "#703331",
                    },
                  },
                  "&:hover::after, &.active::after": {
                    backgroundColor: "#703331",
                    width: "100%",
                  },
                  "&::after": {
                    content: '""',
                    position: "absolute",
                    bottom: -2,
                    left: 0,
                    right: 0,
                    height: "2px",
                    width: 0,
                    backgroundColor: "transparent",
                    transition: "background-color 0.3s, width 0.3s",
                  },
                }}
                onClick={() => {
                  setActiveMenu(item.id);
                  item.action();
                }}
                className={activeMenu === item.id ? "active" : ""}
              >
                {item.id === "friends" ? (
                  <Badge
                    badgeContent={friendNotificationCount}
                    sx={{
                      "& .MuiBadge-badge": {
                        fontSize: 10,
                        height: 15,
                        minWidth: 15,
                        backgroundColor: "firebrick",
                        color: "white",
                      },
                    }}
                  >
                    {React.cloneElement(item.icon, {
                      className: "menu-icon",
                      sx: {
                        fontSize: 24,
                        color: activeMenu === item.id ? "#703331" : "#d1d1d1",
                        transition: "color 0.3s",
                      },
                    })}
                  </Badge>
                ) : (
                  React.cloneElement(item.icon, {
                    className: "menu-icon",
                    sx: {
                      fontSize: 24,
                      color: activeMenu === item.id ? "#703331" : "#d1d1d1",
                      transition: "color 0.3s",
                    },
                  })
                )}
              </Button>
            ))}
          </Box>

          <Box>
            <Button
              onClick={handleClose}
              sx={{
                minWidth: "auto",
                color: "#703331",
                padding: "4px 8px",
                position: "relative",
                "&:hover": {
                  backgroundColor: "#f0f0f0",
                  "& .MuiSvgIcon-root": {
                    color: "#703331",
                  },
                  "&::after": {
                    backgroundColor: "#703331",
                    width: "100%",
                  },
                },
                "&::after": {
                  content: '""',
                  position: "absolute",
                  bottom: -2,
                  left: 0,
                  right: 0,
                  height: "2px",
                  width: 0,
                  backgroundColor: "transparent",
                  transition: "background-color 0.3s, width 0.3s",
                },
              }}
            >
              <Close
                sx={{
                  fontSize: 24,
                  color: "#d1d1d1",
                  transition: "color 0.3s",
                }}
              />
            </Button>
          </Box>
        </Toolbar>
      </AppBar>
    </Box>
  );
}
