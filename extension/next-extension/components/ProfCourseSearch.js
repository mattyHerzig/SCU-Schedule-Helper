import React, { useState, useMemo, useEffect } from 'react';
import { Autocomplete, TextField, Box, Typography, Button } from '@mui/material';
import ProfCourseCard from './ProfCourseCard';

/*
useEffect(() => {
  chrome.storage.local.get(['courseEvals'], (result) => {
  });
}, []);
*/

//dummy data
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
        workloadAvg: 8.0
      },
      courses: {
        "FNCE201": {
          qualityAvg: 4.7,
          difficultyAvg: 3.5,
          workloadAvg: 8.5, 
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
  const [storageData, setStorageData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

const manualEvalDownload = () => {
    console.log('Manually triggering eval download');
    chrome.runtime.sendMessage('downloadEvals', (response) => {
      console.log('Manual download response:', response);
      
      // Immediately after download, try to retrieve
      chrome.storage.local.get(null, (result) => {
        console.log('ALL LOCAL STORAGE AFTER MANUAL DOWNLOAD:', result);
      });
    });
  };

  // New manual authorization method
  const manualAuthorization = () => {
  chrome.runtime.sendMessage('authorize', (response) => {
    console.log('Authorization response:', response);
    
    if (response.authorized) {
      console.log('Authorization successful');
      alert('Authorization complete. You can now download evaluations.');
    } else {
      console.error('Authorization failed:', response.failStatus);
      alert(`Authorization failed: ${response.failStatus}`);
    }
  });
};

  useEffect(() => {
    const fetchEvals = () => {
      console.log('Starting fetchEvals function');
      setIsLoading(true);
      setError(null);

      // Log ALL local storage contents
      chrome.storage.local.get(null, (allLocalStorage) => {
        console.log('ALL LOCAL STORAGE CONTENTS:', allLocalStorage);
      });

      // Try multiple storage keys
      const storageKeys = ['evals', 'courseEvals'];

      storageKeys.forEach((key) => {
        chrome.storage.local.get([key], (result) => {
          console.log(`Checking storage key: ${key}`, result);

          if (result[key]) {
            console.log(`Data found for key: ${key}`, result[key]);
            
            // Validate data structure
            if (typeof result[key] === 'object' && Object.keys(result[key]).length > 0) {
              setStorageData({
                data: result[key],
                dataExpirationDate: new Date().toISOString()
              });
              setIsLoading(false);
            } else {
              console.log(`Invalid data for key: ${key}`);
            }
          } else {
            console.log(`No data found for key: ${key}`);
          }
        });
      });

      // Trigger download if no data found
      chrome.runtime.sendMessage('downloadEvalsIfNeeded', (response) => {
        console.log('Download if needed response:', response);
      });
    };

    // Initial fetch
    fetchEvals();
  }, []);

  // Process data for search options
  const searchOptions = useMemo(() => {
    console.log('Processing search options. Storage data:', storageData);

    if (!storageData || !storageData.data) {
      console.log('No storage data to process');
      return [];
    }

    const options = [];

    try {
      // Add courses
      Object.entries(storageData.data).forEach(([key, value]) => {
        console.log(`Processing key: ${key}`, value);
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
      Object.entries(storageData.data).forEach(([key, value]) => {
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

      console.log('Final search options:', options);
    } catch (err) {
      console.error('Error processing search options:', err);
    }

    return options;
  }, [storageData]);

 if (isLoading) {
    return (
      <Box>
        <Typography>Loading evaluations...</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={manualEvalDownload}
        >
          Manual Eval Download
        </Button>
        <Button 
          variant="contained" 
          color="secondary" 
          onClick={manualAuthorization}
        >
          Manual Authorization
        </Button>
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Typography color="error">{error}</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={manualEvalDownload}
        >
          Manual Eval Download
        </Button>
        <Button 
          variant="contained" 
          color="secondary" 
          onClick={manualAuthorization}
        >
          Manual Authorization
        </Button>
      </Box>
    );
  }

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

      {storageData && (
        <ProfCourseCard
          selected={selected}
          data={storageData.data}
        />
      )}
    </Box>
  );
};

export default ProfCourseSearch;