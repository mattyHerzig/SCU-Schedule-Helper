import Box from "@mui/material/Box";
import Slider from "@mui/material/Slider";
import Typography from "@mui/material/Typography";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { useState } from "react";

const generateMarks = (startHour, endHour) => {
  const marks = [];
  // Generate marks for every 15 minutes
  for (let i = 0; i <= (endHour - startHour) * 4; i++) {
    if (i % 8 !== 0) {
      marks.push({ value: i, label: "" }); // Don't overcrowd the slider.
      continue;
    }
    const hour = Math.floor(i / 4) + startHour;
    const minute = (i % 4) * 15;
    const amPmLabel = hour >= 12 ? "pm" : "am";
    const hourLabel = hour > 12 ? hour - 12 : hour;
    marks.push({
      value: i,
      label: `${hourLabel}:${minute.toString().padStart(2, "0")}${amPmLabel}`,
    });
  }
  return marks;
};

function getValueText(value) {
  const hour = Math.floor(value / 4) + 6;
  const minute = (value % 4) * 15;
  const amPmLabel = hour >= 12 ? "pm" : "am";
  const hourLabel = hour > 12 ? hour - 12 : hour;
  return `${hourLabel}:${minute.toString().padStart(2, "0")}${amPmLabel}`;
}

function getSectionTimeRange(value) {
  const startHour = Math.floor(value[0] / 4) + 6;
  const startMinute = (value[0] % 4) * 15;
  const endHour = Math.floor(value[1] / 4) + 6;
  const endMinute = (value[1] % 4) * 15;
  return { startHour, startMinute, endHour, endMinute };
}

function getValuesFromTimeRange(timeRange) {
  const startValue = (timeRange.startHour - 6) * 4 + timeRange.startMinute / 15;
  const endValue = (timeRange.endHour - 6) * 4 + timeRange.endMinute / 15;
  return [startValue, endValue];
}

const theme = createTheme({
  components: {
    MuiSlider: {
      styleOverrides: {
        root: {
          color: "#802a25", // Updated to #802a25
        },
        thumb: {
          backgroundColor: "#802a25", // Updated to #802a25
          "&:hover, &.Mui-active": {
            boxShadow: "0 0 0 8px rgba(128, 42, 37, 0.16)", // Slightly lighter for hover effect
          },
        },
        track: {
          backgroundColor: "#802a25", // Updated to #802a25
        },
        rail: {
          backgroundColor: "#802a25", // Updated to #802a25
          opacity: 0.3,
        },
      },
    },
  },
});

export default function RangeSliderTime({ initValue, onChangeCommitted }) {
  const minHour = 6;
  const maxHour = 22;
  const [value, setValue] = useState(getValuesFromTimeRange(initValue));

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const handleChangeCommitted = (event, newValue) => {
    if (onChangeCommitted) {
      onChangeCommitted(getSectionTimeRange(newValue));
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ width: 300}}>
        <Slider
          value={value}
          onChange={handleChange}
          onChangeCommitted={handleChangeCommitted}
          valueLabelDisplay="auto"
          valueLabelFormat={getValueText}
          getAriaValueText={getValueText}
          step={1}
          min={0}
          max={(maxHour - minHour) * 4}
          marks={generateMarks(minHour, maxHour).map((mark) => ({
            ...mark,
            label: <span style={{ fontSize: "0.55rem" }}>{mark.label}</span>,
          }))}
        />
      </Box>
    </ThemeProvider>
  );
}

