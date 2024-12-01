import React from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import IconButton from "@mui/material/IconButton";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import Avatar from "@mui/material/Avatar";
import Stack from "@mui/material/Stack";

const transformUserToCourses = (user) => {
  // Transform coursesTaken and interestedSections to component's course format
  const transformCourses = (courseList, type) => {
    return courseList.map(encodedCourseCode => {
      const courseMatch = encodedCourseCode.match(/P{([^}]+)}(?:C{([^}]+)}|S{([^}]+)})/);
      if (!courseMatch) return null;

      const professor = courseMatch[1];
      const extractedCourseCode = courseMatch[2] || courseMatch[3];
      
      return {
        courseCode: extractedCourseCode,
        courseName: extractedCourseCode, 
        professor,
      };
    }).filter(course => course !== null);
  };

  return {
    taken: transformCourses(user.coursesTaken || [], 'taken'),
    interested: transformCourses(user.interestedSections || [], 'interested')
  };
};

const RequestsAccordion = ({ 
  requests = [], 
  setRequests = () => {}, 
  setFriends = () => {} 
}) => {
  const transformedRequests = requests.map(request => ({
    id: request.id,
    name: request.name,
    email: request.email,
    profilePicture: request.photoUrl,
    expanded: false,
    courses: transformUserToCourses(request)
  }));

  const handleAccordionChange = (id) => {
    setRequests(
      transformedRequests.map((request) => ({
        ...request,
        expanded: request.id === id ? !request.expanded : request.expanded,
      })),
    );
  };

  const handleAcceptRequest = (event, request) => {
    event.stopPropagation();
    const updatedRequests = transformedRequests.filter((r) => r.id !== request.id);
    setRequests(updatedRequests);
    setFriends((prevFriends) => [
      ...prevFriends,
      {
        ...request,
        expanded: false,
      }
    ]);
  };

  const handleRejectRequest = (event, id) => {
    event.stopPropagation();
    setRequests(transformedRequests.filter((request) => request.id !== id));
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Typography variant="h6" gutterBottom sx={{ fontSize: "1rem", mt: 2 }}>
        Friend Requests:
      </Typography>
      {transformedRequests.map((request) => (
        <Accordion
          key={request.id}
          expanded={request.expanded}
          onChange={() => handleAccordionChange(request.id)}
          sx={{
            mb: 1,
            "&:before": {
              display: "none",
            },
            overflow: "hidden",
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
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
              sx={{ width: '100%' }}
            >
              <Avatar 
                src={request.profilePicture} 
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
                  <CheckIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={(e) => handleRejectRequest(e, request.id)}
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
    </Box>
  );
};

RequestsAccordion.propTypes = {
  requests: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      email: PropTypes.string.isRequired,
      photoUrl: PropTypes.string,
      coursesTaken: PropTypes.arrayOf(PropTypes.string),
      interestedSections: PropTypes.arrayOf(PropTypes.string)
    })
  ),
  setRequests: PropTypes.func,
  setFriends: PropTypes.func,
};

export default RequestsAccordion;