import { Box, Typography } from "@mui/material";
import StatBox from "./StatBox";
import { DepartmentStats, Evaluation } from "../utils/types";

interface Props {
  stats: Evaluation;
  deptStats: DepartmentStats;
  preferredPercentiles: Record<string, number>;
}

export default function EvalStats({
  stats,
  deptStats,
  preferredPercentiles,
}: Props) {
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
        preferredPercentiles={preferredPercentiles}
        deptStats={deptStats.qualityAvgs}
        isRmpRating={false}
      />
      <StatBox
        label="Difficulty"
        value={stats.difficultyTotal / stats.difficultyCount}
        preferredPercentiles={preferredPercentiles}
        deptStats={deptStats.difficultyAvgs}
        isRmpRating={false}
      />
      <StatBox
        label="Workload"
        value={stats.workloadTotal / stats.workloadCount}
        preferredPercentiles={preferredPercentiles}
        deptStats={deptStats.workloadAvgs}
        isRmpRating={false}
      />
    </Box>
  );
}
