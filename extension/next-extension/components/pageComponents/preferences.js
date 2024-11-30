import { useState, useEffect, useRef, startTransition } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import AuthWrapper from "./authWrapper";
import RangeSliderTime from "../prefComponents/RangeSliderTime";
import PercentSlider from "../prefComponents/PercentSlider";

export default function Preferences() {
  const [courseTracking, setCourseTracking] = useState(true);
  const [timePreference, setTimePreference] = useState([6, 20]);
  const [percentagePreference, setPercentagePreference] = useState([50]); // Initial value
  const [errorMessage, setErrorMessage] = useState(null);
  const debounceTimerRef = useRef(null);
  const shouldSendUpdate = useRef(false);

  useEffect(() => {
    checkUserPreferences();

    // Listen for changes in storage
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === "local" && changes.userInfo?.preferences) {
        checkUserPreferences();
      }
    });
  }, []);

  useEffect(() => {
    if (!shouldSendUpdate.current) {
      return;
    }
    submitPreferences();
  }, [courseTracking, timePreference, percentagePreference]);

  const checkUserPreferences = async () => {
    try {
      const userInfo = await chrome.storage.local.get("userInfo");
      if (userInfo.userInfo?.preferences) {
        const prefs = userInfo.userInfo.preferences;
        shouldSendUpdate.current = false;

        // Update state with stored preferences
        const savedTimePreference = prefs.preferredSectionTimeRange
          ? [
              prefs.preferredSectionTimeRange.startHour,
              prefs.preferredSectionTimeRange.endHour,
            ]
          : [6, 20];

        setCourseTracking(prefs.courseTracking ?? true);
        setTimePreference(savedTimePreference);
        setPercentagePreference([prefs.scoreWeighting?.scuEvals ?? 50]); // Ensure default is set here
      }
    } catch (error) {
      console.error("Error checking user preferences:", error);
    }
  };

  const handleSwitchChange = (event) => {
    setCourseTracking(event.target.checked);
    shouldSendUpdate.current = true;
  };

  const handleTimePreferenceChange = (newValue) => {
    setTimePreference(newValue);
    shouldSendUpdate.current = true;
  };

  const handlePercentagePreferenceChange = (newValue) => {
    setPercentagePreference(newValue);
    shouldSendUpdate.current = true;
  };

  const submitPreferences = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const message = {
        type: "updateUser",
        updateItems: {
          preferences: {
            courseTracking,
            preferredSectionTimeRange: {
              startHour: timePreference[0],
              startMinute: 0,
              endHour: timePreference[1],
              endMinute: 0,
            },
            scoreWeighting: {
              scuEvals: percentagePreference[0],
              rmp: 100 - percentagePreference[0],
            },
          },
        },
      };
      console.log("Sending message:", message);

      chrome.runtime.sendMessage(message).then((errorMessage) => {
        if (errorMessage) setErrorMessage(errorMessage);
        else setErrorMessage(null);
      });
    }, 300);
  };

  return (
    <AuthWrapper>
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

          <RangeSliderTime
            initialValue={timePreference}
            onChangeCommitted={handleTimePreferenceChange}
          />

          <Box sx={{ justifyContent: "center" }}>
            <Typography sx={{ pt: 5 }}>
              How would you like RateMyProfessor and SCU Course Evaluation
              ratings to be weighed:
            </Typography>
          </Box>

          {/* Pass percentagePreference as the value prop to PercentSlider */}
          <PercentSlider
            value={percentagePreference} // Pass percentagePreference state here
            onChangeCommitted={handlePercentagePreferenceChange}
          />

          <FormControlLabel
            control={
              <Switch checked={courseTracking} onChange={handleSwitchChange} />
            }
            label="Automatically keep track of my courses"
          />

          {errorMessage && (
            <Typography sx={{ color: "error.main", ml: 2 }}>
              {errorMessage}
            </Typography>
          )}
        </Box>
      </Box>
    </AuthWrapper>
  );
}
