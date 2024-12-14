import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Divider,
} from "@mui/material";
import FriendCoursesTooltip from "./FriendCoursesTooltip";

export const courseTakenPattern = /P{(.*?)}C{(.*?)}T{(.*?)}/; // P{profName}C{courseCode}T{termName}
export const interestedSectionPattern = /P{(.*?)}S{(.*?)}M{(.*?)}/; // P{profName}S{full section string}M{meetingPattern}E{expirationTimestamp}

const ProfCourseCard = ({ selected, data }) => {
  if (!selected) return null;
  const [rmpData, setRmpData] = useState(null);
  const [isLoadingRmp, setIsLoadingRmp] = useState(true);
  const [friendData, setFriendData] = useState(null);
  useEffect(() => {
    const getRMPrating = async () => {
      setIsLoadingRmp(true);
      try {
        const rmpRating = await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage(
            { type: "getRmpRatings", profName: selected.id },
            (response) => {
              if (chrome.runtime.lastError || !response) {
                reject(new Error("Failed to fetch RMP data"));
              } else {
                resolve(response);
              }
            },
          );
        });

        setRmpData(rmpRating);
      } catch (error) {
        console.error("Detailed error fetching RMP ratings:", error);
        setRmpData(null);
      }
      setIsLoadingRmp(false);
    };

    if (selected.type === "prof") {
      getRMPrating();
    } else {
      setIsLoadingRmp(false);
    }
  }, [selected]);

  useEffect(() => {
    const fetchFriendData = async () => {
      const friendData = await chrome.storage.local.get([
        "friendCoursesTaken",
        "friendInterestedSections",
        "friends",
      ]);
      const friendTakenInfos = [];
      const friendInterestedInfos = [];
      if (selected.type === "prof") {
        for (const friendId in friendData.friendCoursesTaken?.[selected.id] ||
          {}) {
          const friendName = friendData.friends[friendId].name;
          const courses = friendData.friendCoursesTaken[selected.id][friendId];

          for (const course of courses) {
            const match = course.match(courseTakenPattern);
            if (!match) continue;
            const courseCode = match[2]
              .substring(0, match[2].indexOf("-"))
              .replace(" ", "");
            friendTakenInfos.push(`${friendName} had for ${courseCode}`);
          }
        }
        for (const friendId in friendData.friendInterestedSections?.[
          selected.id
        ] || {}) {
          const friendName = friendData.friends[friendId].name;
          const sections =
            friendData.friendInterestedSections[selected.id][friendId];
          for (const section of sections) {
            const match = section.match(interestedSectionPattern);
            if (!match) continue;
            const meetingPatternMatch = match[3].match(/(.*) \| (.*) \| (.*)/);
            const meetingPattern = `${meetingPatternMatch[1]} at ${meetingPatternMatch[2].replaceAll(" ", "").replaceAll(":00", "").toLowerCase()}`;
            const courseCode = match[2]
              .substring(0, match[2].indexOf("-"))
              .replace(" ", "");
            friendInterestedInfos.push(
              `${friendName} wants to take for ${courseCode} on ${meetingPattern}`,
            );
          }
        }
      } else {
        for (const friendId in friendData.friendCoursesTaken?.[selected.id] ||
          {}) {
          const friendName = friendData.friends[friendId].name;
          const course = friendData.friendCoursesTaken[selected.id][friendId];
          const match = course.match(courseTakenPattern);
          if (!match) continue;
          friendTakenInfos.push(
            `${friendName} took with ${match[1] || "unknown prof"}`,
          );
        }
        for (const friendId in friendData.friendInterestedSections?.[
          selected.id
        ] || {}) {
          const friendName = friendData.friends[friendId].name;
          const course =
            friendData.friendInterestedSections[selected.id][friendId];
          const match = course.match(interestedSectionPattern);
          if (!match) continue;
          const meetingPatternMatch = match[3].match(/(.*) \| (.*) \| (.*)/);
          const meetingPattern = `${meetingPatternMatch[1]} at ${meetingPatternMatch[2].replaceAll(" ", "").replaceAll(":00", "").toLowerCase()}`;
          friendInterestedInfos.push(
            `${friendName} wants to take with ${match[1]} on ${meetingPattern}`,
          );
        }
      }

      setFriendData({ friendTakenInfos, friendInterestedInfos });
    };
    fetchFriendData();
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (
        namespace === "local" &&
        (changes.friendCoursesTaken ||
          changes.friendInterestedSections ||
          changes.friends)
      ) {
        fetchFriendData();
      }
    });
  }, [selected]);

  const getColor = (rating, type) => {
    let normalizedRating = type === "workload" ? (rating - 1) / 9 : rating / 5;

    const r = Math.round(
      255 * (type === "quality" ? 1 - normalizedRating : normalizedRating),
    );
    const g = Math.round(
      255 * (type === "quality" ? normalizedRating : 1 - normalizedRating),
    );
    return `rgb(${r}, ${g}, 0)`;
  };

  const renderEvalStats = (stats) => {
    if (
      !stats ||
      stats.qualityAvg === undefined ||
      stats.difficultyAvg === undefined ||
      stats.workloadAvg === undefined
    ) {
      return (
        <Typography variant="body2" color="text.secondary">
          No statistics available
        </Typography>
      );
    }

    const StatBox = ({ label, value, type }) => (
      <Box>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "baseline" }}>
          <Typography
            variant="h6"
            sx={{
              color: getColor(value, type),
              fontWeight: "bold",
            }}
          >
            {value.toFixed(1)}
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: "text.primary",
              fontWeight: "bold",
              ml: 0.5,
            }}
          >
            {type === "workload" ? " hrs/week" : "/5"}
          </Typography>
        </Box>
      </Box>
    );

    return (
      <Box
        sx={{
          display: "flex",
          gap: 4,
          justifyContent: "space-between",
          px: 2,
        }}
      >
        <StatBox label="Quality" value={stats.qualityAvg} type="quality" />
        <StatBox
          label="Difficulty"
          value={stats.difficultyAvg}
          type="difficulty"
        />
        <StatBox label="Workload" value={stats.workloadAvg} type="workload" />
      </Box>
    );
  };

  const renderRMPStats = () => {
    if (isLoadingRmp) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", my: 2 }}>
          <CircularProgress size={24} />
        </Box>
      );
    }

    if (!rmpData) {
      return (
        <Typography variant="body2" color="text.secondary" sx={{ px: 2 }}>
          No RMP data available
        </Typography>
      );
    }

    const StatBox = ({ label, value, type }) => (
      <Box>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "baseline" }}>
          <Typography
            variant="h6"
            sx={{
              color: getColor(value, type),
              fontWeight: "bold",
            }}
          >
            {value.toFixed(1)}
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: "text.primary",
              fontWeight: "bold",
              ml: 0.5,
            }}
          >
            /5
          </Typography>
        </Box>
      </Box>
    );

    return (
      <>
        <Typography variant="subtitle1" gutterBottom sx={{ mt: 3, px: 2 }}>
          RateMyProfessor Statistics:
        </Typography>
        <Box
          sx={{
            display: "flex",
            gap: 4,
            justifyContent: "space-between",
            px: 2,
          }}
        >
          <StatBox label="Quality" value={rmpData.avgRating} type="quality" />
          <StatBox
            label="Difficulty"
            value={rmpData.avgDifficulty}
            type="difficulty"
          />
        </Box>
      </>
    );
  };

  if (selected.type === "prof") {
    return (
      <Card sx={{ backgroundColor: "#f0f0f0" }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {selected.id}
          </Typography>

          <FriendCoursesTooltip friendData={friendData} />

          {selected.overall && (
            <>
              <Typography variant="subtitle1" gutterBottom>
                Overall Course Evaluation Statistics:
              </Typography>
              {renderEvalStats(selected.overall)}
            </>
          )}
          {renderRMPStats()}
          <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
            Course Statistics:
          </Typography>
          {Object.entries(selected)
            .filter(
              ([key, value]) =>
                typeof value === "object" &&
                value.difficultyAvg !== undefined &&
                key !== "overall",
            )
            .map(([courseCode, courseStats], index) => (
              <Box key={courseCode} sx={{ mt: 2 }}>
                <Typography variant="body1" gutterBottom>
                  {courseCode}{" "}
                  {courseStats.courseName ? `- ${courseStats.courseName}` : ""}
                </Typography>

                {courseStats.recentTerms && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ px: 2, mt: 1, mb: 2 }}
                  >
                    Quarters Taught: {courseStats.recentTerms.join(", ")}
                  </Typography>
                )}

                {renderEvalStats(courseStats)}

                {index < Object.entries(selected).length - 1 && (
                  <Divider sx={{ my: 3 }} />
                )}
              </Box>
            ))}
        </CardContent>
      </Card>
    );
  }

  if (selected.type === "course") {
    return (
      <Card sx={{ backgroundColor: "#f0f0f0" }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {selected.courseName} ({selected.id})
          </Typography>

          <Typography variant="body2" color="text.secondary" gutterBottom>
            Recent Terms: {selected.recentTerms.join(", ")}
          </Typography>

          <FriendCoursesTooltip friendData={friendData} />

          <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
            Course Overall Statistics:
          </Typography>
          {renderEvalStats(selected)}

          <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
            Professor-Specific Course Statistics:
          </Typography>

          {selected.professors
            .map((profName) => [profName, data[profName][selected.id]])
            .sort((objA, objB) => {
              const ratingA = objA[1];
              const ratingB = objB[1];
              const scoreA =
                ratingA.qualityAvg +
                (5 - ratingA.difficultyAvg) +
                (15 - ratingA.workloadAvg);
              const scoreB =
                ratingB.qualityAvg +
                (5 - ratingB.difficultyAvg) +
                (15 - ratingB.workloadAvg);
              return scoreB - scoreA; // Sort by descending score.
            })
            .map(([profName, profCourseStats]) => {
              return (
                <Box key={profName} sx={{ mt: 2 }}>
                  <Typography variant="body1" gutterBottom>
                    {profName}
                  </Typography>

                  {profCourseStats?.recentTerms && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ px: 2, mt: 1, mb: 2 }}
                    >
                      Quarters Taught: {profCourseStats.recentTerms.join(", ")}
                    </Typography>
                  )}
                  {profCourseStats ? (
                    renderEvalStats(profCourseStats)
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No specific course statistics available for this professor
                    </Typography>
                  )}

                  <Divider sx={{ my: 3 }} />
                </Box>
              );
            })}
        </CardContent>
      </Card>
    );
  }

  return null;
};

export default ProfCourseCard;
