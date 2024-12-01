import { useState, useEffect, useRef } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import AuthWrapper from "./authWrapper";
import RangeSliderTime from "../prefComponents/RangeSliderTime";
import PercentSlider from "../prefComponents/PercentSlider";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Button from "@mui/material/Button";
import InfoIcon from "@mui/icons-material/Info";
import IconButton from "@mui/material/IconButton";

export default function Preferences() {
  const [courseTracking, setCourseTracking] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [timePreference, setTimePreference] = useState({
    startHour: 8,
    startMinute: 0,
    endHour: 20,
    endMinute: 0,
  });
  const [scuEvalsPercentage, setScuEvalsPercentage] = useState(50);
  const [errorMessage, setErrorMessage] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogContent, setDialogContent] = useState("");
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
        setScuEvalsPercentage([prefs.scoreWeighting?.scuEvals ?? 50]);
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
      <Box sx={{ overflow: "auto", maxWidth: 600, margin: "auto", padding: 2, ml: 2 }}>
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h6">Course Preferences</Typography>
            <IconButton onClick={handleDialogOpen} aria-label="info">
              <InfoIcon />
            </IconButton>
          </Box>
          <Typography>Preferred Course Times:</Typography>

          <RangeSliderTime
            initValue={timePreference}
            onChangeCommitted={handleTimePreferenceChange}
          />

          <Typography>How would you like RateMyProfessor and SCU Course Evaluation ratings to be weighed:</Typography>

          <PercentSlider
            initValue={scuEvalsPercentage}
            onChangeCommitted={handlePercentagePreferenceChange}
          />

          <FormControlLabel
            control={
              <Switch
                checked={courseTracking}
                onChange={handleSwitchChange}
                sx={{
                  "& .MuiSwitch-switchBase.Mui-checked": {
                    color: "#703331",
                  },
                  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                    backgroundColor: "#703331",
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
          />

          {errorMessage && (
            <Typography sx={{ color: "error.main", ml: 2 }}>{errorMessage}</Typography>
          )}
        </Box>

        <Dialog open={dialogOpen} onClose={handleDialogClose}>
        <DialogTitle>More Information</DialogTitle>
        <DialogContent dividers>
          <Typography variant="subtitle1" gutterBottom>
            Preferred Course Times:
          </Typography>
          <Typography variant="body2" paragraph>
            Use the slider to select your preferred time range for classes. Courses outside your time range will be marked in Workday.
          </Typography>

          <Typography variant="subtitle1" gutterBottom>
            RateMyProfessor vs SCU Course Evaluations:
          </Typography>
          <Typography variant="body2" paragraph>
            Adjust the slider to weigh how much each rating source influences your preference. Courses will be color coded according to the course statistics adjusted
            with your weight
          </Typography>

          <Typography variant="subtitle1" gutterBottom>
            Automatic Course Tracking:
          </Typography>
          <Typography variant="body2">
            Enable this to allow others to see what courses you are taking
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Close</Button>
        </DialogActions>
      </Dialog>
      </Box>
    </AuthWrapper>
  );
}

