import * as React from 'react';
import Box from '@mui/material/Box';
import Slider from '@mui/material/Slider';
import Typography from '@mui/material/Typography';

function valuetext(value) {
  return `${value}`;
}

export default function PercentSlider() {
  const [value, setValue] = React.useState([50]);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };
  return (
    <Box sx={{ width: 300, mt: 5}}>
      <Slider
        value={value} 
        onChange={handleChange} 
        defaultValue={50}
        getAriaValueText={valuetext}
        step={1}
        marks
        min={1}
        max={100}
        valueLabelDisplay="auto"
      />
      <Box sx={{ mt: 2 }}>
        <Typography align="center" gutterBottom>
          SCU Course Evaluations: {value}% | RateMyProfessor: {100 - value}%
        </Typography>
      </Box>
    </Box>
  
  );
}