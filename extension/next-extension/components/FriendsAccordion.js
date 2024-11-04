import React from 'react';
import PropTypes from 'prop-types'; // Add prop-types for default props and validation
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import IconButton from '@mui/material/IconButton';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloseIcon from '@mui/icons-material/Close';

const FriendsAccordion = ({ friends = [], setFriends = () => {} }) => {
  const handleAccordionChange = (id) => {
    setFriends(friends.map(friend => ({
      ...friend,
      expanded: friend.id === id ? !friend.expanded : friend.expanded
    })));
  };

  const removeFriend = (event, id) => {
    event.stopPropagation();
    setFriends(friends.filter(friend => friend.id !== id));
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 600 }}>
      <Typography variant="h6" gutterBottom sx={{ fontSize: '1rem', mt: 2 }}>
        Friends:
      </Typography>
      {friends.map((friend) => (
        <Accordion 
          key={friend.id}
          expanded={friend.expanded}
          onChange={() => handleAccordionChange(friend.id)}
          sx={{
            mb: 1,
            '&:before': {
              display: 'none',
            }
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls={`panel${friend.id}-content`}
            id={`panel${friend.id}-header`}
            sx={{
              '& .MuiAccordionSummary-content': {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mr: 1
              }
            }}
          >
            <Typography>{friend.name}</Typography>
            <IconButton
              size="small"
              onClick={(e) => removeFriend(e, friend.id)}
              sx={{
                ml: 2,
                color: 'error.main',
                '&:hover': {
                  backgroundColor: 'error.light',
                  color: 'white'
                }
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </AccordionSummary>
          <AccordionDetails>
            <Typography>
              {friend.details}
            </Typography>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
};

FriendsAccordion.propTypes = {
  friends: PropTypes.array,
  setFriends: PropTypes.func
};

export default FriendsAccordion;
