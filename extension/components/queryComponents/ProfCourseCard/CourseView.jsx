import { useEffect, useState } from "react";
import { Box, Divider, Typography } from "@mui/material";
import EvalStats from "../EvalStats";
import StatsWithLessFormatting from "../StatsWithLessFormatting";
import FriendCoursesTooltip from "../FriendCoursesTooltip";
import RecentTermsToolTip from "../RecentTermsToolTip";
import ProfessorRecency from "./ProfessorRecency";
import { extractTerms } from "./utils";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import KeyboardArrowUp from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDown from "@mui/icons-material/KeyboardArrowDown";
import { sortByScore } from './utils'; // Make sure the path is correct

export default function CourseView({ selected, data, friendData, preferredPercentiles, onPageNavigation }) {
  const [sortingToggle, setSortingToggle] = useState(0);
  const [sortedProfessors, setSortedProfessors] = useState([]);

  useEffect(() => {
    if (selected?.professors) {
      // Initial sort by score
      setSortedProfessors(sortByScore(selected.professors, data, selected.id));
    }
  }, [selected, data]);

  const handleSortByQuality = () => {
    if (sortingToggle === 0) {
      setSortingToggle(1);
      setSortedProfessors(sortByQualityAscending(selected.professors, data, selected.id));
    } else if (sortingToggle === 1) {
      setSortingToggle(0);
      setSortedProfessors(sortByQuality(selected.professors, data, selected.id));
    } else {
      setSortingToggle(0);
      setSortedProfessors(sortByQuality(selected.professors, data, selected.id));
    }
  };

  const handleSortByDifficulty = () => {
    if (sortingToggle === 2) {
      setSortingToggle(3);
      setSortedProfessors(sortByDifficultyAscending(selected.professors, data, selected.id));
    } else if (sortingToggle === 3) {
      setSortingToggle(2);
      setSortedProfessors(sortByDifficulty(selected.professors, data, selected.id));
    } else {
      setSortingToggle(2);
      setSortedProfessors(sortByDifficulty(selected.professors, data, selected.id));
    }
  };

  const handleSortByWorkload = () => {
    if (sortingToggle === 4) {
      setSortingToggle(5);
      setSortedProfessors(sortByWorkloadAscending(selected.professors, data, selected.id));
    } else if (sortingToggle === 5) {
      setSortingToggle(4);
      setSortedProfessors(sortByWorkload(selected.professors, data, selected.id));
    } else {
      setSortingToggle(4);
      setSortedProfessors(sortByWorkload(selected.professors, data, selected.id));
    }
  };

  const handleOverallSort = () => {
    if (sortingToggle === 6) {
      setSortingToggle(7);
      setSortedProfessors(sortByScoreAscending(selected.professors, data, selected.id));
    } else if (sortingToggle === 7) {
      setSortingToggle(6);
      setSortedProfessors(sortByScore(selected.professors, data, selected.id));
    } else {
      setSortingToggle(6);
      setSortedProfessors(sortByScore(selected.professors, data, selected.id));
    }
  };

  return (
    <>
      <Typography variant="h6" fontWeight="bold">
        {selected.courseName} ({selected.id})
      </Typography>
      
      <RecentTermsToolTip recentTerms={selected.recentTerms}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          <b>Previously Offered: </b>{" "}
          {extractTerms(selected.recentTerms).join(", ")}
        </Typography>
      </RecentTermsToolTip>

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
      
      <Divider sx={{ mt: 2 }} />

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

      {sortedProfessors.length > 0 &&
        sortedProfessors.map(([profName, profCourseStats], index) => (
          <Box key={profName}>
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
                  component={"span"}
                  onClick={() => {
                    onPageNavigation(profName);
                  }}
                  sx={{
                    ml: 1,
                    color: "#802a25",
                    margin: "0px 0px 0px",
                    cursor: "pointer",
                    "&:hover": {
                      textDecoration: "underline",
                    },
                  }}
                >
                  {profName}
                </Typography>
                
                <RecentTermsToolTip recentTerms={profCourseStats.recentTerms}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    width={"150px"}
                    sx={{ margin: "0px 0px 0px" }}
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
                    <span marginBottom="2px">
                      {extractTerms(profCourseStats.recentTerms).join(", ")}
                    </span>
                  </Typography>
                </RecentTermsToolTip>
                
                <ProfessorRecency lastTaughtQuarter={profCourseStats.recentTerms[0]} />
              </Box>
              
              <Box
                display="flex"
                flexDirection="column"
                justifyContent="center"
              >
                <StatsWithLessFormatting
                  stats={profCourseStats}
                  deptStats={data.departmentStatistics[selected.id.substring(0, 4)]}
                  preferredPercentiles={preferredPercentiles}
                />
              </Box>
            </Box>

            {index < sortedProfessors.length - 1 && <Divider sx={{ my: 2 }} />}
          </Box>
        ))}
    </>
  );
}