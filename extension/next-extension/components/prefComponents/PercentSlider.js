import * as React from "react";
import Box from "@mui/material/Box";
import Slider from "@mui/material/Slider";
import Typography from "@mui/material/Typography";
import { createTheme, ThemeProvider } from "@mui/material/styles";

function valuetext(value) {
  return `${value}`;
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

export default function PercentSlider({ value, onChangeCommitted }) {
  const [sliderValue, setSliderValue] = React.useState(value);

  React.useEffect(() => {
    const loadPreferences = async () => {
      try {
        const { userInfo } = await chrome.storage.local.get("userInfo");
        if (userInfo?.preferences?.percentagePreference) {
          const savedValue = userInfo.preferences.percentagePreference;
          setSliderValue(savedValue);
        }
      } catch (error) {
        console.error("Error loading percentage preferences:", error);
      }
    };

    loadPreferences();
  }, []);

  React.useEffect(() => {
    const savePreferences = async () => {
      try {
        await chrome.storage.local.set({
          userInfo: {
            preferences: {
              ...userInfo?.preferences,
              percentagePreference: sliderValue,
            },
          },
        });
      } catch (error) {
        console.error("Error saving percentage preferences:", error);
      }
    };

    savePreferences();
  }, [sliderValue]);

  React.useEffect(() => {
    setSliderValue(value);
  }, [value]);

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
      <Box sx={{ width: 300, mt: 5 }}>
        <Slider
          value={sliderValue}
          onChange={handleChange}
          onChangeCommitted={handleChangeCommitted}
          getAriaValueText={valuetext}
          step={1}
          marks
          min={0}
          max={100}
          valueLabelDisplay="auto"
        />
        <Box sx={{ mt: 2, justifyContent: "center", alignItems: "center" }}>
          <Typography
            align="center"
            gutterBottom
            sx={{ fontSize: ".75rem", whiteSpace: "nowrap" }}
          >
            SCU Course Evaluations: {sliderValue}% | RateMyProfessor: {100 - sliderValue}%
          </Typography>
        </Box>
      </Box>
    </ThemeProvider>
  );
}