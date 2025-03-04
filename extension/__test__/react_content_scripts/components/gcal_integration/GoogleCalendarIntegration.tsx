// GoogleCalendarButton.tsx
import React, { useState } from "react";

// Suppose you have these utility funcs:
import { doGoogleOauth, addCoursesToGoogleCalendar } from "../shared/googleCalUtils";

export default function GoogleCalendarButton() {
  const [status, setStatus] = useState<string>("");

  const handleClick = async () => {
    try {
      setStatus("Checking for courses...");
      // 1. Ask the background script for courses:
      const response = await new Promise<any>((resolve, reject) => {
        chrome.runtime.sendMessage({ type: "getOrImportCourses" }, (resp) => {
          if (chrome.runtime.lastError) {
            return reject(chrome.runtime.lastError);
          }
          if (!resp || !resp.ok) {
            return reject(resp?.message || "Failed to get or import courses.");
          }
          resolve(resp);
        });
      });

      const courses = response.courses; // these might be in a string format or object format
      if (!courses || !courses.length) {
        setStatus("No courses found.");
        return;
      }

      // 2. OAuth
      setStatus("Signing in to Google...");
      await doGoogleOauth();  // your existing Google sign-in logic

      // 3. Add to Google Calendar
      setStatus("Adding courses to Google Calendar...");
      await addCoursesToGoogleCalendar(courses);

      setStatus("Successfully added courses to Google Calendar!");
    } catch (error) {
      console.error(error);
      setStatus("Error: " + error);
    }
  };

  return (
    <div>
      <button onClick={handleClick}>Add Courses to Google Calendar</button>
      {status && <p>{status}</p>}
    </div>
  );
}
