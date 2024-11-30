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

const RequestsAccordion = ({ 
  requests = [], 
  setRequests = () => {}, 
  setFriends = () => {} 
}) => {
  const handleAccordionChange = (id) => {
    setRequests(
      requests.map((request) => ({
        ...request,
        expanded: request.id === id ? !request.expanded : request.expanded,
      })),
    );
  };

  const handleAcceptRequest = (event, request) => {
    event.stopPropagation();
    // Remove from requests
    const updatedRequests = requests.filter((r) => r.id !== request.id);
    setRequests(updatedRequests);

    // Add to friends
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
    setRequests(requests.filter((request) => request.id !== id));
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Typography variant="h6" gutterBottom sx={{ fontSize: "1rem", mt: 2 }}>
        Friend Requests:
      </Typography>
      {requests.map((request) => (
        <Accordion
          key={request.id}
          expanded={request.expanded}
          onChange={() => handleAccordionChange(request.id)}
          sx={{
            mb: 1,
            "&:before": {
              display: "none",
            },
            overflow: "hidden", // Prevent scrolling
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
      profilePicture: PropTypes.string,
      courses: PropTypes.shape({
        interested: PropTypes.arrayOf(
          PropTypes.shape({
            courseCode: PropTypes.string.isRequired,
            courseName: PropTypes.string.isRequired,
            professor: PropTypes.string.isRequired,
            quarter: PropTypes.string.isRequired
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
  setRequests: PropTypes.func,
  setFriends: PropTypes.func,
};

export default RequestsAccordion;