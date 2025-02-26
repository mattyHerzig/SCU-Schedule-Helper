import { useEffect, useState } from "react";
import { Box, Divider, Typography } from "@mui/material";
import EvalStats from "../EvalStats";
import StatsWithLessFormatting from "../StatsWithLessFormatting";
import FriendCoursesTooltip from "../FriendCoursesTooltip";
import RmpStats from "../RmpStats";
import ProfessorRecency from "./ProfessorRecency";
import RecentTermsToolTip from "../RecentTermsToolTip";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import KeyboardArrowUp from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDown from "@mui/icons-material/KeyboardArrowDown";
import { 
  extractTerms, 
  getDeptAvgs,
  sortByScore, 
  sortByScoreAscending, 
  sortByQuality, 
  sortByQualityAscending, 
  sortByDifficulty, 
  sortByDifficultyAscending, 
  sortByWorkload, 
  sortByWorkloadAscending 
} from "./utils";

export default function ProfessorView({ selected, data, friendData, preferredPercentiles, onPageNavigation }) {
  const [rmpData, setRmpData] = useState(null);
  const [isLoadingRmp, setIsLoadingRmp] = useState(true);
  const [profDepts, setProfDepts] = useState([]);
  const [sortingToggle, setSortingToggle] = useState(0);
  const [profDeptAvgs, setProfDeptAvgs] = useState({
    quality: [],
    difficulty: [],
    workload: [],
  });
  const [sortedCourses, setSortedCourses] = useState([]);

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

    // Get courses
    const courses = Object.entries(data[selected.id]).filter(
      ([key, value]) => key !== "overall" && key.length > 4
    );
    
    // Get departments
    const profDepts = Object.keys(data[selected.id]).filter(
      (key) => key !== "type" && key.length === 4
    );
    setProfDepts(profDepts);
    
    // Set department averages
    setProfDeptAvgs({
      qualityAvgs: getDeptAvgs(profDepts, "quality", data),
      difficultyAvgs: getDeptAvgs(profDepts, "difficulty", data),
      workloadAvgs: getDeptAvgs(profDepts, "workload", data),
    });
    
    // Initial sort by score
    setSortedCourses(sortByScore(courses, data, selected.id, true));
    
    // Get RMP ratings
    getRMPrating();
  }, [selected, data]);

  function getCourseName(courseCode) {
    return data[courseCode]?.courseName || "";
  }

  const handleSortByQuality = () => {
    if (sortingToggle === 0) {
      setSortingToggle(1);
      setSortedCourses(sortByQualityAscending(sortedCourses, data, selected.id, true));
    } else if (sortingToggle === 1) {
      setSortingToggle(0);
      setSortedCourses(sortByQuality(sortedCourses, data, selected.id, true));
    } else {
      setSortingToggle(0);
      setSortedCourses(sortByQuality(sortedCourses, data, selected.id, true));
    }
  };

  const handleSortByDifficulty = () => {
    if (sortingToggle === 2) {
      setSortingToggle(3);
      setSortedCourses(sortByDifficultyAscending(sortedCourses, data, selected.id, true));
    } else if (sortingToggle === 3) {
      setSortingToggle(2);
      setSortedCourses(sortByDifficulty(sortedCourses, data, selected.id, true));
    } else {
      setSortingToggle(2);
      setSortedCourses(sortByDifficulty(sortedCourses, data, selected.id, true));
    }
  };

  const handleSortByWorkload = () => {
    if (sortingToggle === 4) {
      setSortingToggle(5);
      setSortedCourses(sortByWorkloadAscending(sortedCourses, data, selected.id, true));
    } else if (sortingToggle === 5) {
      setSortingToggle(4);
      setSortedCourses(sortByWorkload(sortedCourses, data, selected.id, true));
    } else {
      setSortingToggle(4);
      setSortedCourses(sortByWorkload(sortedCourses, data, selected.id, true));
    }
  };

  const handleOverallSort = () => {
    if (sortingToggle === 6) {
      setSortingToggle(7);
      setSortedCourses(sortByScoreAscending(sortedCourses, data, selected.id, true));
    } else if (sortingToggle === 7) {
      setSortingToggle(6);
      setSortedCourses(sortByScore(sortedCourses, data, selected.id, true));
    } else {
      setSortingToggle(6);
      setSortedCourses(sortByScore(sortedCourses, data, selected.id, true));
    }
  };

  return (
    <>
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
      
      <Divider sx={{ mt: 2 }} />
      
      <Typography
        variant="h6"
        fontSize={"1.15rem"}
        fontWeight={"500"}
        marginTop={2}
        gutterBottom
      >
        Statistics by Course
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
          {
            label: "Overall",
            subLabel: "Rank",
            toggle: [6, 7],
            handler: handleOverallSort,
          },
          {
            label: "Quality",
            subLabel: "(1-5)",
            toggle: [0, 1],
            handler: handleSortByQuality,
          },
          {
            label: "Difficulty",
            subLabel: "(1-5)",
            toggle: [2, 3],
            handler: handleSortByDifficulty,
          },
          {
            label: "Workload",
            subLabel: "(hrs/week)",
            toggle: [4, 5],
            handler: handleSortByWorkload,
          },
        ].map(({ label, subLabel, toggle, handler }, index) => (
          <Typography
            key={index}
            variant="body2"
            color="text.secondary"
            textAlign={"center"}
            onClick={handler}
            sx={{ cursor: "pointer", fontSize: "0.70rem" }}
            title={
              sortingToggle === toggle[0] || sortingToggle === toggle[1]
                ? ""
                : `Sort by ${label}`
            }
          >
            <Box display="flex" flexDirection={"row"} alignItems={"center"}>
              <Box textAlign="center">
                {sortingToggle === toggle[0] || sortingToggle === toggle[1] ? (
                  <u>
                    <b>{label}</b>
                  </u>
                ) : (
                  label
                )}
                <br />
                {sortingToggle === toggle[0] || sortingToggle === toggle[1] ? (
                  <u>
                    <b>{subLabel}</b>
                  </u>
                ) : (
                  subLabel
                )}
              </Box>
              <Box
                display="flex"
                flexDirection={"column"}
                alignItems={"center"}
                justifyContent={"space-around"}
              >
                {sortingToggle === toggle[0] ? (
                  <KeyboardArrowUp
                    fontSize="small"
                    sx={{ marginBottom: "-5px", fontSize: "1rem" }}
                  />
                ) : sortingToggle === toggle[1] ? (
                  <KeyboardArrowDown
                    fontSize="small"
                    sx={{ marginTop: "-5px", fontSize: "1rem" }}
                  />
                ) : (
                  <>
                    <KeyboardArrowUp
                      fontSize="small"
                      sx={{ marginBottom: "-5px", fontSize: "1rem" }}
                    />
                    <KeyboardArrowDown
                      fontSize="small"
                      sx={{ marginTop: "-5px", fontSize: "1rem" }}
                    />
                  </>
                )}
              </Box>
            </Box>
          </Typography>
        ))}
      </Box>
      
      {sortedCourses.length > 0 &&
        sortedCourses.map(([courseCode, courseStats], index) => (
          <Box key={courseCode}>
            <Box
              sx={{ mt: 2 }}
              display={"flex"}
              flexDirection={"row"}
              justifyContent={"space-between"}
            >
              <Box
                display="flex"
                alignItems="left"
                flexDirection="column"
                justifyContent="space-between"
              >
                <Typography
                  variant="body1"
                  gutterBottom
                  onClick={() => {
                    onPageNavigation(courseCode);
                  }}
                  sx={{
                    ml: 1,
                    color: "#802a25",
                    cursor: "pointer",
                    "&:hover": {
                      textDecoration: "underline",
                    },
                    margin: "0px 0px 0px",
                  }}
                  title={getCourseName(courseCode)}
                >
                  {`${courseCode.substring(0, 4)} ${courseCode.substring(4)}`}
                </Typography>
                
                {courseStats.recentTerms && (
                  <>
                    <RecentTermsToolTip recentTerms={courseStats.recentTerms}>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        width={"150px"}
                        sx={{
                          margin: "0px 0px 0px",
                        }}
                      >
                        <CalendarMonthIcon
                          fontSize="small"
                          sx={{
                            marginRight: "2px",
                            color: "black",
                            marginBottom: "-2px",
                            fontSize: "16px",
                          }}
                        />
                        {extractTerms(courseStats.recentTerms).join(", ")}
                      </Typography>
                    </RecentTermsToolTip>
                    
                    <ProfessorRecency lastTaughtQuarter={courseStats.recentTerms[0]} />
                  </>
                )}
              </Box>
              
              <Box
                display="flex"
                flexDirection="column"
                justifyContent="center"
              >
                <StatsWithLessFormatting
                  stats={courseStats}
                  deptStats={data.departmentStatistics[courseCode.substring(0, 4)]}
                  preferredPercentiles={preferredPercentiles}
                />
              </Box>
            </Box>
            
            {index < sortedCourses.length - 1 && <Divider sx={{ my: 2 }} />}
          </Box>
        ))}
      
      <Divider sx={{ mt: 2 }} />
      
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
            key.length === 4
        )
        .map(([dept, stats], index, arr) => (
          <Box key={dept} sx={{ mt: 2 }}>
            <Typography variant="body1" gutterBottom>
              {dept}
            </Typography>
            <EvalStats
              stats={stats}
              deptStats={data.departmentStatistics[dept]}
              preferredPercentiles={preferredPercentiles}
            />
            {index < arr.length - 1 && <Divider sx={{ my: 2 }} />}
          </Box>
        ))}
    </>
  );
}