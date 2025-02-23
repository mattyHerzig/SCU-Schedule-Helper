import React from 'react';
import PropTypes from 'prop-types';
import { Typography, Box } from '@mui/material';

const RecentTermsToolTip = ({ recentTerms, children }) => {

  function cleanYearsAndTerms(recentTerms) {
    const termPattern = /(Spring|Summer|Fall|Winter)/gi;
    const yearPattern = /\d{4}/gi;
    const result = {};

    recentTerms.forEach(term => {
      const termMatch = term.match(termPattern);
      const yearMatch = term.match(yearPattern);

      if (termMatch && yearMatch) {
        const termName = termMatch[0];
        const year = yearMatch[0];

        if (!result[termName]) {
          result[termName] = [];
        }

        result[termName].push(year);
      }
    });

    return Object.entries(result).map(([term, years]) => (
        <Typography key={term} variant="body2" component="div">
          <b>{term}:</b> {years.join(", ")}
        </Typography>
      ));
  }

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'inline-block',
        '&:hover .tooltip-content': {
          visibility: 'visible',
          opacity: 1,
        }
      }}
    >
      {children}

      <Box
        className="tooltip-content"
        sx={{
          visibility: 'hidden',
          opacity: 0,
          position: 'absolute',
          bottom: '0',
          left: '0',
          backgroundColor: 'white',
          color: 'black',
          padding: '8px',
          borderRadius: '4px',
          border: '1px solid #ddd',
          boxShadow: 2,
          transition: 'opacity 0.3s',
          whiteSpace: 'pre-line',
          width: 'max-content',
          maxWidth: '380px',
          transform: 'translateY(100%)',
          zIndex: 1,
        }}
      >
        {cleanYearsAndTerms(recentTerms)}
      </Box>
    </Box>
  );
};

RecentTermsToolTip.propTypes = {
  recentTerms: PropTypes.arrayOf(PropTypes.string).isRequired,
  children: PropTypes.node.isRequired,
};

export default RecentTermsToolTip;
