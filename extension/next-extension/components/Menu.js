import React, { useState, useEffect } from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Button from "@mui/material/Button";
import HomeIcon from "@mui/icons-material/Home";
import SearchIcon from "@mui/icons-material/Search";
import TuneIcon from "@mui/icons-material/Tune";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import SettingsIcon from "@mui/icons-material/Settings";

export default function Menu({ navigateToPage, openLandingPage }) {
  const [activeMenu, setActiveMenu] = useState("main");

  const menuItems = [
    { icon: <SearchIcon />, id: "main", action: () => navigateToPage("main") },
    { icon: <TuneIcon />, id: "preferences", action: () => navigateToPage("preferences") },
    { icon: <PersonAddIcon />, id: "friends", action: () => navigateToPage("friends") },
    { icon: <SettingsIcon />, id: "settings", action: () => navigateToPage("settings") },
  ];

  useEffect(() => {
    setActiveMenu("main");
  }, []);

  return (
    <Box sx={{ mb: 3 }}>
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
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "white",
          }}
        >
          <Box sx={{}}>
            <Button
              sx={{
                position: "relative",
                color: "black",
                display: "flex",
                alignItems: "center",
                "&:hover": {
                  backgroundColor: "#f0f0f0",
                },
                "&:hover::after, &.active::after": {
                  backgroundColor: "#703331",
                },
                "&::after": {
                  content: '""',
                  position: "absolute",
                  bottom: -2,
                  left: 0,
                  right: 0,
                  height: "2px",
                  backgroundColor: "transparent",
                  transition: "background-color 0.3s",
                },
                whiteSpace: "nowrap",
              }}
              onClick={() => {
                setActiveMenu("home");
                openLandingPage();
              }}
              className={activeMenu === "home" ? "active" : ""}
            >
              <HomeIcon
                sx={{
                  fontSize: 30,
                  color: activeMenu === "home" ? "#703331" : "#d1d1d1",
                  marginRight: 1,
                }}
              />
              <span
                style={{
                  color: activeMenu === "home" ? "#703331" : "black",
                  fontWeight: "bold",
                }}
              >
                SCU Schedule Helper
              </span>
            </Button>
          </Box>

          <Box
            sx={{
              display: "flex",
            }}
          >
            {menuItems.map((item) => (
              <Button
                key={item.id}
                sx={{
                  position: "relative",
                  color: "black",
                  "&:hover": {
                    backgroundColor: "#f0f0f0",
                  },
                  "&:hover::after, &.active::after": {
                    backgroundColor: "#703331",
                  },
                  "&::after": {
                    content: '""',
                    position: "absolute",
                    bottom: -2,
                    left: 0,
                    right: 0,
                    height: "2px",
                    backgroundColor: "transparent",
                    transition: "background-color 0.3s",
                  },
                }}
                onClick={() => {
                  setActiveMenu(item.id);
                  item.action();
                }}
                className={activeMenu === item.id ? "active" : ""}
              >
                {React.cloneElement(item.icon, {
                  sx: { fontSize: 30, color: activeMenu === item.id ? "#703331" : "#d1d1d1" },
                })}
              </Button>
            ))}
          </Box>
        </Toolbar>
      </AppBar>
    </Box>
  );
}



