import * as React from "react";
import Box from "@mui/material/Box";
import Slider from "@mui/material/Slider";
import Typography from "@mui/material/Typography";

const marks = [
  {
    value: 1,
    label: "1",
  },
  {
    value: 2,
    label: "2",
  },
  {
    value: 3,
    label: "3",
  },
  {
    value: 4,
    label: "4",
  },
  {
    value: 5,
    label: "5",
  },
];

function valuetext(value) {
  return `${value}`;
}

export default function RangeSlider() {
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
    <Box sx={{ width: 300 }}>
      <Slider
        value={value} // Current slider value
        onChange={handleChange} // Function to handle changes
        valueLabelDisplay="auto" // Show value label on hover
        getAriaValueText={valuetext} // Custom value text for accessibility
        step={1}
        min={1} // Minimum value
        max={5} // Maximum value
        marks={marks}
      />
      <Box sx={{ mt: 2 }}>
        <Typography>Minimum Value: {minValue}</Typography>
        <Typography>Maximum Value: {maxValue}</Typography>
      </Box>
    </Box>
  );
}
