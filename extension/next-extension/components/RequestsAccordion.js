import React from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import IconButton from '@mui/material/IconButton';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';

const RequestsAccordion = ({ requests = [], setRequests = () => {}, setFriends = () => {} }) => {
  const handleAccordionChange = (id) => {
    setRequests(requests.map(request => ({
      ...request,
      expanded: request.id === id ? !request.expanded : request.expanded
    })));
  };

  const acceptRequest = (event, request) => {
    event.stopPropagation();
    setFriends(prevFriends => [...prevFriends, {
      id: Date.now(), // Generate new ID
      name: request.name,
      details: "New friend added",
      expanded: false
    }]);
    setRequests(requests.filter(req => req.id !== request.id));
  };

  const declineRequest = (event, id) => {
    event.stopPropagation();
    setRequests(requests.filter(request => request.id !== id));
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 600 }}>
      <Typography variant="h6" gutterBottom sx={{ fontSize: '1rem', mt: 2 }}>
        Friend Requests:
      </Typography>
      {requests.map((request) => (
        <Accordion 
          key={request.id}
          expanded={request.expanded}
          onChange={() => handleAccordionChange(request.id)}
          sx={{
            mb: 1,
            '&:before': {
              display: 'none',
            }
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls={`request${request.id}-content`}
            id={`request${request.id}-header`}
            sx={{
              '& .MuiAccordionSummary-content': {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mr: 1
              }
            }}
          >
            <Typography>{request.name}</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton
                size="small"
                onClick={(e) => acceptRequest(e, request)}
                sx={{
                  color: 'success.main',
                  '&:hover': {
                    backgroundColor: 'success.light',
                    color: 'white'
                  }
                }}
              >
                <CheckIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                onClick={(e) => declineRequest(e, request.id)}
                sx={{
                  color: 'error.main',
                  '&:hover': {
                    backgroundColor: 'error.light',
                    color: 'white'
                  }
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography>
              {request.details}
            </Typography>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
};

RequestsAccordion.propTypes = {
  requests: PropTypes.array,
  setRequests: PropTypes.func,
  setFriends: PropTypes.func
};

export default RequestsAccordion;
