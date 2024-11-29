import React, { useEffect, useState } from "react";
import { Card, CardContent, Typography, Box } from "@mui/material";

const ProfCourseCard = ({ selected, data }) => {
  if (!selected) return null;
  const [rmpData, SetRmpData] = useState(null);
  const [isLoadingRmp, setIsLoadingRmp] = useState(true);

  useEffect(() => {
    const getRMPrating = async () => {
      const rmpRating = await chrome.runtime.sendMessage({
        type: "getRmpRatings",
        profName: selected.id,
      });
      SetRmpData(rmpRating); // Might be null, in which case should display N/A.
      // console.log("RMP Rating:", rmpRating);
      setIsLoadingRmp(false);
    };

    if (selected.type === "prof") {
      getRMPrating();
    } else {
      setIsLoadingRmp(false);
    }
  }, [selected]);

  const getColor = (rating, type) => {
    let normalizedRating;

    if (type === "workload") {
      normalizedRating = (rating - 1) / 9;
    } else {
      normalizedRating = rating / 5;
    }

    if (type === "quality") {
      const r = Math.round(255 * (1 - normalizedRating));
      const g = Math.round(255 * normalizedRating);
      return `rgb(${r}, ${g}, 0)`;
    } else {
      const r = Math.round(255 * normalizedRating);
      const g = Math.round(255 * (1 - normalizedRating));
      return `rgb(${r}, ${g}, 0)`;
    }
  };

  const renderEvalStats = (stats) => {
    //Check if stats is null, undefined, or missing required properties
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

  if (selected.type === "prof") {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {selected.id}
          </Typography>

          {selected.overall && (
            <>
              <Typography variant="subtitle1" gutterBottom>
                Overall Statistics:
              </Typography>
              {renderEvalStats(selected.overall)}
            </>
          )}

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
            .map(([courseCode, courseStats]) => (
              <Box key={courseCode} sx={{ mt: 2 }}>
                <Typography variant="body1" gutterBottom>
                  {courseCode}{" "}
                  {courseStats.courseName ? `- ${courseStats.courseName}` : ""}
                </Typography>
                {renderEvalStats(courseStats)}
              </Box>
            ))}
        </CardContent>
      </Card>
    );
  }

  if (selected.type === "course") {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {selected.courseName} ({selected.id})
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Recent Terms: {selected.recentTerms.join(", ")}
          </Typography>

          <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
            Course Overall Statistics:
          </Typography>
          {renderEvalStats(selected)}

          <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
            Professor-Specific Course Statistics:
          </Typography>
          {selected.professors.map((profName) => {
            const profEntry = Object.entries(data).find(
              ([key, value]) => value.type === "prof" && key === profName,
            );

            if (!profEntry) return null;

            const [profId, profData] = profEntry;
            const profCourseStats = profData[selected.id];

            return (
              <Box key={profName} sx={{ mt: 2 }}>
                <Typography variant="body1" gutterBottom>
                  {profName}
                </Typography>
                {profCourseStats ? (
                  renderEvalStats(profCourseStats)
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No specific course statistics available for this professor
                  </Typography>
                )}
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
