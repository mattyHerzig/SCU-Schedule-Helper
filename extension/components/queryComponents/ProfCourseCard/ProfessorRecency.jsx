import { Typography } from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import WarningIcon from "@mui/icons-material/Warning";
import { getRecencyIndicator } from "./utils";

export default function ProfessorRecency({ lastTaughtQuarter }) {
  const recency = getRecencyIndicator(lastTaughtQuarter);

  return (
    <Typography
      variant="body2"
      color="text.secondary"
      width={"150px"}
      sx={{ margin: "0px 0px 0x", display: "flex", alignItems: "center" }}
    >
      {recency.icon === "check" ? (
        <CheckIcon
          fontSize="small"
          sx={{
            marginRight: "2px",
            color: "black",
            marginBottom: "0px",
            fontSize: "15px",
          }}
          color="success"
        />
      ) : (
        <WarningIcon
          fontSize="small"
          sx={{
            marginRight: "2px",
            color: "black",
            marginBottom: "0px",
            fontSize: "15px",
          }}
          color="warning"
        />
      )}
      <Typography variant="body2" fontSize="0.8rem">
        {recency.label}
      </Typography>
    </Typography>
  );
}