import { useEffect, useState } from "react";
import { Card, CardContent } from "@mui/material";
import { courseTakenPattern, interestedSectionPattern } from "./patterns";
import ProfessorView from "./ProfessorView";
import CourseView from "./CourseView";

export default function ProfCourseCard({ selected, data, onPageNavigation }) {
  if (!selected) return null;
  
  const [friendData, setFriendData] = useState(null);
  const [preferredPercentiles, setPreferredPercentiles] = useState({
    quality: 1,
    difficulty: 0,
    workload: 0,
  });

  useEffect(() => {
    async function getPrefferedPercentiles() {
      const userInfo = (await chrome.storage.local.get("userInfo")).userInfo;
      if (userInfo.preferences && userInfo.preferences.difficulty) {
        setPreferredPercentiles({
          quality: 1,
          difficulty: userInfo.preferences.difficulty / 4,
          workload: userInfo.preferences.difficulty / 4,
        });
      }
    }

    getPrefferedPercentiles();

    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === "local" && changes.userInfo) {
        getPrefferedPercentiles();
      }
      if (
        namespace === "local" &&
        (changes.friendCoursesTaken ||
          changes.friendInterestedSections ||
          changes.friends)
      ) {
        fetchFriendData();
      }
    });
  }, []);

  useEffect(() => {
    fetchFriendData();
  }, [selected]);

  async function fetchFriendData() {
    const friendData = await chrome.storage.local.get([
      "friendCoursesTaken",
      "friendInterestedSections",
      "friends",
    ]);
    const friendTakenInfos = [];
    const friendInterestedInfos = [];
    
    if (selected.type === "prof") {
      for (const friendId in friendData.friendCoursesTaken?.[selected.id] || {}) {
        const friendName = friendData.friends[friendId].name;
        const courses = friendData.friendCoursesTaken[selected.id][friendId];
        const friendInfo = `${friendName} had for `;
        const courseCodes = [];
        
        for (const course of courses) {
          const match = course.match(courseTakenPattern);
          if (!match) continue;
          const courseCode = match[2]
            .substring(0, match[2].indexOf("-"))
            .replace(" ", "");
          courseCodes.push(courseCode);
        }
        
        if (courseCodes.length > 0)
          friendTakenInfos.push(`${friendInfo}${courseCodes.join(", ")}`);
      }
      
      for (const friendId in friendData.friendInterestedSections?.[selected.id] || {}) {
        const friendName = friendData.friends[friendId].name;
        const sections = friendData.friendInterestedSections[selected.id][friendId];
        
        for (const section of sections) {
          const match = section.match(interestedSectionPattern);
          if (!match) continue;
          const meetingPatternMatch = match[3].match(/(.*) \| (.*) \| (.*)/);
          const meetingPattern = `${meetingPatternMatch[1]} at ${meetingPatternMatch[2]
            .replaceAll(" ", "")
            .replaceAll(":00", "")
            .toLowerCase()}`;
          const courseCode = match[2]
            .substring(0, match[2].indexOf("-"))
            .replace(" ", "");
          friendInterestedInfos.push(
            `${friendName} wants to take for ${courseCode} on ${meetingPattern}`
          );
        }
      }
    } else {
      for (const friendId in friendData.friendCoursesTaken?.[selected.id] || {}) {
        const friendName = friendData.friends[friendId].name;
        const course = friendData.friendCoursesTaken[selected.id][friendId];
        const match = course.match(courseTakenPattern);
        if (!match) continue;
        if (match[1] === "Not taken at SCU") {
          friendTakenInfos.push(`${friendName} took outside of SCU`);
          continue;
        }
        friendTakenInfos.push(
          `${friendName} took with ${match[1] || "unknown prof"}`
        );
      }
      
      for (const friendId in friendData.friendInterestedSections?.[selected.id] || {}) {
        const friendName = friendData.friends[friendId].name;
        const course = friendData.friendInterestedSections[selected.id][friendId];
        const match = course.match(interestedSectionPattern);
        if (!match) continue;
        const meetingPatternMatch = match[3].match(/(.*) \| (.*) \| (.*)/);
        const meetingPattern = `${meetingPatternMatch[1]} at ${meetingPatternMatch[2]
          .replaceAll(" ", "")
          .replaceAll(":00", "")
          .toLowerCase()}`;
        friendInterestedInfos.push(
          `${friendName} wants to take with ${match[1]} on ${meetingPattern}`
        );
      }
    }

    setFriendData({ friendTakenInfos, friendInterestedInfos });
  }

  return (
    <Card sx={{ backgroundColor: "#f0f0f0" }}>
      <CardContent>
        {selected.type === "prof" ? (
          <ProfessorView 
            selected={selected} 
            data={data} 
            friendData={friendData} 
            preferredPercentiles={preferredPercentiles} 
            onPageNavigation={onPageNavigation} 
          />
        ) : (
          <CourseView 
            selected={selected} 
            data={data} 
            friendData={friendData} 
            preferredPercentiles={preferredPercentiles} 
            onPageNavigation={onPageNavigation} 
          />
        )}
      </CardContent>
    </Card>
  );
}