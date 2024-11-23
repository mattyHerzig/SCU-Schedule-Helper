import React, { useState, useMemo } from 'react';
import { Autocomplete, TextField, Box } from '@mui/material';
import ProfCourseCard from './ProfCourseCard';

// Updated dummy data
const dummyStorageData = {
  data: {
    "FNCE131": {
      qualityTotal: 18.77777777777778,
      qualityCount: 4,
      difficultyTotal: 14.4,
      difficultyCount: 4,
      workloadTotal: 48, 
      workloadCount: 4,
      qualityAvg: 4.694444444444445,
      difficultyAvg: 3.6,
      workloadAvg: 6.5, 
      recentTerms: ["Winter 2024"],
      courseName: "Real Estate Law",
      professors: {
        "David Brown": {
          qualityAvg: 4.8,
          difficultyAvg: 3.2,
          workloadAvg: 7.0,
          recentTerms: ["Winter 2024"]
        }
      },
      type: "course"
    },
    "FNCE201": {
      qualityTotal: 16.5,
      qualityCount: 3,
      difficultyTotal: 12.0,
      difficultyCount: 3,
      workloadTotal: 36,
      workloadCount: 3,
      qualityAvg: 5.5,
      difficultyAvg: 4.0,
      workloadAvg: 8.0, 
      recentTerms: ["Winter 2024"],
      courseName: "Financial Management",
      professors: {
        "David Smith": {
          qualityAvg: 4.7,
          difficultyAvg: 3.5,
          workloadAvg: 8.5,
          recentTerms: ["Winter 2024"]
        },
        "Sarah Johnson": {
          qualityAvg: 4.9,
          difficultyAvg: 3.8,
          workloadAvg: 7.5,
          recentTerms: ["Winter 2024"]
        }
      },
      type: "course"
    },
    "David Smith": {
      type: "prof",
      overall: {
        qualityAvg: 4.666666666666667,
        difficultyAvg: 3.5,
        workloadAvg: 8.0 // Hours per week
      },
      courses: {
        "FNCE201": {
          qualityAvg: 4.7,
          difficultyAvg: 3.5,
          workloadAvg: 8.5, // Hours per week
          courseName: "Financial Management",
          recentTerms: ["Winter 2024"]
        }
      }
    }
  },
  dataExpirationDate: "2024-03-01T00:00:00Z"
};

const ProfCourseSearch = () => {
  const [selected, setSelected] = useState(null);

  // Process data for search options
  const searchOptions = useMemo(() => {
    const options = [];

    // Add courses
    Object.entries(dummyStorageData.data).forEach(([key, value]) => {
      if (value.type === 'course') {
        options.push({
          id: key,
          label: `${key} - ${value.courseName}`,
          groupLabel: 'Courses',
          type: 'course',
          ...value
        });
      }
    });

    // Add professors
    Object.entries(dummyStorageData.data).forEach(([key, value]) => {
      if (value.type === 'prof') {
        options.push({
          id: key,
          label: key,
          groupLabel: 'Professors',
          type: 'prof',
          ...value
        });
      }
    });

    return options;
  }, []);

  return (
    <Box sx={{ width: '100%' }}>
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
            />
          )}
        />
      </Box>

      <ProfCourseCard
        selected={selected}
        data={dummyStorageData.data}
      />
    </Box>
  );
};

export default ProfCourseSearch;