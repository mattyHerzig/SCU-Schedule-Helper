import * as React from "react";
import Box from "@mui/material/Box";
import Slider from "@mui/material/Slider";
import Typography from "@mui/material/Typography";
import { createTheme, ThemeProvider } from "@mui/material/styles";

const marks = [
  { value: 8, label: "8:00" },
  { value: 9, label: "9:00" },
  { value: 10, label: "10:00" },
  { value: 11, label: "11:00" },
  { value: 12, label: "12:00" },
  { value: 13, label: "13:00" },
  { value: 14, label: "14:00" },
  { value: 15, label: "15:00" },
  { value: 16, label: "16:00" },
  { value: 17, label: "17:00" },
  { value: 18, label: "18:00" },
  { value: 19, label: "19:00" },
  { value: 20, label: "20:00" },
];

function valuetext(value) {
  return `${value}:00`;
}

const theme = createTheme({
  components: {
    MuiSlider: {
      styleOverrides: {
        root: {
          color: "#703331", 
        },
        thumb: {
          backgroundColor: "#703331", 
          "&:hover, &.Mui-active": {
            boxShadow: "0 0 0 8px rgba(112, 51, 49, 0.16)", 
          },
        },
        track: {
          backgroundColor: "#703331", 
        },
        rail: {
          backgroundColor: "#703331", 
          opacity: 0.3,
        },
      },
    },
  },
});

export default function RangeSliderTime({ onChangeCommitted }) {

  const [value, setValue] = React.useState([8, 18]);


  React.useEffect(() => {
    const loadPreferences = async () => {
      try {
        const { userPreferences } = await chrome.storage.sync.get("userPreferences");
        if (userPreferences && userPreferences.preferredSectionTimeRange) {
          const { startHour, endHour } = userPreferences.preferredSectionTimeRange;
          setValue([startHour, endHour]);
        }
      } catch (error) {
        console.error("Error loading preferences:", error);
      }
    };

    loadPreferences();
  }, []);


  React.useEffect(() => {
    const savePreferences = async () => {
      try {
        await chrome.storage.sync.set({
          userPreferences: {
            preferredSectionTimeRange: {
              startHour: value[0],
              startMinute: 0,
              endHour: value[1],
              endMinute: 0,
            },
          },
        });
      } catch (error) {
        console.error("Error saving preferences:", error);
      }
    };

    savePreferences();
  }, [value]);

 
  const handleChange = (event, newValue) => {
    setValue(newValue);
  };


  const handleChangeCommitted = (event, newValue) => {
    if (onChangeCommitted) {
      onChangeCommitted(newValue);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ width: 350 }}>
        <Slider
          value={value} 
          onChange={handleChange}
          onChangeCommitted={handleChangeCommitted}
          valueLabelDisplay="auto" 
          getAriaValueText={valuetext} 
          step={1}
          min={8}
          max={20}
          marks={marks.map((mark) => ({
            ...mark,
            label: <span style={{ fontSize: "0.55rem" }}>{mark.label}</span>,
          }))}
        />
        <Box sx={{ mt: 2 }}>
          <Typography>
            {value[0]}:00 - {value[1]}:00
          </Typography>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
