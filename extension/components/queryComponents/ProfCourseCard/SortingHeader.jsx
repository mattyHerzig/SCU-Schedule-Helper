import { Box, Typography } from "@mui/material";
import KeyboardArrowUp from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDown from "@mui/icons-material/KeyboardArrowDown";

export default function SortingHeader({ 
  sortingToggle, 
  handleOverallSort, 
  handleSortByQuality, 
  handleSortByDifficulty, 
  handleSortByWorkload 
}) {
  return (
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
  );
}