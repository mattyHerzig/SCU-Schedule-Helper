import React, { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Main from "../components/pageComponents/main";
import Preferences from "../components/pageComponents/preferences";
import Menu from "../components/Menu";
import Friends from "../components/pageComponents/friends";
import Profile from "../components/pageComponents/profile";

export default function Home() {
  const [activePage, setActivePage] = useState("main");

  const navigateToPage = (page) => {
    setActivePage(page);
  };

  const openLandingPage = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("landing_page/index.html") });
  };

  useEffect(() => {
    chrome.runtime.sendMessage("runStartupChecks");
  }, []);

  return (
    <Box
      sx={{
        width: '450px',
        height: '500px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <Menu navigateToPage={navigateToPage} openLandingPage={openLandingPage} />

      <Box
        sx={{
          flexGrow: 1,
          overflowY: "auto",
          overflowX: "hidden",
          width: "100%",
          position: 'relative',
          paddingBottom: '20px', 
        }}
      >
        {activePage === "main" && <Main navigateToPage={navigateToPage} />}
        {activePage === "preferences" && (
          <Preferences navigateToPage={navigateToPage} />
        )}
        {activePage === "friends" && (
          <Friends navigateToPage={navigateToPage} />
        )}
        {activePage === "profile" && (
          <Profile navigateToPage={navigateToPage} />
        )}
      </Box>
    </Box>
  );
}
