import { useEffect, useState } from "react";
import {
  Typography,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Avatar,
  Stack,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
} from "@mui/material";
import { ExpandMore, Close } from "@mui/icons-material";
import CourseDetailsCard from "../utils/CourseDetailsCard.js";
import {
  mostRecentTermFirst,
  parseInterestedSections,
  parseTakenCourses,
} from "../utils/user.js";

export default function FriendsAccordion({
  friends = [],
  handleActionCompleted,
}) {
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [friendToRemove, setFriendToRemove] = useState(null);
  const [transformedFriends, setTransformedFriends] = useState([]);

  useEffect(() => {
    const transformedFriends = friends.map((profile) => {
      return {
        ...profile,
        expanded: false,
        courses: {
          interested: parseInterestedSections(profile.interestedSections),
          taken: parseTakenCourses(profile.coursesTaken).sort(
            mostRecentTermFirst,
          ),
        },
      };
    });
    setTransformedFriends(transformedFriends);
  }, [friends]);

  function handleRemoveFriendClick (event, id) {
    event.stopPropagation();
    setFriendToRemove(id);
    setOpenConfirmDialog(true);
  };

  async function handleConfirmRemoveFriend () {
    if (friendToRemove) {
      try {
        const updateResponse = await chrome.runtime.sendMessage({
          type: "updateUser",
          updateItems: {
            friends: {
              remove: [friendToRemove],
            },
          },
        });
        if (updateResponse && !updateResponse.ok) {
          handleActionCompleted(updateResponse.message, "error");
        } else {
          handleActionCompleted("Friend removed.", "success");
        }
        setOpenConfirmDialog(false);
        setFriendToRemove(null);
      } catch (error) {
        console.error("Error removing friend:", error);
      }
    }
  };

  function handleCancelRemoveFriend () {
    setOpenConfirmDialog(false);
    setFriendToRemove(null);
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Typography variant="h6" gutterBottom sx={{ fontSize: "1.25rem" }}>
        Friends
      </Typography>
      {transformedFriends.map((friend) => (
        <Accordion
          key={friend.id}
          sx={{
            mb: 1,
            "&:before": {
              display: "none",
            },
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMore />}
            aria-controls={`panel${friend.id}-content`}
            id={`panel${friend.id}-header`}
            sx={{
              "& .MuiAccordionSummary-content, & .MuiAccordionSummary-content.Mui-expanded":
                {
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
              sx={{ width: "100%" }}
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
                <Close fontSize="small" />
              </IconButton>
            </Stack>
          </AccordionSummary>
          <AccordionDetails
            sx={{
              maxHeight: "10rem",
              overflowY: "auto",
            }}
          >
            <Box>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Email: {friend.email}
              </Typography>
              <CourseDetailsCard courses={friend.courses} />
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
}
