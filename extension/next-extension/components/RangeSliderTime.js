import * as React from 'react';
import Box from '@mui/material/Box';
import Slider from '@mui/material/Slider';
import Typography from '@mui/material/Typography';

const marks = [
  {value: 8, label: '8:00'},
  {value: 9, label: '9:00'},
  {
    value: 10,
    label: '10:00',
  },
  {
    value: 11,
    label: '11:00',
  },
  {
    value: 12,
    label: '12:00',
  },
  {
    value: 13,
    label: '13:00',
  },
  {
    value: 14,
    label: '14:00',
  },
  {
    value: 15,
    label: '15:00',
  },
  {
    value: 16,
    label: '16:00',
  },
  {
    value: 17,
    label: '17:00',
  },
  {
    value: 18,
    label: '18:00',
  },
  {
    value: 19,
    label: '19:00',
  },
  {
    value: 20,
    label: '20:00',
  },
];

function valuetext(value) {
  return `${value}`;
}

export default function RangeSliderTime() {
  // State to hold the slider values
  const [value, setValue] = React.useState([20, 20]);
  const [minValue, setMinValue] = React.useState(value[0]);
  const [maxValue, setMaxValue] = React.useState(value[1]);

  // Handle change for the slider
  const handleChange = (event, newValue) => {
    setValue(newValue);
    setMinValue(newValue[0]); // Update min value
    setMaxValue(newValue[1]); // Update max value
  };

  return (
    <Box sx={{ width: 350 }}>
      <Slider
        value={value} // Current slider value
        onChange={handleChange} // Function to handle changes
        valueLabelDisplay="auto" // Show value label on hover
        getAriaValueText={valuetext} // Custom value text for accessibility
        step={1}
        min={8}
        max={20} 
        marks={marks.map((mark) => ({
          ...mark,
          label: (
            <span style={{ fontSize: '0.55rem' }}>{mark.label}</span>
          ),
        }))}/>
      <Box sx={{ mt: 2 }}>
        <Typography>{minValue}:00 - {maxValue}:00</Typography>
      </Box>
    </Box>
  );
}