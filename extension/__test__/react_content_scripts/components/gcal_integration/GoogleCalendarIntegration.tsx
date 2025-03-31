import React, { useState } from "react";
import { RRule, Weekday } from "rrule";
import { getEnrolledCoursesTables } from "../shared/utils";

interface CourseEvent {
  courseName: string;
  location: string;
  professor: string;
  startDate: string;
  endDate: string;
  recurrence: string;
}

const WORKDAY_TO_RRULE_DAY_MAPPING: Record<string, Weekday> = {
  M: RRule.MO,
  T: RRule.TU,
  W: RRule.WE,
  Th: RRule.TH,
  F: RRule.FR,
};

const MEETING_PATTERN_REGEX =
  /(.*) \| (\d{1,2}:\d{1,2} (?:AM|PM)) - (\d{1,2}:\d{1,2} (?:AM|PM)) \| (.*)/;
const DAYS_OF_WEEK_STRINGS = ["Su", "M", "T", "W", "Th", "F", "Sa"];

export default function GoogleCalendarButton() {
  const [status, setStatus] = useState<string>("");
  const [buttonText, setButtonText] = useState<string>(
    "Add Courses to Google Calendar"
  );
  const [isHovered, setIsHovered] = useState<boolean>(false);

  const buttonStyle = {
    padding: "10px 20px",
    borderRadius: "999px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s ease",
    whiteSpace: "nowrap",
    outline: "none",
    backgroundColor: isHovered ? "#333" : "white",
    color: isHovered ? "white" : "#333",
    border: "1px solid hsla(0, 0%, 20%, 1)",
    boxShadow: "0 0 1px hsla(0, 0%, 20%, 1) inset",
    display: "flex",
    alignItems: "center", 
    gap: "8px", 
  };

  const handleClick = async () => {
    try {
      setStatus("Checking for courses...");
      const courses = getRelevantCourses();
      if (!courses || !courses.length) {
        setStatus("No courses found.");
        return;
      }

      setStatus("Signing in to Google...");
      const token = await chrome.runtime.sendMessage("runCalendarOAuth");

      setStatus("Adding courses to Google Calendar...");
      await addCoursesToGoogleCalendar(token, courses);

      setStatus("");
      setButtonText("Courses Added to Google Calendar");
    } catch (error) {
      console.error(error);
      setStatus("Error: " + error);
    }
  };

  return (
    <div>
      <button
        style={buttonStyle}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <img src={chrome.runtime.getURL("images/icon-16.png")} />
        {buttonText}
      </button>
      {status && <p>{status}</p>}
    </div>
  );
}

function getRelevantCourses(): CourseEvent[] {
  const tables = getEnrolledCoursesTables();
  const courses: CourseEvent[] = [];
  for (const table of tables) {
    const rows = Array.from(
      table.querySelectorAll("tbody > tr") as NodeListOf<HTMLTableRowElement>
    );
    for (const row of rows) {
      const tds = row.querySelectorAll("td");
      const courseName = tds[1].innerText.trim();
      const meetingPattern = tds[9].innerText.trim();
      const professor = tds[10].innerText.trim();
      const startDateMMDDYYYY = tds[11].innerText.trim();
      const endDateMMDDYYYY = tds[12].innerText.trim();

      const meetingPatternRegexMatch = meetingPattern.match(
        MEETING_PATTERN_REGEX
      );
      if (!meetingPatternRegexMatch) {
        console.error(
          `Error: Could not parse meeting pattern: ${meetingPattern}`
        );
        continue;
      }

      const courseDaysOfWeek = meetingPatternRegexMatch[1]
        .split(" ")
        .map((day) => day.trim());
      const startTime = meetingPatternRegexMatch[2].trim();
      const startDate = new Date(`${startDateMMDDYYYY} ${startTime}`);
      startDate.setDate(
        startDate.getDate() + calcStartDateOffset(startDate, courseDaysOfWeek)
      );

      const endTime = meetingPatternRegexMatch[3].trim();
      const endDate = new Date(
        `${startDate.toISOString().split("T")[0]} ${endTime}`
      );

      const actualCourseEndDate = getSundayBeforeDate(
        new Date(endDateMMDDYYYY)
      );
      const recurrence = createRecurringEvent(
        courseDaysOfWeek,
        actualCourseEndDate
      );

      const location = meetingPatternRegexMatch[4].trim();

      courses.push({
        courseName,
        location,
        professor,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        recurrence,
      });
    }
  }
  return courses;
}

async function addCoursesToGoogleCalendar(
  token: string,
  courses: CourseEvent[]
) {
  const calendarId = "primary";
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
    calendarId
  )}/events`;

  const headers = new Headers({
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  });

  for (const course of courses) {
    const event = {
      summary: course.courseName,
      location: course.location,
      description: `Professor: ${course.professor}`,
      start: {
        dateTime: `${course.startDate}`,
        timeZone: "America/Los_Angeles",
      },
      end: {
        dateTime: `${course.endDate}`,
        timeZone: "America/Los_Angeles",
      },
      recurrence: [course.recurrence],
    };

    console.log(
      "Req:",
      JSON.stringify(
        {
          url,
          headers: Object.fromEntries(headers.entries()),
          body: event,
        },
        null,
        2
      )
    );

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(event),
    });

    console.log("Response:", response);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Error adding event to Google Calendar: ${response.status} ${errorText}`
      );
    }
  }
}

function createRecurringEvent(daysOfWeek: string[], until: Date): string {
  const byweekday = daysOfWeek
    .map((day) => WORKDAY_TO_RRULE_DAY_MAPPING[day])
    .filter(Boolean);

  if (byweekday.length === 0) {
    throw new Error("Invalid days of the week provided.");
  }

  const rule = new RRule({
    freq: RRule.WEEKLY,
    byweekday,
    until,
  });

  return rule.toString();
}

function calcStartDateOffset(startTimeDate: Date, courseDaysOfWeek: string[]) {
  const startDayOfWeekIndex = startTimeDate.getDay();
  const firstDayOfWeek = courseDaysOfWeek[0];
  const firstDayOfWeekIndex = DAYS_OF_WEEK_STRINGS.indexOf(firstDayOfWeek);
  let daysUntilFirstClass = firstDayOfWeekIndex - startDayOfWeekIndex;
  if (firstDayOfWeekIndex < startDayOfWeekIndex) {
    daysUntilFirstClass += 7;
  }
  return daysUntilFirstClass;
}

function getSundayBeforeDate(date: Date): Date {
  const sundayDate = new Date(date);
  const dayOfWeek = sundayDate.getDay();
  const daysToSubtract = dayOfWeek === 0 ? 0 : dayOfWeek;
  sundayDate.setDate(sundayDate.getDate() - daysToSubtract);
  return sundayDate;
}