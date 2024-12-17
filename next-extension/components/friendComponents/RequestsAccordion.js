import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Avatar,
  Stack,
} from "@mui/material";
import { ExpandMore, Check, Close } from "@mui/icons-material";

const transformUserToCourses = (user) => {
  const transformCourses = (courseList, type) => {
    return courseList
      .map((encodedCourseCode) => {
        const courseMatch = encodedCourseCode.match(/P{(.*?)}C{(.*?)}T{(.*?)}/);
        if (!courseMatch) return null;
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

        return {
          courseCode,
          courseName,
          professor: professor,
        };
      })
      .filter((course) => course !== null);
  };

  return {
    taken: transformCourses(user.coursesTaken || [], "taken"),
    interested: transformCourses(user.interestedSections || [], "interested"),
  };
};

export default function RequestsAccordion({
  requestsIn = [],
  requestsOut = [],
  handleActionCompleted = (action, type) => {},
}) {
  const [transformedRequestsIn, setTransformedRequestsIn] =
    useState(requestsIn);
  const [transformedRequestsOut, setTransformedRequestsOut] =
    useState(requestsOut);

  useEffect(() => {
    setTransformedRequestsIn(
      requestsIn.map((request) => ({
        ...request,
        type: "incoming",
        expanded: false,
        courses: transformUserToCourses(request),
      })),
    );
    setTransformedRequestsOut(
      requestsOut.map((request) => ({
        ...request,
        expanded: false,
        type: "outgoing",
        courses: transformUserToCourses(request),
      })),
    );
  }, [requestsIn, requestsOut]);

  const handleAccordionChange = (curReq, expanded) => {
    const transformedRequests =
      curReq.type === "incoming"
        ? transformedRequestsIn
        : transformedRequestsOut;
    const setter =
      curReq.type === "incoming"
        ? setTransformedRequestsIn
        : setTransformedRequestsOut;
    setter(
      transformedRequests.map(
        (request) =>
          (request.id === curReq.id && {
            ...request,
            expanded,
          }) ||
          request,
      ),
    );
  };

  const handleAcceptRequest = async (event, request) => {
    event.stopPropagation();
    try {
      const updateResponse = await chrome.runtime.sendMessage({
        type: "updateUser",
        updateItems: {
          friends: {
            add: [request.id],
          },
        },
      });
      if (updateResponse && !updateResponse.ok)
        handleActionCompleted(updateResponse.message, "error");
      else handleActionCompleted("Friend request accepted.", "success");
    } catch (error) {
      console.error("Error accepting friend request:", error);
    }
  };

  const handleRejectRequest = async (event, request) => {
    event.stopPropagation();
    const key =
      request.type == "incoming" ? "removeIncoming" : "removeOutgoing";
    try {
      const updateResponse = await chrome.runtime.sendMessage({
        type: "updateUser",
        updateItems: {
          friendRequests: {
            [key]: [request.id],
          },
        },
      });
      if (updateResponse && !updateResponse.ok)
        handleActionCompleted(updateResponse.message, "error");
      else handleActionCompleted("Friend request removed.", "success");
    } catch (error) {
      console.error("Error rejecting friend request:", error);
    }
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Typography variant="h6" gutterBottom sx={{ fontSize: "1.25rem", mt: 2 }}>
        Friend Requests
      </Typography>

      <Accordion
        defaultExpanded={requestsIn.length > 0}
        disableGutters
        square
        sx={{
          "&:before": {
            display: "none",
          },
          "&:not(:last-child)": {
            borderBottom: 0,
          },
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMore />}
          aria-controls="received-requests-content"
          id="received-requests-header"
          sx={{
            flexDirection: "row-reverse",
            "& .MuiAccordionSummary-content": {
              marginLeft: 2,
            },
          }}
        >
          <Typography variant="h6" sx={{ fontSize: "1rem" }}>
            Received
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          {transformedRequestsIn.map((request) => (
            <Accordion
              key={request.id}
              expanded={request.expanded}
              onChange={(event, expanded) =>
                handleAccordionChange(request, expanded)
              }
              sx={{
                mb: 1,
                "&:before": {
                  display: "none",
                },
                overflow: "hidden",
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMore />}
                aria-controls={`panel${request.id}-content`}
                id={`panel${request.id}-header`}
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
                    src={request.photoUrl}
                    alt={request.name}
                    sx={{ width: 40, height: 40 }}
                  />
                  <Typography sx={{ flexGrow: 1 }}>{request.name}</Typography>
                  <Stack direction="row" spacing={1}>
                    <IconButton
                      size="small"
                      onClick={(e) => handleAcceptRequest(e, request)}
                      sx={{
                        color: "success.main",
                        "&:hover": {
                          backgroundColor: "success.light",
                          color: "white",
                        },
                      }}
                    >
                      <Check fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={(e) => handleRejectRequest(e, request)}
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
                </Stack>
              </AccordionSummary>
              <AccordionDetails
                sx={{
                  p: 2,
                  overflow: "hidden",
                  maxHeight: "fit-content",
                  boxSizing: "border-box",
                }}
              >
                <Box>
                  <Typography variant="body2">
                    Email: {request.email}
                  </Typography>
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </AccordionDetails>
      </Accordion>

      <Accordion
        disableGutters
        sx={{
          mb: 2,
          "&:before": {
            display: "none",
          },
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMore />}
          aria-controls="sent-requests-content"
          id="sent-requests-header"
          sx={{
            flexDirection: "row-reverse",
            "& .MuiAccordionSummary-content": {
              marginLeft: 2,
            },
          }}
        >
          <Typography variant="h6" sx={{ fontSize: "1rem" }}>
            Sent
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          {transformedRequestsOut.map((request) => (
            <Accordion
              key={request.id}
              expanded={request.expanded}
              onChange={(event, expanded) =>
                handleAccordionChange(request, expanded)
              }
              sx={{
                mb: 1,
                "&:before": {
                  display: "none",
                },
                overflow: "hidden",
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMore />}
                aria-controls={`panel${request.id}-content`}
                id={`panel${request.id}-header`}
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
                    src={request.photoUrl}
                    alt={request.name}
                    sx={{ width: 40, height: 40 }}
                  />
                  <Typography sx={{ flexGrow: 1 }}>{request.name}</Typography>
                  <Stack direction="row" spacing={1}>
                    <IconButton
                      size="small"
                      onClick={(e) => handleRejectRequest(e, request)}
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
                </Stack>
              </AccordionSummary>
              <AccordionDetails
                sx={{
                  p: 2,
                  overflow: "hidden",
                  maxHeight: "fit-content",
                  boxSizing: "border-box",
                }}
              >
                <Box>
                  <Typography variant="body2">
                    Email: {request.email}
                  </Typography>
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}
