import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Card, 
  CardContent, 
  CircularProgress, 
  TextField, 
  Typography, 
  Link 
} from '@mui/material';

const ProfessorRmpSearch = () => {
  const [professorName, setProfessorName] = useState('');
  const [rmpRatings, setRmpRatings] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const getColor = (rating, type) => {
    let normalizedRating;

    if (type === 'workload') {
      normalizedRating = (rating - 1) / 9;
    } else {
      normalizedRating = rating / 5;
    }

    if (type === 'quality') {
      const r = Math.round(255 * (1 - normalizedRating));
      const g = Math.round(255 * normalizedRating);
      return `rgb(${r}, ${g}, 0)`;
    } else {
      const r = Math.round(255 * normalizedRating);
      const g = Math.round(255 * (1 - normalizedRating));
      return `rgb(${r}, ${g}, 0)`;
    }
  };

  const handleSearch = async () => {
    if (!professorName.trim()) {
      setError('Please enter a professor name');
      return;
    }

    setIsLoading(true);
    setError(null);
    setRmpRatings(null);

    try {
      // In a real Next.js application, replace this with an API route
      const response = await chrome.runtime.sendMessage({
        type: 'getRmpRatings',
        profName: professorName.trim()
      });

      if (response && (response.avgRating !== 'N/A' || response.avgDifficulty !== 'N/A')) {
        setRmpRatings(response);
      } else {
        setError('No RMP ratings found for this professor');
      }
    } catch (err) {
      setError('Error fetching RMP ratings');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 600, margin: 'auto', p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Rate My Professors Lookup
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField
          fullWidth
          label="Professor Name"
          variant="outlined"
          value={professorName}
          onChange={(e) => setProfessorName(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button
          variant="contained"
          onClick={handleSearch}
          disabled={isLoading}
        >
          {isLoading ? <CircularProgress size={24} /> : 'Search'}
        </Button>
      </Box>

      {error && (
        <Typography color="error" variant="body2" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <CircularProgress />
        </Box>
      )}

      {rmpRatings && !isLoading && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {professorName}
            </Typography>
            <Box sx={{ display: "flex", gap: 4, justifyContent: "space-between" }}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Overall Quality
                </Typography>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    color: getColor(parseFloat(rmpRatings.avgRating), "quality"),
                    fontWeight: "bold"
                  }}
                >
                  {rmpRatings.avgRating} /5
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Difficulty
                </Typography>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    color: getColor(parseFloat(rmpRatings.avgDifficulty), "difficulty"),
                    fontWeight: "bold"
                  }}
                >
                  {rmpRatings.avgDifficulty} /5
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  RMP Link
                </Typography>
                <Link
                  href={`https://www.ratemyprofessors.com/search/professors?q=${encodeURIComponent(professorName)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="body2"
                >
                  View on RMP
                </Link>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default ProfessorRmpSearch;