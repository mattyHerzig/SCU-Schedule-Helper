import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import Button from "@mui/material/Button";
import RangeSliderTime from "../RangeSliderTime";
import PercentSlider from "../PercentSlider";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";

export default function Preferences() {
  return (
    <Box sx={{ overflow: "auto" }}>
      <Box
        sx={{
          display: "flex",
          my: 1,
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Typography variant="h6" sx={{ my: 1 }}>
          Fill in your course preferences below:
        </Typography>
        <Typography sx={{ pt: 5 }}>Preferred Course Times:</Typography>
        <Typography sx={{ pt: 2 }}>Time Window</Typography>
        <RangeSliderTime></RangeSliderTime>
        <Typography sx={{ pt: 5 }}>
          How would you like RateMyProfessor and SCU Course Evaluation ratings
          to be weighed:
        </Typography>

        <PercentSlider></PercentSlider>

        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            mt: 2,
          }}
        >
          <Button variant="contained" color="primary">
            Submit Preferences
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
