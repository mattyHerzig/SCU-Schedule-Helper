import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Divider,
} from "@mui/material";
import "@fontsource/roboto/400.css";
import FriendCoursesTooltip from "./FriendCoursesTooltip";

export const courseTakenPattern = /P{(.*?)}C{(.*?)}T{(.*?)}/; // P{profName}C{courseCode}T{termName}
export const interestedSectionPattern = /P{(.*?)}S{(.*?)}M{(.*?)}/; // P{profName}S{full section string}M{meetingPattern}E{expirationTimestamp}

export default function ProfCourseCard({ selected, data }) {
  if (!selected) return null;
  const [rmpData, setRmpData] = useState(null);
  const [isLoadingRmp, setIsLoadingRmp] = useState(true);
  const [friendData, setFriendData] = useState(null);
  const [profDepts, setProfDepts] = useState([]);
  const [profDeptAvgs, setProfDeptAvgs] = useState({
    quality: [],
    difficulty: [],
    workload: [],
  });
  const [preferredPercentiles, setPreferredPercentiles] = useState({
    quality: 1,
    difficulty: 0,
    workload: 0,
  });

  useEffect(() => {
    const getPrefferedPercentiles = async () => {
      const userInfo = (await chrome.storage.local.get("userInfo")).userInfo;
      if (userInfo.preferences && userInfo.preferences.difficulty) {
        setPreferredPercentiles({
          quality: 1,
          difficulty: userInfo.preferences.difficulty / 4,
          workload: userInfo.preferences.difficulty / 4,
        });
      }
    };
    getPrefferedPercentiles();

    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === "local" && changes.userInfo) {
        getPrefferedPercentiles();
      }
    });
  }, []);

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
      const profDepts = Object.keys(data[selected.id]).filter(
        (key) => key !== "type" && key.length === 4,
      );
      setProfDepts(profDepts);
      setProfDeptAvgs({
        quality: getDeptAvgs(profDepts, "quality"),
        difficulty: getDeptAvgs(profDepts, "difficulty"),
        workload: getDeptAvgs(profDepts, "workload"),
      });
      getRMPrating();
    } else {
      setIsLoadingRmp(false);
    }
  }, [selected]);

  const getDeptAvgs = (profDepts, type) => {
    const aggregatedAvgs = [];
    for (const dept of profDepts) {
      if (data.departmentStatistics[dept][`${type}Avgs`].length > 0) {
        aggregatedAvgs.push(...data.departmentStatistics[dept][`${type}Avgs`]);
      }
    }
    return aggregatedAvgs.sort();
  };

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
          if (match[1] === "Not taken at SCU") {
            friendTakenInfos.push(`${friendName} took outside of SCU`);
            continue;
          }
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

  const getColor = (value, valueType, dept, ratingType) => {
    if (ratingType === "rmp") {
      return getRatingColor(value, 1, 5, valueType === "quality");
    }
    let percentile;
    if (ratingType === "profOverall") {
      percentile = getPercentile(value, profDeptAvgs[valueType]);
    } else {
      percentile = getPercentile(
        value,
        data.departmentStatistics[dept][`${valueType}Avgs`],
      );
    }
    let score =
      100 - Math.abs(preferredPercentiles[valueType] - percentile) * 100;
    return getRatingColor(score, 0, 100, true);
  };

  const StatBox = ({ label, value, valueType, dept, ratingType }) => (
    <Box>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Box sx={{ display: "flex", alignItems: "baseline" }}>
        <Typography
          variant="h6"
          sx={{
            color: getColor(value, valueType, dept, ratingType),
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
          {valueType === "workload" ? " hrs/week" : "/5"}
        </Typography>
      </Box>
    </Box>
  );

  const renderEvalStats = (stats, dept, ratingType) => {
    if (
      !stats ||
      stats.qualityTotal === undefined ||
      stats.difficultyTotal === undefined ||
      stats.workloadTotal === undefined
    ) {
      return (
        <Typography variant="body2" color="text.secondary">
          No statistics available
        </Typography>
      );
    }

    return (
      <Box
        sx={{
          display: "flex",
          gap: 4,
          justifyContent: "space-between",
          px: 2,
        }}
      >
        <StatBox
          label="Quality"
          value={stats.qualityTotal / stats.qualityCount}
          valueType="quality"
          dept={dept}
          ratingType={ratingType}
        />
        <StatBox
          label="Difficulty"
          value={stats.difficultyTotal / stats.difficultyCount}
          valueType="difficulty"
          dept={dept}
          ratingType={ratingType}
        />
        <StatBox
          label="Workload"
          value={stats.workloadTotal / stats.workloadCount}
          valueType="workload"
          dept={dept}
          ratingType={ratingType}
        />
      </Box>
    );
  };

  const renderRMPStats = () => {
    const getRmpLink = () => {
      if (rmpData && rmpData.legacyId) {
        return `https://www.ratemyprofessors.com/professor/${rmpData.legacyId}`;
      }
      return `https://www.ratemyprofessors.com/search/professors?q=${selected.id}`;
    };

    if (isLoadingRmp) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", my: 2 }}>
          <CircularProgress size={24} />
        </Box>
      );
    }

    if (!rmpData) {
      return (
        <>
          <Typography
            variant="h6"
            fontSize={"1.15rem"}
            gutterBottom
            sx={{ mt: 2 }}
          >
            RateMyProfessor Statistics
          </Typography>
          <Box sx={{ px: 2 }}>
            <Typography variant="body2" display="inline" color="text.secondary">
              No data available
              <Typography
                variant="body3"
                component={"span"}
                fontSize={"0.72rem"}
                marginLeft={"7px"}
                color="text.secondary"
              >
                <a
                  href={getRmpLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#802a25" }}
                >
                  Search RateMyProfessors
                </a>
              </Typography>
            </Typography>
          </Box>
        </>
      );
    }
    return (
      <>
        <Typography
          variant="h6"
          fontSize={"1.15rem"}
          gutterBottom
          sx={{ mt: 3 }}
        >
          RateMyProfessor Statistics
          <Typography
            variant="body2"
            component="span"
            sx={{ ml: 1, color: "text.secondary" }}
          >
            <a
              href={getRmpLink()}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#802a25" }}
            >
              View Profile
            </a>
          </Typography>
        </Typography>
        <Box
          sx={{
            display: "flex",
            gap: 4,
            justifyContent: "space-between",
            px: 2,
          }}
        >
          <Box sx={{ display: "flex", gap: 8.5 }}>
            <StatBox
              label="Quality"
              value={rmpData.avgRating}
              valueType="quality"
              dept={"n/a"}
              ratingType="rmp"
            />
            <StatBox
              label="Difficulty"
              value={rmpData.avgDifficulty}
              valueType="difficulty"
              dept={"n/a"}
              ratingType="rmp"
            />
          </Box>
        </Box>
      </>
    );
  };

  if (selected.type === "prof") {
    return (
      <Card sx={{ backgroundColor: "#f0f0f0" }}>
        <CardContent>
          <Typography fontWeight="bold" display="inline" variant="h6">
            {selected.id}
          </Typography>
          {profDepts.map((dept) => (
            <Typography
              key={dept}
              display={"inline-block"}
              component={"span"}
              variant="body2"
              fontWeight={"400"}
              position={"relative"}
              bottom={3}
              borderRadius={5}
              bgcolor={"#b3b9be"}
              paddingY={0.25}
              paddingX={1}
              marginLeft={1.25}
              sx={{ verticalAlign: "middle" }}
            >
              {dept}
            </Typography>
          ))}

          <FriendCoursesTooltip friendData={friendData} />
          {selected.overall && (
            <>
              <Typography
                variant="h6"
                fontSize={"1.15rem"}
                fontWeight={"500"}
                gutterBottom
              >
                Overall Course Evaluation Statistics
              </Typography>
              {renderEvalStats(selected.overall, "n/a", "profOverall")}
            </>
          )}
          {renderRMPStats()}
          <Typography
            variant="h6"
            fontSize={"1.15rem"}
            fontWeight={"500"}
            marginTop={2}
            gutterBottom
          >
            Statistics by Course
          </Typography>
          {Object.entries(selected)
            .filter(
              ([key, value]) =>
                typeof value === "object" &&
                value.qualityTotal !== undefined &&
                key !== "overall" &&
                key.length > 4,
            )
            .map(([courseCode, courseStats], index) => (
              <Box key={courseCode} sx={{ mt: 2 }}>
                <Typography variant="body1" gutterBottom>
                  {courseCode}
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
                {renderEvalStats(
                  courseStats,
                  courseCode.substring(0, 4),
                  "course",
                )}
                {index <
                  Object.keys(selected).filter((key) =>
                    key.match(/[A-Z]{4}\d+/),
                  ).length -
                    1 && <Divider sx={{ my: 2 }} />}
              </Box>
            ))}
          <Typography
            variant="h6"
            fontSize={"1.15rem"}
            marginTop={2}
            gutterBottom
          >
            Statistics by Department
          </Typography>
          {Object.entries(selected)
            .filter(
              ([key, value]) =>
                typeof value === "object" &&
                value.qualityTotal !== undefined &&
                key !== "overall" &&
                key.length === 4,
            )
            .map(([dept, stats], index) => (
              <Box key={dept} sx={{ mt: 2 }}>
                <Typography variant="body1" gutterBottom>
                  {dept}
                </Typography>
                {renderEvalStats(stats, dept, "course")}
                {index <
                  Object.keys(selected).filter((key) => key.length === 4)
                    .length -
                    2 && <Divider sx={{ my: 2 }} />}
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
          <Typography variant="h6" fontWeight="bold">
            {selected.courseName} ({selected.id})
          </Typography>

          <Typography variant="body2" color="text.secondary" gutterBottom>
            Recent Terms: {selected.recentTerms.join(", ")}
          </Typography>

          <FriendCoursesTooltip friendData={friendData} />

          <Typography
            variant="h6"
            gutterBottom
            fontSize={"1.15rem"}
            marginTop={2}
          >
            Overall Statistics
          </Typography>
          {renderEvalStats(selected, selected.id.substring(0, 4), "course")}
          <Typography
            variant="h6"
            fontSize={"1.15rem"}
            marginTop={2}
            gutterBottom
          >
            Statistics by Professor
          </Typography>

          {selected.professors
            .map((profName) => [profName, data[profName][selected.id]])
            .sort((objA, objB) => {
              const ratingA = objA[1];
              ratingA.qualityAvg = ratingA.qualityTotal / ratingA.qualityCount;
              ratingA.difficultyAvg =
                ratingA.difficultyTotal / ratingA.difficultyCount;
              ratingA.workloadAvg =
                ratingA.workloadTotal / ratingA.workloadCount;
              const ratingB = objB[1];
              ratingB.qualityAvg = ratingB.qualityTotal / ratingB.qualityCount;
              ratingB.difficultyAvg =
                ratingB.difficultyTotal / ratingB.difficultyCount;
              ratingB.workloadAvg =
                ratingB.workloadTotal / ratingB.workloadCount;
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
            .map(([profName, profCourseStats], index) => {
              return (
                <Box key={profName} sx={{ mt: 2 }}>
                  <Typography variant="body1" gutterBottom>
                    {profName}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ px: 2, mt: 1, mb: 2 }}
                  >
                    Quarters Taught: {profCourseStats.recentTerms.join(", ")}
                  </Typography>
                  {renderEvalStats(
                    profCourseStats,
                    selected.id.substring(0, 4),
                    "course",
                  )}
                  {index < selected.professors.length - 1 && (
                    <Divider sx={{ my: 2 }} />
                  )}
                </Box>
              );
            })}
        </CardContent>
      </Card>
    );
  }
  return null;
}

function getRatingColor(rating, ratingMin, ratingMax, goodValuesAreHigher) {
  if (nullOrUndefined(rating)) return "rgba(0, 0, 0, 0.5)";
  if (rating < ratingMin) rating = ratingMin;
  if (rating > ratingMax) rating = ratingMax;
  const greenShade = [66, 134, 67];
  const yellowShade = [255, 234, 0];
  const redShade = [194, 59, 34];
  const ratingMid = ratingMin + (ratingMax - ratingMin) / 2;
  if (rating <= ratingMid && goodValuesAreHigher) {
    return interpolateColor(
      redShade,
      yellowShade,
      (rating - ratingMin) / (ratingMid - ratingMin),
    );
  }
  if (rating <= ratingMid && !goodValuesAreHigher) {
    return interpolateColor(
      greenShade,
      yellowShade,
      (rating - ratingMin) / (ratingMid - ratingMin),
    );
  }
  if (goodValuesAreHigher) {
    return interpolateColor(
      yellowShade,
      greenShade,
      (rating - ratingMid) / (ratingMax - ratingMid),
    );
  }
  return interpolateColor(
    yellowShade,
    redShade,
    (rating - ratingMid) / (ratingMax - ratingMid),
  );
}

function interpolateColor(color1, color2, ratio) {
  const r = Math.round(color1[0] + ratio * (color2[0] - color1[0]));
  const g = Math.round(color1[1] + ratio * (color2[1] - color1[1]));
  const b = Math.round(color1[2] + ratio * (color2[2] - color1[2]));
  return `rgba(${r}, ${g}, ${b}, 1)`;
}

function getPercentile(value, array) {
  if (!value || !array || array.length === 0) return null;
  return bsFind(array, value) / array.length;
}

function bsFind(sortedArray, target) {
  let left = 0;
  let right = sortedArray.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (sortedArray[mid] === target) return mid;
    if (sortedArray[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return left;
}

function nullOrUndefined(value) {
  return value === null || value === undefined;
}
