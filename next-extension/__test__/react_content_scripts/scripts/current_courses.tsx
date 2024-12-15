import React from "react";
import { createRoot } from "react-dom/client";
import CurrentCourseImporter from "../components/current_courses/CurrentCourseImporter";

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message !== "importCurrentCourses") {
    return false;
  }
  const courseImporter = document.createElement("div");
  courseImporter.id = "root";

  courseImporter.style.position = "fixed";
  courseImporter.style.top = "5rem";
  courseImporter.style.right = "5rem";
  courseImporter.style.zIndex = "9999";

  document.body.prepend(courseImporter);

  const root = createRoot(courseImporter);

  root.render(
    <React.StrictMode>
      <CurrentCourseImporter sendResponse={sendResponse}/>
    </React.StrictMode>,
  );
  return true;
});
