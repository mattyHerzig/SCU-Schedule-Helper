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
import EvalStats from "./EvalStats";
import StatsWithLessFormatting from "./StatsWithLessFormatting";
import RmpStats from "./RmpStats";
import KeyboardArrowUp from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDown from "@mui/icons-material/KeyboardArrowDown";

export const courseTakenPattern = /P{(.*?)}C{(.*?)}T{(.*?)}/; // P{profName}C{courseCode}T{termName}
export const interestedSectionPattern = /P{(.*?)}S{(.*?)}M{(.*?)}/; // P{profName}S{full section string}M{meetingPattern}E{expirationTimestamp}

export default function ProfCourseCard({ selected, data, onPageNavigation }) {
  if (!selected) return null;
  const [rmpData, setRmpData] = useState(null);
  const [isLoadingRmp, setIsLoadingRmp] = useState(true);
  const [friendData, setFriendData] = useState(null);
  const [profDepts, setProfDepts] = useState([]);
  const [sortingToggle, setSortingToggle] = useState(0); 

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
  const [sortedProfessors, setSortedProfessors] = useState([]);
  const [sortedCourses, setSortedCourses] = useState([]);

  useEffect(() => {
    if (selected?.professors) {
      setSortedProfessors(sortByScore(selected.professors, data, selected.id));
    }
  }, [selected, data]);

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
    async function getRMPrating() {
      setIsLoadingRmp(true);
      try {
        const rmpRating = await chrome.runtime.sendMessage({
          type: "getRmpRatings",
          profName: selected.id,
        });

        setRmpData(rmpRating);
      } catch (error) {
        setRmpData(null);
      }
      setIsLoadingRmp(false);
    }

    if (selected.type === "prof") {
      const courses = Object.entries(data[selected.id]).filter(
        ([key, value]) => key !== "overall" && key.length > 4,
      );
      console.log("Courses: ", courses)
      setSortedCourses(sortByScore(courses, data, selected.id, true));
      console.log(sortedCourses);
      const profDepts = Object.keys(data[selected.id]).filter(
        (key) => key !== "type" && key.length === 4,
      );
      setProfDepts(profDepts);
      setProfDeptAvgs({
        qualityAvgs: getDeptAvgs(profDepts, "quality"),
        difficultyAvgs: getDeptAvgs(profDepts, "difficulty"),
        workloadAvgs: getDeptAvgs(profDepts, "workload"),
      });
      getRMPrating();
    } else {
      setIsLoadingRmp(false);
    }

    fetchFriendData();
  }, [selected]);

  function getDeptAvgs(profDepts, type) {
    const aggregatedAvgs = [];
    for (const dept of profDepts) {
      if (data.departmentStatistics[dept][`${type}Avgs`].length > 0) {
        aggregatedAvgs.push(...data.departmentStatistics[dept][`${type}Avgs`]);
      }
    }
    return aggregatedAvgs.sort();
  }

  async function fetchFriendData() {
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
  }

  function getCourseName(courseCode) {
    return data[courseCode]?.courseName || "";
  }

  function extractTerms(recentTerms) {
    const termPattern = /(Spring|Summer|Fall|Winter)/gi;
    const simplifiedTerms = recentTerms
      .map(term => term.match(termPattern))
      .flat()
      .filter(Boolean);
    const uniqueTerms = [...new Set(simplifiedTerms)];
    return uniqueTerms;
  }

  function sortByScore(items, data, selectedId, isCourse = false) {
    let isDescending = true;
    if (sortingToggle == 6) {
        isDescending = true;
        setSortingToggle(7);
    } else if (sortingToggle == 7) {
        isDescending = false;
        setSortingToggle(6);
    } else {
        setSortingToggle(7);
    }

    const mappedItems = items.map((item) => {
      const rating = isCourse ? item[1]: data[item][selectedId];
      return [isCourse ? item[0] : item, rating];
    });

    return mappedItems.sort((objA, objB) => {
            const ratingA = objA[1];
            ratingA.qualityAvg = ratingA.qualityTotal / ratingA.qualityCount;
            ratingA.difficultyAvg = ratingA.difficultyTotal / ratingA.difficultyCount;
            ratingA.workloadAvg = ratingA.workloadTotal / ratingA.workloadCount;
            const ratingB = objB[1];
            ratingB.qualityAvg = ratingB.qualityTotal / ratingB.qualityCount;
            ratingB.difficultyAvg = ratingB.difficultyTotal / ratingB.difficultyCount;
            ratingB.workloadAvg = ratingB.workloadTotal / ratingB.workloadCount;
            const scoreA =
                ratingA.qualityAvg +
                (5 - ratingA.difficultyAvg) +
                (15 - ratingA.workloadAvg);
            const scoreB =
                ratingB.qualityAvg +
                (5 - ratingB.difficultyAvg) +
                (15 - ratingB.workloadAvg);
            if (isDescending) {
                return scoreB - scoreA; // Sort by descending score.
            } else {
                return scoreA - scoreB; // Sort by ascending score.
            }
        });
  }
  
  function sortByQuality(items, data, selectedId, isCourse = false) {
    let isDescending = true;
    if (sortingToggle == 0) {
      isDescending = true;
      setSortingToggle(1);
    } else if (sortingToggle == 1) {
      isDescending = false;
      setSortingToggle(0);
    } else {
      setSortingToggle(1);
    }
    const mappedItems = items.map((item) => {
      const rating = isCourse ? item[1]: data[item][selectedId];
      return [isCourse ? item[0] : item, rating];
    });

    return mappedItems.sort((objA, objB) => {
        const ratingA = objA[1];
        ratingA.qualityAvg = ratingA.qualityTotal / ratingA.qualityCount;
        const ratingB = objB[1];
        ratingB.qualityAvg = ratingB.qualityTotal / ratingB.qualityCount;
        if (isDescending) {
          return ratingB.qualityAvg - ratingA.qualityAvg; // Sort by descending quality.
        } else {
          return ratingA.qualityAvg - ratingB.qualityAvg; // Sort by ascending quality.
        }
      });
  }
  
  function sortByDifficulty(items, data, selectedId, isCourse = false) {
    let isDescending = true;
    if (sortingToggle == 2) {
      isDescending = true;
      setSortingToggle(3);
    } else if (sortingToggle == 3) {
      isDescending = false;
      setSortingToggle(2);
    } else {
      setSortingToggle(3);
    }

    const mappedItems = items.map((item) => {
      const rating = isCourse ? item[1]: data[item][selectedId];
      return [isCourse ? item[0] : item, rating];
    });

    return mappedItems.sort((objA, objB) => {
        const ratingA = objA[1];
        ratingA.difficultyAvg = ratingA.difficultyTotal / ratingA.difficultyCount;
        const ratingB = objB[1];
        ratingB.difficultyAvg = ratingB.difficultyTotal / ratingB.difficultyCount;
        if (isDescending) {
          return ratingB.difficultyAvg - ratingA.difficultyAvg; // Sort by descending difficulty.
        } else {
          return ratingA.difficultyAvg - ratingB.difficultyAvg; // Sort by ascending difficulty.
        }
      });
  }
  
  function sortByWorkload(items, data, selectedId, isCourse = false) {
    let isDescending = true;
    if (sortingToggle == 4) {
      isDescending = true;
      setSortingToggle(5);
    } else if (sortingToggle == 5) {
      isDescending = false;
      setSortingToggle(4);
    } else {
      setSortingToggle(5);
    }
    
    const mappedItems = items.map((item) => {
      const rating = isCourse ? item[1]: data[item][selectedId];
      return [isCourse ? item[0] : item, rating];
    });

    return mappedItems.sort((objA, objB) => {
      const ratingA = objA[1];
      ratingA.workloadAvg = ratingA.workloadTotal / ratingA.workloadCount;
      const ratingB = objB[1];
      ratingB.workloadAvg = ratingB.workloadTotal / ratingB.workloadCount;
      if (isDescending) {
        return ratingB.workloadAvg - ratingA.workloadAvg; // Sort by descending workload.
      } else {
        return ratingA.workloadAvg - ratingB.workloadAvg; // Sort by ascending workload.
      }
      });
  }
  
  const handleSortByQuality = () => {
    if (selected.type === "course") {
      setSortedProfessors(sortByQuality(selected.professors, data, selected.id));
    } else {
      setSortedCourses(sortByQuality(sortedCourses, data, selected.id, true));
    }
  };
  
  const handleSortByDifficulty = () => {
    if (selected.type === "course") {
      setSortedProfessors(sortByDifficulty(selected.professors, data, selected.id));
    } else {
      setSortedCourses(sortByDifficulty(sortedCourses, data, selected.id, true));
    }
  };
  
  const handleSortByWorkload = () => {
    if (selected.type === "course") {
      setSortedProfessors(sortByWorkload(selected.professors, data, selected.id));
    } else {
      setSortedCourses(sortByWorkload(sortedCourses, data, selected.id, true));
      console.log(sortedCourses);
    }
  };
  
  const handleOverallSort = () => {
    if (selected.type === "course") {
      setSortedProfessors(sortByScore(selected.professors, data, selected.id));
    } else {
      setSortedCourses(sortByScore(sortedCourses, data, selected.id, true));
      console.log(sortedCourses);
    }
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
              <EvalStats
                stats={selected.overall}
                deptStats={profDeptAvgs}
                preferredPercentiles={preferredPercentiles}
              />
            </>
          )}
          <RmpStats
            rmpData={rmpData}
            isLoadingRmp={isLoadingRmp}
            profName={selected.id}
            preferredPercentiles={preferredPercentiles}
          />
          <hr />
          <Typography
            variant="h6"
            fontSize={"1.15rem"}
            fontWeight={"500"}
            marginTop={2}
            gutterBottom
          >
            Statistics by Course
            <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignContent: "right",
              width: "275px",
              marginLeft: "auto",
            }}
            >
              {[
                { label: "Overall", subLabel: "Rank", toggle: [6, 7], handler: handleOverallSort },
                { label: "Quality", subLabel: "(1-5)", toggle: [0, 1], handler: handleSortByQuality },
                { label: "Difficulty", subLabel: "(1-5)", toggle: [2, 3], handler: handleSortByDifficulty },
                { label: "Workload", subLabel: "(hrs/week)", toggle: [4, 5], handler: handleSortByWorkload },
              ].map(({ label, subLabel, toggle, handler }, index) => (
                <Typography
                  key={index}
                  variant="body2"
                  color="text.secondary"
                  textAlign={"center"}
                  onClick={handler}
                  sx={{ cursor: "pointer", fontSize: '0.70rem' }}
                  title={sortingToggle === toggle[0] || sortingToggle === toggle[1] ? "" : `Sort by ${label}`}
                >
                  <Box display="flex" flexDirection={"row"} alignItems={"center"}>
                    <Box textAlign="center">
                      {sortingToggle === toggle[0] || sortingToggle === toggle[1] ? (
                        <u><b>{label}</b></u>
                      ) : (
                        label
                      )}
                      <br />
                      {sortingToggle === toggle[0] || sortingToggle === toggle[1] ? (
                        <u><b>{subLabel}</b></u>
                      ) : (
                        subLabel
                      )}
                    </Box>
                    <Box display="flex" flexDirection={"column"} alignItems={"center"} justifyContent={"space-around"}>
                      {sortingToggle === toggle[1] ? (
                        <KeyboardArrowUp fontSize="small" sx={{ marginBottom: "-5px", fontSize: '1rem'}} />
                      ) : sortingToggle === toggle[0] ? (
                        <KeyboardArrowDown fontSize="small" sx={{ marginTop: "-5px", fontSize: '1rem' }} />
                      ) : (
                        <>
                          <KeyboardArrowUp fontSize="small" sx={{ marginBottom: "-5px", fontSize: '1rem' }} />
                          <KeyboardArrowDown fontSize="small" sx={{ marginTop: "-5px", fontSize: '1rem' }} />
                        </>
                      )}
                    </Box>
                  </Box>
                </Typography>
              ))}
            </Box>
          </Typography>
          {sortedCourses.length > 0 && sortedCourses
            .map(([courseCode, courseStats], index) => (
              <Box key={courseCode} sx={{ mt: 2 }}>
                <Box display="flex" 
                alignItems="center" 
                flexDirection="row" 
                justifyContent="space-between"
                >
                  <Typography 
                    variant="body1" 
                    gutterBottom
                    onClick={() => {onPageNavigation(courseCode);}}
                    sx={{ 
                      ml: 1, 
                      color: "#802a25", 
                      cursor: "pointer", 
                      "&:hover": {
                        textDecoration: "underline",
                      }
                    }}
                    title={getCourseName(courseCode)}
                  >
                    {`${courseCode.substring(0, 4)} ${courseCode.substring(4)}`}
                  </Typography>
                  <StatsWithLessFormatting
                    stats={courseStats}
                    deptStats={data.departmentStatistics[courseCode.substring(0, 4)]}
                    preferredPercentiles={preferredPercentiles}
                  />
                </Box>
                {courseStats.recentTerms && (
                    <Typography
                    variant="body2"
                    color="text.secondary"
                    width={"150px"}
                    sx={{ margin: "0px 9px 5px" }}
                    >
                      <span title={courseStats.recentTerms.join(", ")}>
                        {extractTerms(courseStats.recentTerms).join(", ")}
                      </span>
                    </Typography>
                  )}
                {index <
                  Object.keys(selected).filter((key) =>
                    key.match(/[A-Z]{4}\d+/),
                  ).length -
                    1 && <Divider sx={{ my: 2 }} />}
              </Box>
            ))}
          <hr />
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
                <EvalStats
                  stats={stats}
                  deptStats={data.departmentStatistics[dept]}
                  preferredPercentiles={preferredPercentiles}
                />
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

          <Typography 
            variant="body2" 
            color="text.secondary" 
            gutterBottom 
          >
            <span title={selected.recentTerms.join(", ")}>
              <b>Previously Offered: </b> {extractTerms(selected.recentTerms).join(", ")}
            </span>
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
          <EvalStats
            stats={selected}
            deptStats={data.departmentStatistics[selected.id.substring(0, 4)]}
            preferredPercentiles={preferredPercentiles}
          />
          <hr sx={{ mt: 2 }} />
          
          <Typography
            variant="h6"
            fontSize={"1.15rem"}
            marginTop={2}
            gutterBottom
          >
            Statistics by Professor
          </Typography>
  
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignContent: "right",
              width: "275px",
              marginLeft: "auto",
            }}
          >
            {[
              { label: "Overall", subLabel: "Rank", toggle: [6, 7], handler: handleOverallSort },
              { label: "Quality", subLabel: "(1-5)", toggle: [0, 1], handler: handleSortByQuality },
              { label: "Difficulty", subLabel: "(1-5)", toggle: [2, 3], handler: handleSortByDifficulty },
              { label: "Workload", subLabel: "(hrs/week)", toggle: [4, 5], handler: handleSortByWorkload },
            ].map(({ label, subLabel, toggle, handler }, index) => (
              <Typography
                key={index}
                variant="body2"
                color="text.secondary"
                textAlign={"center"}
                onClick={handler}
                sx={{ cursor: "pointer", fontSize: '0.70rem' }}
                title={sortingToggle === toggle[0] || sortingToggle === toggle[1] ? "" : `Sort by ${label}`}
              >
                <Box display="flex" flexDirection={"row"} alignItems={"center"}>
                  <Box textAlign="center">
                    {sortingToggle === toggle[0] || sortingToggle === toggle[1] ? (
                      <u><b>{label}</b></u>
                    ) : (
                      label
                    )}
                    <br />
                    {sortingToggle === toggle[0] || sortingToggle === toggle[1] ? (
                      <u><b>{subLabel}</b></u>
                    ) : (
                      subLabel
                    )}
                  </Box>
                  <Box display="flex" flexDirection={"column"} alignItems={"center"} justifyContent={"space-around"}>
                    {sortingToggle === toggle[1] ? (
                      <KeyboardArrowUp fontSize="small" sx={{ marginBottom: "-5px", fontSize: '1rem'}} />
                    ) : sortingToggle === toggle[0] ? (
                      <KeyboardArrowDown fontSize="small" sx={{ marginTop: "-5px", fontSize: '1rem' }} />
                    ) : (
                      <>
                        <KeyboardArrowUp fontSize="small" sx={{ marginBottom: "-5px", fontSize: '1rem' }} />
                        <KeyboardArrowDown fontSize="small" sx={{ marginTop: "-5px", fontSize: '1rem' }} />
                      </>
                    )}
                  </Box>
                </Box>
              </Typography>
            ))}
          </Box>

          {sortedProfessors.length > 0 && sortedProfessors
            .map(([profName, profCourseStats], index) => {
              return (
                <Box key={profName} sx={{ mt: 2 }}>
                  <Box display="flex" 
                  alignItems="center" 
                  flexDirection="row" 
                  justifyContent="space-between">
                    <Typography 
                    variant="body1" 
                    gutterBottom
                    component={"span"}
                    onClick={() => {
                      onPageNavigation(profName);
                    }}
                    sx={{ 
                      ml: 1,
                      color: "#802a25",
                      margin: "-5px 9px 16px",
                      cursor: "pointer",
                      "&:hover": {
                        textDecoration: "underline",
                      }
                    }}
                    >
                      {profName}
                    </Typography>
                    <StatsWithLessFormatting
                      stats={profCourseStats}
                      deptStats={data.departmentStatistics[selected.id.substring(0, 4)]}
                      preferredPercentiles={preferredPercentiles}
                    />
                  </Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    width={"150px"}
                    sx={{ margin: "0px 9px 5px" }}
                  >
                    <span title={profCourseStats.recentTerms.join(", ")}>
                      {extractTerms(profCourseStats.recentTerms).join(", ")}
                    </span>
                  </Typography>
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

