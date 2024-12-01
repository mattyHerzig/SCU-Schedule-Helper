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
  const [isLoading, setIsLoading] = useState(true);
  const [timePreference, setTimePreference] = useState({
    startHour: 8,
    startMinute: 0,
    endHour: 20,
    endMinute: 0,
  });
  const [scuEvalsPercentage, setScuEvalsPercentage] = useState(50); // Initial value
  const [errorMessage, setErrorMessage] = useState(null);
  const debounceTimerRef = useRef(null);
  const shouldSendUpdate = useRef(false);

  useEffect(() => {
    checkUserPreferences();

    // Listen for changes in storage
    const storageListener = (changes, namespace) => {
      if (namespace === "local" && changes.userInfo) {
        checkUserPreferences();
      }
    };
    chrome.storage.onChanged.addListener(storageListener);

    return () => {
      chrome.storage.onChanged.removeListener(storageListener);
    };
  }, []);

  useEffect(() => {
    if (!shouldSendUpdate.current) {
      return;
    }
    submitPreferences();
  }, [courseTracking, timePreference, scuEvalsPercentage]);

  const checkUserPreferences = async () => {
    setIsLoading(true);
    try {
      const userInfo = await chrome.storage.local.get("userInfo");
      if (userInfo.userInfo?.preferences) {
        const prefs = userInfo.userInfo.preferences;
        shouldSendUpdate.current = false;

        // Update state with stored preferences
        setCourseTracking(prefs.courseTracking ?? true);
        setTimePreference(prefs.preferredSectionTimeRange ?? timePreference);
        setScuEvalsPercentage([prefs.scoreWeighting?.scuEvals ?? 50]); // Ensure default is set here
      }
    } catch (error) {
      console.error("Error checking user preferences:", error);
    }
    setIsLoading(false);
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
    setScuEvalsPercentage(newValue);
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
              ...timePreference,
            },
            scoreWeighting: {
              scuEvals: scuEvalsPercentage[0],
              rmp: 100 - scuEvalsPercentage[0],
            },
          },
        },
        allowLocalOnly: true,
      };
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
            initValue={timePreference}
            onChangeCommitted={handleTimePreferenceChange}
          />
          <Box sx={{ justifyContent: "center" }}>
            <Typography sx={{ pt: 5 }}>
              How would you like RateMyProfessor and SCU Course Evaluation
              ratings to be weighed:
            </Typography>
          </Box>
          <PercentSlider
            initValue={scuEvalsPercentage} // Pass percentagePreference state here
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
