import * as React from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import { Typography } from '@mui/material';

export default function Main({ navigateToPage }) {
  return (
    <Box sx = {{ mb: 3, flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}}>
      <Typography>Search Professors and Courses: </Typography>
      <TextField id="outlined-basic" label="Enter Professor or Course Here" variant="outlined" sx={{ width: '350px' }} />
    </Box>
    
  );
}