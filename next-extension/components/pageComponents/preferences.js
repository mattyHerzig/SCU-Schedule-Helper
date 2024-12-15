import { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  FormControlLabel,
  Switch,
  IconButton,
  Stack
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import AuthWrapper from "./authWrapper";
import RangeSliderTime from "../prefComponents/RangeSliderTime";
import PercentSlider from "../prefComponents/PercentSlider";
import PreferencesDialog from "../prefComponents/PreferencesDialog";

export default function Preferences() {
  const [courseTracking, setCourseTracking] = useState(true);
  const [timePreference, setTimePreference] = useState({
    startHour: 8,
    startMinute: 0,
    endHour: 20,
    endMinute: 0,
  });
  const [scuEvalsPercentage, setScuEvalsPercentage] = useState([50]);
  const [errorMessage, setErrorMessage] = useState(null);
  const debounceTimerRef = useRef(null);
  const shouldSendUpdate = useRef(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleDialogOpen = () => {
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  useEffect(() => {
    checkUserPreferences();

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
    try {
      const userInfo = await chrome.storage.local.get("userInfo");
      if (userInfo.userInfo?.preferences) {
        const prefs = userInfo.userInfo.preferences;
        shouldSendUpdate.current = false;

        if (prefs.courseTracking != courseTracking)
          setCourseTracking(prefs.courseTracking);
        if (prefs.preferredSectionTimeRange != timePreference)
          setTimePreference(prefs.preferredSectionTimeRange);
        if (prefs.scoreWeighting.scuEvals != scuEvalsPercentage[0]) {
          setScuEvalsPercentage([prefs.scoreWeighting.scuEvals]);
        }
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
      <Box sx={{ padding: 2}}>
        <Stack direction="row" alignItems="center">
          <Typography variant="h6" sx={{ textAlign: 'center' }}>
            Course Preferences
          </Typography>
          <IconButton
            onClick={handleDialogOpen}
            aria-label="info"
          >
            <InfoIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Box>

      <Box
        sx={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',  
          justifyContent: 'center', 
          gap: 2,
          padding: 0, 
        }}
      >
        <Typography textAlign="center">What are your preferred course times?</Typography>

        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          <RangeSliderTime
            initValue={timePreference}
            onChangeCommitted={handleTimePreferenceChange}
            sx={{ width: '90%' }}
          />
        </Box>

        <Box 
          sx={{ 
            width: '100%', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            textAlign: 'center', 
            gap: 2 
          }}
        >
          <Typography>
            How would you like SCU Course Evaluations and RateMyProfessor data to be weighed in the Workday course section scores?
          </Typography>

          <PercentSlider
            initValue={scuEvalsPercentage}
            onChangeCommitted={handlePercentagePreferenceChange}
            sx={{ width: '90%' }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={courseTracking}
                onChange={handleSwitchChange}
                sx={{
                  "& .MuiSwitch-switchBase.Mui-checked": {
                    color: "#802a25",
                  },
                  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                    backgroundColor: "#802a25",
                  },
                  "& .MuiSwitch-switchBase": {
                    color: "#703331",
                  },
                  "& .MuiSwitch-track": {
                    backgroundColor: "#ccc",
                  },
                }}
              />
            }
            label="Automatically keep track of my courses"
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
            }}
          />

          {errorMessage && (
            <Typography sx={{ color: "error.main", textAlign: 'center' }}>
              {errorMessage}
            </Typography>
          )}
        </Box>
      </Box>

      <PreferencesDialog 
        open={dialogOpen} 
        onClose={handleDialogClose} 
      />
    </AuthWrapper>
  );
}
