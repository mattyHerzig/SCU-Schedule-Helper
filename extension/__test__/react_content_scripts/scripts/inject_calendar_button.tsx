// inject_calendar_button.tsx

import React from "react";
import { createRoot } from "react-dom/client";
import GoogleCalendarButton from "./GoogleCalendarButton";

const container = document.createElement("div");
container.style.position = "fixed";
container.style.top = "5rem";
container.style.right = "3rem";
container.style.zIndex = "9999";
container.id = "gcal-button-container";

document.body.appendChild(container);

const root = createRoot(container);
root.render(<GoogleCalendarButton />);
