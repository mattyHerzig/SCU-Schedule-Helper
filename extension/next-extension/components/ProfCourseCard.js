import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';

const ProfCourseCard = ({ selected, data }) => {

  const getColor = (rating, type) => {
    let normalizedRating;
    
    if (type === 'workload') {
      //(1-10 scale)
      normalizedRating = (rating - 1) / 9;
    } else {
      //0-5 scale 
      normalizedRating = rating / 5;
    }
    
    if (type === 'quality') {
      //Scale for quality (higher is better)
      const r = Math.round(255 * (1 - normalizedRating));
      const g = Math.round(255 * normalizedRating);
      return `rgb(${r}, ${g}, 0)`;
    } else {
      //Inverted scale for workload and difficulty (lower is better)
      const r = Math.round(255 * normalizedRating);
      const g = Math.round(255 * (1 - normalizedRating));
      return `rgb(${r}, ${g}, 0)`;
    }
  };

  const renderEvalStats = (stats, showWorkloadUnit = true) => {
    if (!stats) return null;
    
    const StatBox = ({ label, value, type }) => (
      <Box>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'baseline' }}>
          <Typography 
            variant="h6" 
            sx={{ 
              color: getColor(value, type),
              fontWeight: 'bold'
            }}
          >
            {value.toFixed(1)}
          </Typography>
          <Typography 
            variant="h6" 
            sx={{ 
              color: 'text.primary',
              fontWeight: 'bold',
              ml: 0.5
            }}
          >
            {type === 'workload' ? ' hrs/week' : '/5'}
          </Typography>
        </Box>
      </Box>
    );

    return (
      <Box sx={{ 
        display: 'flex', 
        gap: 4,
        justifyContent: 'space-between',
        px: 2 
      }}>
        <StatBox 
          label="Quality" 
          value={stats.qualityAvg}
          type="quality"
        />
        <StatBox 
          label="Difficulty" 
          value={stats.difficultyAvg}
          type="difficulty"
        />
        <StatBox 
          label="Workload" 
          value={stats.workloadAvg}
          type="workload"
        />
      </Box>
    );
  };

  if (!selected) return null;

  if (selected.type === 'course') {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {selected.courseName} ({selected.id})
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Recent Terms: {selected.recentTerms.join(', ')}
          </Typography>
          
          <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
            Overall Course Statistics:
          </Typography>
          {renderEvalStats(selected)}

          <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
            Professor Statistics:
          </Typography>
          {Object.entries(selected.professors).map(([profName, profStats]) => (
            <Box key={profName} sx={{ mt: 2 }}>
              <Typography variant="body1" gutterBottom>
                {profName}
              </Typography>
              {renderEvalStats(profStats)}
            </Box>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (selected.type === 'prof') {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {selected.id}
          </Typography>
          
          <Typography variant="subtitle1" gutterBottom>
            Overall Statistics:
          </Typography>
          {renderEvalStats(selected.overall)}
          
          <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
            Course Statistics:
          </Typography>
          {Object.entries(selected.courses).map(([courseCode, courseStats]) => (
            <Box key={courseCode} sx={{ mt: 2 }}>
              <Typography variant="body1" gutterBottom>
                {courseCode} - {courseStats.courseName}
              </Typography>
              {renderEvalStats(courseStats)}
            </Box>
          ))}
        </CardContent>
      </Card>
    );
  }

  return null;
};

export default ProfCourseCard;