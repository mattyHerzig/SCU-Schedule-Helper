import { useState, useMemo, useEffect } from "react";
import {
  Alert,
  Autocomplete,
  TextField,
  Box,
  Typography,
  Button,
  Snackbar,
} from "@mui/material";
import ProfCourseCard from "./ProfCourseCard";

export default function ProfCourseSearch() {
  const [selected, setSelected] = useState(null);
  const [evalsData, setEvalsData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showActionCompletedMessage, setShowActionCompletedMessage] =
    useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    checkEvals();

    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (
        namespace === "local" &&
        (changes.evals || changes.isDownloadingEvals)
      ) {
        if (
          changes.isDownloadingEvals &&
          changes.isDownloadingEvals.newValue === true
        )
          setIsLoading(true);
        else checkEvals();
      }
    });
  }, []);

  const checkEvals = async () => {
    try {
      setIsLoading(true);
      const data = await chrome.storage.local.get([
        "evals",
        "isDownloadingEvals",
      ]);
      if (data.evals) {
        setEvalsData(data.evals);
      }
      setIsLoading(data.isDownloadingEvals || false);
    } catch (ignore) {
      setIsLoading(false);
    }
  };

  const retryDownload = async () => {
    try {
      const errorMessage = await chrome.runtime.sendMessage("downloadEvals");
      if (errorMessage) onError(errorMessage);
    } catch (error) {
      console.error("Error retrying download:", error);
      onError("An unknown error occurred while retrying download.");
    }
  };

  const onError = (message) => {
    setError(message);
    setShowActionCompletedMessage(true);
  };

  const searchOptions = useMemo(() => {
    if (!evalsData || searchQuery.length < 1) return [];
    const options = [];
    try {
      if (evalsData === null) {
        console.error("Stored data is not a valid object", evalsData);
        return [];
      }

      Object.entries(evalsData).forEach(([key, value]) => {
        if (value?.type === "course") {
          options.push({
            id: key,
            label: `${key} - ${value.courseName || "Unnamed Course"}`,
            groupLabel: "Courses",
            type: "course",
            ...value,
          });
        } else if (value?.type === "prof") {
          options.push({
            id: key,
            label: key,
            groupLabel: "Professors",
            type: "prof",
            ...value,
          });
        }
      });
    } catch (err) {
      console.error("Error processing search options:", err);
    }

    return options.filter((option) =>
      option.label.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [evalsData, searchQuery]);

  if (isLoading) {
    return (
      <Box sx={{ width: "100%", textAlign: "center", mt: 4 }}>
        <Typography variant="h6">Loading course evaluations...</Typography>
      </Box>
    );
  }

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  if (!evalsData || Object.keys(evalsData).length === 0) {
    return (
      <Box sx={{ width: "100%", textAlign: "center", mt: 4 }}>
        <Typography variant="h6" color="text.secondary">
          No course evaluation data available
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={retryDownload}
          sx={{ mt: 2 }}
        >
          Retry Data Download
        </Button>
        <Snackbar
          open={showActionCompletedMessage}
          autoHideDuration={3000}
          onClose={() => setShowActionCompletedMessage(false)}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={() => setShowActionCompletedMessage(false)}
            severity={"error"}
            sx={{ width: "100%" }}
          >
            {error}
          </Alert>
        </Snackbar>
      </Box>
    );
  }
  return (
    <Box sx={{ width: "100%" }}>
      <Box sx={{ mb: 2 }}>
        <Autocomplete
          options={searchOptions}
          groupBy={(option) => option.groupLabel}
          getOptionLabel={(option) => option.label}
          value={selected}
          onChange={(event, newValue) => {
            setSelected(newValue);
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Search Courses and Professors"
              variant="outlined"
              size="small"
              sx={{
                "& .MuiOutlinedInput-root": {
                  "& fieldset": {
                    borderColor: "#ccc",
                  },
                  "&:hover fieldset": {
                    borderColor: "#ccc",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#703331",
                  },
                },
                "& .MuiInputLabel-root": {
                  color: "#ccc",
                },
                "& .MuiInputLabel-outlined-root": {
                  "&.Mui-focused": {
                    color: "#703331",
                  },
                },
                "& .Mui-focused.MuiInputLabel-root": {
                  color: "#703331",
                },
              }}
              onChange={handleSearchChange}
            />
          )}
        />
      </Box>

      <ProfCourseCard selected={selected} data={evalsData} />
    </Box>
  );
}
