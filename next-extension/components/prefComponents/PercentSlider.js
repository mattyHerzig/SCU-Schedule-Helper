import { useState } from "react";
import { Box, Slider, createTheme, ThemeProvider } from "@mui/material";

function getValueText(value) {
  return `${100 - value}% RMP | ${value}% SCU Evals`;
}

const theme = createTheme({
  components: {
    MuiSlider: {
      styleOverrides: {
        root: {
          color: "#872f2a", // Updated to #872f2a
        },
        thumb: {
          backgroundColor: "#872f2a", // Updated to #872f2a
          "&:hover, &.Mui-active": {
            boxShadow: "0 0 0 8px rgba(135, 47, 42, 0.16)", // Updated shadow with new color
          },
        },
        track: {
          backgroundColor: "#872f2a", // Updated to #872f2a
        },
        rail: {
          backgroundColor: "#872f2a", // Updated to #872f2a
          opacity: 0.3,
        },
      },
    },
  },
});

export default function PercentSlider({ initValue, onChangeCommitted }) {
  const [sliderValue, setSliderValue] = useState(initValue);

  const handleChange = (event, newValue) => {
    setSliderValue(newValue);
  };

  const handleChangeCommitted = (event, newValue) => {
    if (onChangeCommitted) {
      onChangeCommitted(newValue);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ width: 300, mt: 3 }}>
        <Slider
          value={sliderValue}
          onChange={handleChange}
          onChangeCommitted={handleChangeCommitted}
          getAriaValueText={getValueText}
          valueLabelFormat={getValueText}
          step={1}
          marks={[
            { value: 0, label: "Only RMP" },
            { value: 50, label: "Use both equally" },
            { value: 100, label: "Only SCU evals" },
          ]}
          min={0}
          max={100}
          valueLabelDisplay="auto"
        />
      </Box>
    </ThemeProvider>
  );
}
