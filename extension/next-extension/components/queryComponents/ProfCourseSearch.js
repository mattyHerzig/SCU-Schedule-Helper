import React, { useState, useMemo, useEffect, useRef } from "react";
import { Autocomplete, TextField, Box, Typography, Button } from "@mui/material";
import ProfCourseCard from "./ProfCourseCard";

export default function ProfCourseSearch() {
  const [selected, setSelected] = useState(null);
  const [evalsData, setEvalsData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    checkEvals();

    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === "local" && changes.evals) {
        checkEvals();
      }
    });
  }, []);

  const checkEvals = async () => {
    setIsLoading(true);
    setError(null);

    const evalsDataFromStorage = (await chrome.storage.local.get("evals")).evals;
    if (evalsDataFromStorage) {
      if (typeof evalsDataFromStorage === "object") {
        setEvalsData(evalsDataFromStorage);
      } else {
        console.error(`Invalid data type ${typeof evalsDataFromStorage} for evals`);
        setError(`You must be signed in to view course evaluations data.`);
      }
    } else {
      console.error("No evals data found");
      setError(`You must be signed in to view course evaluations data.`);
      chrome.runtime.sendMessage("downloadEvals");
    }
    setIsLoading(false);
  };

  const searchOptions = useMemo(() => {
    if (!evalsData || searchQuery.length < 1) return []; 

    const options = [];

    try {
      const dataToProcess = evalsData;
      if (typeof dataToProcess !== "object" || dataToProcess === null) {
        console.error("Stored data is not a valid object", dataToProcess);
        return [];
      }

      Object.entries(dataToProcess).forEach(([key, value]) => {
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

      console.log("Final search options:", options);
    } catch (err) {
      console.error("Error processing search options:", err);
    }

    return options.filter(option =>
      option.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [evalsData, searchQuery]);

  if (isLoading) {
    return (
      <Box sx={{ width: "100%", textAlign: "center", mt: 4 }}>
        <Typography variant="h6">Loading course evaluations...</Typography>
      </Box>
    );
  }

  if (!evalsData || Object.keys(evalsData).length === 0) {
    return (
      <Box sx={{ width: "100%", textAlign: "center", mt: 4 }}>
        <Typography variant="h6" color="text.secondary">
          No course evaluation data available
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => chrome.runtime.sendMessage("downloadEvals")}
          sx={{ mt: 2 }}
        >
          Download Evaluations
        </Button>
      </Box>
    );
  }

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

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


