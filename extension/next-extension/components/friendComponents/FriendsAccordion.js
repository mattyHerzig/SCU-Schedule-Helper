import React, { useState } from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import IconButton from "@mui/material/IconButton";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CloseIcon from "@mui/icons-material/Close";
import Avatar from "@mui/material/Avatar";
import Stack from "@mui/material/Stack";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Button from "@mui/material/Button";
import FriendCourseDetails from "./FriendCourseDetails.js";

const FriendsAccordion = ({ friends = [], setFriends = () => {} }) => {
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [friendToRemove, setFriendToRemove] = useState(null);

  const handleAccordionChange = (id) => {
    setFriends(
      friends.map((friend) => ({
        ...friend,
        expanded: friend.id === id ? !friend.expanded : friend.expanded,
      })),
    );
  };

  const handleRemoveFriendClick = (event, id) => {
    event.stopPropagation();
    setFriendToRemove(id);
    setOpenConfirmDialog(true);
  };

  const handleConfirmRemoveFriend = async () => {
    if (friendToRemove) {
      try {
        await chrome.runtime.sendMessage({
          type: "updateUser",
          updateItems: {
            friends: {
              remove: [friendToRemove]
            }
          }
        });

        setFriends(friends.filter((friend) => friend.id !== friendToRemove));
        setOpenConfirmDialog(false);
        setFriendToRemove(null);
      } catch (error) {
        console.error('Error removing friend:', error);
      }
    }
  };

  const handleCancelRemoveFriend = () => {
    setOpenConfirmDialog(false);
    setFriendToRemove(null);
  };



  return (
    <Box sx={{ width: "100%" }}>
        <Typography variant="h6" gutterBottom sx={{ fontSize: "1.25rem" }}>
        Friends
      </Typography>
      {friends.map((friend) => (
        <Accordion
          key={friend.id}
          expanded={friend.expanded}
          onChange={() => handleAccordionChange(friend.id)}
          sx={{
            mb: 1,
            "&:before": {
              display: "none",
            },
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls={`panel${friend.id}-content`}
            id={`panel${friend.id}-header`}
            sx={{
              "& .MuiAccordionSummary-content": {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mr: 1,
              },
            }}
          >
            <Stack 
              direction="row" 
              spacing={2} 
              alignItems="center"
              sx={{ width: '100%' }}
            >
              <Avatar 
                src={friend.photoUrl} 
                alt={friend.name}
                sx={{ width: 40, height: 40 }}
              />
              <Typography sx={{ flexGrow: 1 }}>{friend.name}</Typography>
              <IconButton
                size="small"
                onClick={(e) => handleRemoveFriendClick(e, friend.id)}
                sx={{
                  color: "error.main",
                  "&:hover": {
                    backgroundColor: "error.light",
                    color: "white",
                  },
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <Box>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Email: {friend.email}
              </Typography>
              <FriendCourseDetails courses={friend.courses} />
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}

      <Dialog
        open={openConfirmDialog}
        onClose={handleCancelRemoveFriend}
        aria-labelledby="remove-friend-dialog-title"
        aria-describedby="remove-friend-dialog-description"
      >
        <DialogTitle id="remove-friend-dialog-title">Remove Friend</DialogTitle>
        <DialogContent>
          <DialogContentText id="remove-friend-dialog-description">
            Are you sure you want to remove this friend?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelRemoveFriend} color="primary">
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmRemoveFriend} 
            color="error" 
            variant="contained"
            autoFocus
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

FriendsAccordion.propTypes = {
  friends: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      email: PropTypes.string.isRequired,
      profilePicture: PropTypes.string,
      courses: PropTypes.shape({
        interested: PropTypes.arrayOf(
          PropTypes.shape({
            courseCode: PropTypes.string.isRequired,
            courseName: PropTypes.string.isRequired,
            professor: PropTypes.string.isRequired,
            meetingPattern: PropTypes.string.isRequired
          })
        ),
        taken: PropTypes.arrayOf(
          PropTypes.shape({
            courseCode: PropTypes.string.isRequired,
            courseName: PropTypes.string.isRequired,
            professor: PropTypes.string.isRequired,
            quarter: PropTypes.string.isRequired
          })
        )
      }).isRequired
    })
  ),
  setFriends: PropTypes.func,
};

export default FriendsAccordion;