import { useState, useEffect, useRef } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import RangeSliderTime from "../RangeSliderTime";
import PercentSlider from "../PercentSlider";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";

export default function Preferences() {
  const [courseTracking, setCourseTracking] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const debounceTimerRef = useRef(null);
  const shouldSendUpdate = useRef(false);

  useEffect(() => {
    checkUserPreferences();
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
  }, [courseTracking]);

  const checkUserPreferences = async () => {
    const userInfo = await chrome.storage.local.get("userInfo");
    if (userInfo.userInfo?.preferences) {
      setCourseTracking(userInfo.userInfo.preferences.courseTracking);
      // Prevent sending an update when the component first mounts or receives a remote update.
      shouldSendUpdate.current = false;
    }
  };

  const handleSwitchChange = (event) => {
    setCourseTracking(event.target.checked);
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
          },
        },
      };
      chrome.runtime.sendMessage(message).then((errorMessage) => {
        if (errorMessage) setErrorMessage(errorMessage);
        else setErrorMessage(null);
      });
    }, 300);
  };

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
        <FormControlLabel
          control={<Switch />}
          label="Automatically keep track of my courses"
          checked={courseTracking}
          onChange={handleSwitchChange}
        />
        {/* <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            mt: 2,
          }}
        >
          <Button
            variant="contained"
            color="primary"
            onClick={submitPreferences}
          >
            Submit Preferences
          </Button>
        </Box> */} // I commented this out because I think we can just auto submit the preferences whenever an update is stable for 300ms.
        {errorMessage && (
          <Typography sx={{ color: "error.main", ml: 2 }}>
            {errorMessage}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
