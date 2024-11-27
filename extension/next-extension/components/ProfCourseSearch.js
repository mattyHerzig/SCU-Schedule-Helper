import React, { useState, useMemo, useEffect } from 'react';
import { Autocomplete, TextField, Box, Typography, Button } from '@mui/material';
import ProfCourseCard from './ProfCourseCard';

const ProfCourseSearch = () => {
  const [selected, setSelected] = useState(null);
  const [storageData, setStorageData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEvals = () => {
      console.log('Starting fetchEvals function');
      setIsLoading(true);
      setError(null);

      chrome.storage.local.get(null, (allLocalStorage) => {
        console.log('Local Storage Contents:', allLocalStorage);
      });

      const storageKeys = ['evals', 'courseEvals', 'course_evals'];

      const checkStorageKeys = () => {
        storageKeys.forEach((key) => {
          chrome.storage.local.get([key], (result) => {
            console.log(`Checking storage key: ${key}`, result);

            if (result && result[key]) {
              console.log(`Data found for key: ${key}`, result[key]);
              const data = result[key];
              if (typeof data === 'object' && data !== null) {
                setStorageData({
                  data: data,
                  dataExpirationDate: new Date().toISOString()
                });
                setIsLoading(false);
              } else {
                console.error(`Invalid data type for key: ${key}`, typeof data);
                setError(`Invalid data retrieved for ${key}`);
              }
            } else {
              console.log(`No data found for key: ${key}`);
            }
          });
        });

        //Trigger download if no data found
        chrome.runtime.sendMessage('downloadEvalsIfNeeded', (response) => {
          console.log('Download if needed response:', response);
        });
      };

      checkStorageKeys();
    };

    //Initial fetch
    fetchEvals();
  }, []);

  const searchOptions = useMemo(() => {
    console.log('Processing search options. Storage data:', storageData);

    if (!storageData?.data) {
      console.log('No storage data to process');
      return [];
    }

    const options = [];

    try {
      const dataToProcess = storageData.data;
      if (typeof dataToProcess !== 'object' || dataToProcess === null) {
        console.error('Stored data is not a valid object', dataToProcess);
        return [];
      }

      //Add courses
      Object.entries(dataToProcess).forEach(([key, value]) => {
        console.log(`Processing key: ${key}`, value);
        if (value && value.type === 'course') {
          options.push({
            id: key,
            label: `${key} - ${value.courseName || 'Unnamed Course'}`,
            groupLabel: 'Courses',
            type: 'course',
            ...value
          });
        }
      });

      //Add professors
      Object.entries(dataToProcess).forEach(([key, value]) => {
        if (value && value.type === 'prof') {
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
      return [];
    }

    return options;
  }, [storageData]);

  //Loading state
  if (isLoading) {
    return (
      <Box sx={{ width: '100%', textAlign: 'center', mt: 4 }}>
        <Typography variant="h6">Loading course evaluations...</Typography>
      </Box>
    );
  }

  if (!storageData || !storageData.data || Object.keys(storageData.data).length === 0) {
    return (
      <Box sx={{ width: '100%', textAlign: 'center', mt: 4 }}>
        <Typography variant="h6" color="text.secondary">
          No course evaluation data available
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => {
            // Trigger download
            chrome.runtime.sendMessage('downloadEvalsIfNeeded');
          }}
          sx={{ mt: 2 }}
        >
          Download Evaluations
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

      <ProfCourseCard
        selected={selected}
        data={storageData.data}
      />
    </Box>
  );
};

export default ProfCourseSearch;