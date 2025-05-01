import React, { useEffect } from 'react';

interface InterestedSection {
  [key: string]: string; 
}

interface UpdateUserMessage {
  type: 'updateUser';
  updateItems: {
    interestedSections: {
      add: InterestedSection;
    };
  };
}

interface UpdateResponse {
  ok: boolean;
  message?: string;
}
interface UserInfo {
  id?: string;
  preferences?: {
    courseTracking?: boolean;
  };
}

interface StorageData {
  userInfo?: UserInfo;
}

const CourseTracker: React.FC = () => {
  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout>;
    const debounceDelay = 100;
    const expDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 45);
    const sentInterestedSections = new Set<string>();

    const checkForInterestedSections = (mutationsList: MutationRecord[]) => {
      clearTimeout(debounceTimer);

      debounceTimer = setTimeout(() => {
        for (const mutation of mutationsList) {
          if (mutation.type === "childList") {
            const element = document.querySelector(
              '[data-automation-id="pageHeaderTitleText"]'
            );
            if (
              element?.textContent === "Add Course Section to Saved Schedule" ||
              element?.textContent === "Add Course Sections to Saved Schedule"
            ) {
              const tables = document.querySelectorAll("table");
              if (tables.length !== 1) return;
              const table = tables[0];
              const data = table.querySelectorAll("td");
              const add: InterestedSection = {};
              let curSection: string | null = null;
              let curProf: string | null = null;
              let curMeetingPatterns: string | null = null;
              
              for (let i = 0; i < data.length; i++) {
                if (i % 10 === 3) {
                  curSection = data[i].innerText;
                }
                if (i % 10 === 6) {
                  curProf = data[i].innerText;
                  const profIndexOfPipe = curProf.indexOf("|");
                  if (profIndexOfPipe !== -1) {
                    curProf = curProf.slice(0, profIndexOfPipe).trim();
                  }
                  curProf = curProf.replace("\n\n\n", " & ");
                }
                if (i % 10 === 9) {
                  curMeetingPatterns = data[i].innerText;
                  if (curSection && curProf && curMeetingPatterns) {
                    const interestedSectionString = `P{${curProf}}S{${curSection}}M{${curMeetingPatterns}}`;
                    if (!sentInterestedSections.has(interestedSectionString)) {
                      sentInterestedSections.add(interestedSectionString);
                      add[interestedSectionString] = expDate.toISOString();
                    }
                  }
                  curSection = null;
                  curProf = null;
                  curMeetingPatterns = null;
                }
              }
              
              if (Object.keys(add).length === 0) return;
              
              const message: UpdateUserMessage = {
                type: "updateUser",
                updateItems: {
                  interestedSections: {
                    add,
                  },
                },
              };
              
              chrome.runtime.sendMessage(message).then((response: UpdateResponse) => {
                if (response && !response.ok)
                  console.error(
                    `Error updating interested sections: ${response.message}`
                  );
              });
            }
          }
        }
      }, debounceDelay);
    };

    chrome.storage.local.get("userInfo", (data: StorageData) => {
      if (
        data.userInfo &&
        data.userInfo.id && 
        data.userInfo.preferences &&
        data.userInfo.preferences.courseTracking
      ) {
        const targetNode = document.body;
        const config = { childList: true, subtree: true };
        const observer = new MutationObserver(checkForInterestedSections);
        observer.observe(targetNode, config);
        return () => {
          observer.disconnect();
        };
      }
    });

    return () => {
      clearTimeout(debounceTimer);
    };
  }, []); 

  return null;
};

export default CourseTracker;
