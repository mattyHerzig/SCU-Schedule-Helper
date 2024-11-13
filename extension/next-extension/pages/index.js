import React, { useState } from "react";
import Main from "../components/pageComponents/main";
import Preferences from "../components/pageComponents/preferences";
import Menu from "../components/Menu";
import Friends from "../components/pageComponents/friends";
import Settings from "../components/pageComponents/settings";

export default function Home() {
  const [activePage, setActivePage] = useState("main");

  const navigateToPage = (page) => {
    setActivePage(page);
  };

  const openLandingPage = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("tab/index.html") });
  };

  return (
    <>
      <Menu navigateToPage={navigateToPage} openLandingPage={openLandingPage} />
      {activePage === "main" && <Main navigateToPage={navigateToPage} />}
      {activePage === "preferences" && (
        <Preferences navigateToPage={navigateToPage} />
      )}
      {activePage === "friends" && <Friends navigateToPage={navigateToPage} />}
      {activePage === "settings" && (
        <Settings navigateToPage={navigateToPage} />
      )}
    </>
  );
}
