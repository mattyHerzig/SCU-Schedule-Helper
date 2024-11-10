import * as React from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import { Typography } from '@mui/material';

export default function Main({ navigateToPage }) {
  return (
    <Box sx= {{width: 450, height: 600, overflow: 'auto'}}>
      <Box sx = {{ mb: 3, flexDirection: 'column', display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
        <Typography sx = {{mb: 3}}>Search Professors and Course Information: </Typography>
        <TextField id="outlined-basic" label="Enter Professor or Course Here" variant="outlined" sx={{ width: '350px' }} />
      </Box>
    </Box>
    
    
  );
}