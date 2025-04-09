import React from "react";
import { createRoot } from "react-dom/client";
import GoogleCalendarButton from "../components/gcal_integration/GoogleCalendarButton";

const debounceDelay = 100;
let debounceTimer: null | number;

const isButtonAdded = () => {
  return !!document.getElementById('gcal-button-container');
};

const tryInjectingButton = () => {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    if (isButtonAdded()) return;
    const buttonBar = document.querySelector('.WLNM.WNNM[data-automation-id="buttonBar"]');
    if (buttonBar) {
      const newListItem = document.createElement("li");
      newListItem.className = "WMNM";
      newListItem.style.float = 'right';

      const container = document.createElement("div");
      container.id = "gcal-button-container";
      newListItem.appendChild(container);
      buttonBar.insertBefore(newListItem, buttonBar.firstChild);
      const root = createRoot(container);
      root.render(<GoogleCalendarButton />);
    }
  }, debounceDelay);
};

const observer = new MutationObserver(tryInjectingButton);

observer.observe(document.body, {
  childList: true,
  subtree: true
});

