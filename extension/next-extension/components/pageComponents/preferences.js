
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import Button from '@mui/material/Button';
import RangeSliderTime from "../RangeSliderTime";
import PercentSlider from "../PercentSlider";
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';

export default function Preferences() {
    return (
      <Box sx = {{display: 'flex', pt: 1, pb: 1, flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}}>
        <Typography variant="h6" sx={{pt: 5}}>
            Fill in your course preferences below:
        </Typography>

        <Typography sx={{pt: 5}}> 
          Preferred Course Times:
        </Typography>
        <Typography sx={{pt: 2}}>
          Time Window 1
        </Typography>
        <RangeSliderTime></RangeSliderTime>
        <Typography sx={{pt: 2}}>
          Time Window 2
        </Typography>

        <RangeSliderTime></RangeSliderTime>
        <Typography sx={{pt: 5}}>
          How would you like RateMyProfessor and SCU Course Evaluation ratings to be weighed:
        </Typography>
        <PercentSlider></PercentSlider>

        <Typography sx={{pt: 5}}>
            Select subjects of interest for general education courses:
          </Typography>
          <Box sx={{ '& .MuiFormControlLabel-root': { fontSize: '0.75rem' } }}>
            <FormControlLabel control={<Checkbox sx={{ transform: 'scale(0.75)' }} />} label="History" />
            <FormControlLabel control={<Checkbox sx={{ transform: 'scale(0.75)' }} />} label="Film" />
            <FormControlLabel control={<Checkbox sx={{ transform: 'scale(0.75)' }} />} label="Art" />
            <FormControlLabel control={<Checkbox sx={{ transform: 'scale(0.75)' }} />} label="Music" />
            <FormControlLabel control={<Checkbox sx={{ transform: 'scale(0.75)' }} />} label="Religion" />
            <FormControlLabel control={<Checkbox sx={{ transform: 'scale(0.75)' }} />} label="Philosophy" />
            <FormControlLabel control={<Checkbox sx={{ transform: 'scale(0.75)' }} />} label="Science" />
            <FormControlLabel control={<Checkbox sx={{ transform: 'scale(0.75)' }} />} label="Social Science" />
            <FormControlLabel control={<Checkbox sx={{ transform: 'scale(0.75)' }} />} label="Ethics" />
            <FormControlLabel control={<Checkbox sx={{ transform: 'scale(0.75)' }} />} label="Anthropology" />
            <FormControlLabel control={<Checkbox sx={{ transform: 'scale(0.75)' }} />} label="Business" />
            <FormControlLabel control={<Checkbox sx={{ transform: 'scale(0.75)' }} />} label="Finance" />
            <FormControlLabel control={<Checkbox sx={{ transform: 'scale(0.75)' }} />} label="Literature" />
            <FormControlLabel control={<Checkbox sx={{ transform: 'scale(0.75)' }} />} label="Architecture" />
            <FormControlLabel control={<Checkbox sx={{ transform: 'scale(0.75)' }} />} label="Foreign Language" />
            <FormControlLabel control={<Checkbox sx={{ transform: 'scale(0.75)' }} />} label="Law" />
          </Box>
        <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
          <Button variant="contained" color="primary">
              Submit Preferences
          </Button>
        </Box>
      </Box>
    );
}