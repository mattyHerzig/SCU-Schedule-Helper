import React, { useState, useEffect } from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Button from "@mui/material/Button";
import Badge from "@mui/material/Badge";
import Typography from "@mui/material/Typography";
import {
  Home,
  AccountCircle,
  Search,
  Tune,
  PersonAdd,
  Close,
  Campaign,
  CalendarMonth,
  ExpandMore,
  ExpandLess,
  Settings,
} from "@mui/icons-material";

export const supportEmail = "swdean@scu.edu";

export default function Menu({ navigateToPage, openLandingPage }) {
  const [activeMenu, setActiveMenu] = useState("main");
  const [friendNotificationCount, setFriendNotificationCount] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

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

  // Define all menu items organized in rows
  const topRowItems = [
    { 
      icon: <Search />, 
      id: "main", 
      label: "Search",
      action: () => navigateToPage("main") 
    },
    {
      icon: <PersonAdd />,
      id: "friends",
      label: "Friends",
      action: () => navigateToPage("friends"),
    },
    {
      icon: <AccountCircle />,
      id: "profile",
      label: "Profile",
      action: () => navigateToPage("profile"),
    },
  ];

  const bottomRowItems = [
    {
      icon: <Tune />,
      id: "preferences",
      label: "Preferences",
      action: () => navigateToPage("preferences"),
    },
    {
      icon: <CalendarMonth />,
      id: "courseplanner",
      label: "Course Planner",
      action: () => navigateToPage("courseplanner"),
    },
  ];

  useEffect(() => {
    setActiveMenu("main");
  }, []);

  function handleClose() {
    window.close();
  }

  function toggleExpanded() {
    setIsExpanded(!isExpanded);
  }

  const renderMenuButton = (item, isInRow = false) => (
    <Button
      key={item.id}
      sx={{
        padding: "6px 10px",
        position: "relative",
        color: "black",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: 1,
        borderRadius: "4px",
        backgroundColor: activeMenu === item.id ? "#f8f4f3" : "white",
        border: "1px solid #e0e0e0",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        minHeight: "32px",
        width: "auto",
        minWidth: "fit-content",
        "&:hover": {
          backgroundColor: "#f0f0f0",
          borderColor: "#703331",
          transform: "translateY(-1px)",
          boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
          "& .menu-icon": {
            color: "#703331",
          },
        },
        transition: "all 0.2s ease-in-out",
        ...(activeMenu === item.id && {
          borderColor: "#703331",
          boxShadow: "0 2px 6px rgba(112, 51, 49, 0.2)",
        }),
      }}
      onClick={() => {
        setActiveMenu(item.id);
        item.action();
      }}
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
              fontSize: 20,
              color: activeMenu === item.id ? "#703331" : "#d1d1d1",
              transition: "color 0.3s",
              flexShrink: 0,
            },
          })}
        </Badge>
      ) : (
        React.cloneElement(item.icon, {
          className: "menu-icon",
          sx: {
            fontSize: 20,
            color: activeMenu === item.id ? "#703331" : "#d1d1d1",
            transition: "color 0.3s",
            flexShrink: 0,
          },
        })
      )}
      <Typography
        variant="body2"
        sx={{
          color: activeMenu === item.id ? "#703331" : "black",
          fontWeight: activeMenu === item.id ? "bold" : "normal",
          fontSize: "0.75rem",
          whiteSpace: "nowrap",
        }}
      >
        {item.label}
      </Typography>
    </Button>
  );

  return (
    <Box sx={{ mb: 1 }}>
      {/* Announcement Bar */}
      <Box
        sx={{
          backgroundColor: "#f5f5f5",
          borderBottom: "1px solid #e0e0e0",
          py: 1,
          px: 2,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Campaign
            sx={{
              fontSize: 20,
              color: "#703331",
            }}
          />
          <Typography
            variant="body2"
            sx={{
              color: "#666",
              fontSize: "0.875rem",
            }}
          >
            Check out our latest features and updates!
          </Typography>
        </Box>
      </Box>

      <AppBar
        position="static"
        sx={{
          backgroundColor: "white",
          boxShadow: "none",
          borderBottom: "2px solid #d1d1d1",
        }}
      >
        {/* Top Row: SCU Schedule Helper, Menu Toggle, and Close Button */}
        <Toolbar
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: "white",
            minHeight: "56px",
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
                width: "calc(100% - 8px)",
              },
              "&::after": {
                content: '""',
                position: "absolute",
                bottom: -2,
                left: "4px",
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
                  color: "#703331",
                },
              }}
            />
            <Typography
              sx={{
                color: activeMenu === "home" ? "#703331" : "black",
                fontWeight: "bold",
                fontSize: { xs: "0.9rem", sm: "1rem" },
              }}
            >
              SCU SCHEDULE HELPER
            </Typography>
          </Button>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Button
              onClick={toggleExpanded}
              sx={{
                minWidth: "auto",
                padding: "4px 12px",
                color: "#703331",
                fontSize: "0.75rem",
                display: "flex",
                alignItems: "center",
                gap: 1,
                borderRadius: "4px",
                "&:hover": {
                  backgroundColor: "#f0f0f0",
                },
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontSize: "0.75rem",
                  color: "#703331",
                  fontWeight: "medium",
                }}
              >
                Menu
              </Typography>
              {isExpanded ? (
                <ExpandLess sx={{ fontSize: 16 }} />
              ) : (
                <ExpandMore sx={{ fontSize: 16 }} />
              )}
            </Button>

            <Button
              onClick={() => {
                setActiveMenu("settings");
                navigateToPage("settings");
              }}
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
                ...(activeMenu === "settings" && {
                  "&::after": {
                    backgroundColor: "#703331",
                    width: "100%",
                  },
                }),
              }}
            >
              <Settings
                sx={{
                  fontSize: 24,
                  color: activeMenu === "settings" ? "#703331" : "#d1d1d1",
                  transition: "color 0.3s",
                }}
              />
            </Button>

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

        {/* Expandable Navigation Menu */}
        {isExpanded && (
          <Box
            sx={{
              backgroundColor: "#fafafa",
              borderTop: "1px solid #e0e0e0",
              p: 2,
            }}
          >
            {/* All Navigation Buttons */}
            <Box
              sx={{
                display: "flex",
                gap: 1.5,
                flexWrap: "wrap",
                alignItems: "flex-start",
                justifyContent: "space-evenly",
              }}
            >
              {[...topRowItems, ...bottomRowItems].map((item) => renderMenuButton(item, true))}
            </Box>
          </Box>
        )}
      </AppBar>
    </Box>
  );
}
