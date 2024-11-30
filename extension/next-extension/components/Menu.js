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
import CloseIcon from "@mui/icons-material/Close";

export default function Menu({ navigateToPage, openLandingPage, onClose }) {
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

  const handleClose = () => {
      window.close();
  };

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
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: "white",
          }}
        >
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            flexGrow: 1,
            minWidth: 0, 
          }}>
            <Button
              sx={{
                position: "relative",
                color: "black",
                display: "flex",
                alignItems: "center",
                padding: '4px 8px',
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
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              onClick={() => {
                setActiveMenu("home");
                openLandingPage();
              }}
              className={activeMenu === "home" ? "active" : ""}
            >
              <HomeIcon
                sx={{
                  fontSize: 24, 
                  color: activeMenu === "home" ? "#703331" : "#d1d1d1",
                  marginRight: 1,
                  transition: "color 0.3s",
                }}
              />
              <span
                sx={{
                  color: activeMenu === "home" ? "#703331" : "black",
                  fontWeight: "bold",
                  fontSize: { xs: '0.8rem', sm: '1rem' }, 
                }}
              >
                SCU Schedule Helper
              </span>
            </Button>
          </Box>

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              flexGrow: 1,
              minWidth: 0, 
            }}
          >
            {menuItems.map((item) => (
              <Button
                key={item.id}
                sx={{
                  minWidth: 'auto', 
                  padding: '4px 8px', 
                  position: "relative",
                  color: "black",
                  "&:hover": {
                    backgroundColor: "#f0f0f0",
                    "& .menu-icon": {
                      color: "#703331",
                    }
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
                  className: "menu-icon",
                  sx: { 
                    fontSize: 24, 
                    color: activeMenu === item.id ? "#703331" : "#d1d1d1",
                    transition: "color 0.3s",
                  },
                })}
              </Button>
            ))}
          </Box>

          <Box>
            <Button
              onClick={handleClose}
              sx={{
                minWidth: 'auto',
                color: '#703331',
                padding: '4px 8px',
                "&:hover": {
                  backgroundColor: "#f0f0f0",
                  "& .MuiSvgIcon-root": { 
                    color: "#703331",
                  }
                },
              }}
            >
              <CloseIcon 
                sx={{ 
                  fontSize: 24,
                  color: '#d1d1d1',
                }}
              />
            </Button>
          </Box>
        </Toolbar>
      </AppBar>
    </Box>
  );
}

