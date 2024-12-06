import React, { useEffect, useState } from "react";
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

export default function FriendsAccordion({ friends = [], onError = () => {} }) {
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [friendToRemove, setFriendToRemove] = useState(null);
  const [transformedFriends, setTransformedFriends] = useState([]);

  useEffect(() => {
    const transformedFriends = friends.map((profile) => {
      return {
        ...profile,
        expanded: false,
        courses: {
          interested:
            Object.keys(profile.interestedSections)
              .map((encodedCourse) => {
                const courseMatch = encodedCourse.match(
                  /P{(.*?)}S{(.*?)}M{(.*?)}/,
                );
                if (!courseMatch) {
                  console.error(
                    "Error parsing interested course:",
                    encodedCourse,
                  );
                  return null;
                }
                const meetingPatternMatch =
                  courseMatch[3].match(/(.*) \| (.*) \| (.*)/);
                const meetingPattern = `${meetingPatternMatch[1]} at ${meetingPatternMatch[2].replaceAll(" ", "").replaceAll(":00", "").toLowerCase()}`;
                const indexOfDash = courseMatch[2].indexOf("-");
                let indexOfEnd = courseMatch[2].indexOf("(-)");
                if (indexOfEnd === -1) indexOfEnd = courseMatch[2].length;
                const courseCode = courseMatch[2]
                  .substring(0, indexOfDash)
                  .replace(" ", "");
                const professor = courseMatch[1];
                const courseName = courseMatch[2]
                  .substring(indexOfDash + 1, indexOfEnd)
                  .trim();
                return courseMatch
                  ? {
                      courseCode,
                      courseName,
                      professor,
                      meetingPattern,
                    }
                  : null;
              })
              .filter(Boolean) || [],
          taken: profile.coursesTaken
            ?.map((encodedCourse) => {
              const courseMatch = encodedCourse.match(
                /P{(.*?)}C{(.*?)}T{(.*?)}/,
              );
              if (!courseMatch) return null;
              const firstDash = courseMatch[2].indexOf("-");
              let secondDash = courseMatch[2].indexOf("-", firstDash + 1);
              if (secondDash === -1 || secondDash - firstDash > 5) {
                secondDash = firstDash;
              }
              let indexOfEnd = courseMatch[2].indexOf("(-)");
              if (indexOfEnd === -1) indexOfEnd = courseMatch[2].length;
              const courseCode = courseMatch[2]
                .substring(0, firstDash)
                .replace(" ", "");
              const professor = courseMatch[1] || "unknown";
              const courseName = courseMatch[2]
                .substring(secondDash + 1, indexOfEnd)
                .trim();
              return courseMatch
                ? {
                    courseCode,
                    courseName,
                    professor,
                    quarter: courseMatch[3],
                  }
                : null;
            })
            .sort(mostRecentTermFirst),
        },
      };
    });
    transformedFriends.map((friend) => {
    });
    setTransformedFriends(transformedFriends);
  }, [friends]);

  const handleAccordionChange = (id) => {
    setTransformedFriends(
      transformedFriends.map((friend) => ({
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
        const updateError = await chrome.runtime.sendMessage({
          type: "updateUser",
          updateItems: {
            friends: {
              remove: [friendToRemove],
            },
          },
        });
        if (updateError) {
          onError(updateError);
        }
        setOpenConfirmDialog(false);
        setFriendToRemove(null);
      } catch (error) {
        console.error("Error removing friend:", error);
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
      {transformedFriends.map((friend) => (
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
}

function mostRecentTermFirst(objA, objB) {
  const termA = objA.quarter || "Fall 2000";
  const termB = objB.quarter || "Fall 2000";
  const [quarterA, yearA] = termA.split(" ");
  const [quarterB, yearB] = termB.split(" ");
  if (yearA === yearB) {
    return quarterCompareDescending(quarterA, quarterB);
  } else {
    return parseInt(yearB) - parseInt(yearA);
  }
}

function quarterCompareDescending(quarterA, quarterB) {
  const quarters = ["Fall", "Summer", "Spring", "Winter"];
  return quarters.indexOf(quarterA) - quarters.indexOf(quarterB);
}
