import { Box, Typography } from "@mui/material";
import StatBoxWithLessFormatting from "./StatBoxWithLessFormatting";

export default function StatsWithLessFormatting({ stats, deptStats, preferredPercentiles }) {
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
        alignContent: "right",
      }}
    >
      <StatBoxWithLessFormatting
        label="Quality"
        value={stats.qualityTotal / stats.qualityCount}
        preferredPercentiles={preferredPercentiles}
        deptStats={deptStats.qualityAvgs}
        isRmpRating={false}
      />
      <StatBoxWithLessFormatting
        label="Difficulty"
        value={stats.difficultyTotal / stats.difficultyCount}
        preferredPercentiles={preferredPercentiles}
        deptStats={deptStats.difficultyAvgs}
        isRmpRating={false}
      />
      <StatBoxWithLessFormatting
        label="Workload"
        value={stats.workloadTotal / stats.workloadCount}
        preferredPercentiles={preferredPercentiles}
        deptStats={deptStats.workloadAvgs}
        isRmpRating={false}
      />
    </Box>
  );
}
