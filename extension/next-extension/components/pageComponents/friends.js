import React, { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import FriendsAccordion from "../FriendsAccordion";
import RequestsAccordion from "../RequestsAccordion";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";

export default function Friends() {
  // Updated friends data structure with profile pictures
  const [friends, setFriends] = useState([
    {
      id: "user123",
      name: "Bob Smith",
      email: "bob.smith@scu.edu",
      profilePicture: "/path/to/bob-profile.jpg", // Add profile picture path
      expanded: false,
      courses: {
        interested: [
          {
            courseCode: "MATH14",
            courseName: "Calculus",
            professor: "Shruthi Shapiro",
            quarter: "Fall 2024",
          },
          {
            courseCode: "CSCI60-2",
            courseName: "Intro to Programming",
            professor: "Nicholas Tran",
            quarter: "Fall 2024",
          },
        ],
        taken: [
          {
            courseCode: "CSCI56",
            courseName: "Data Structures",
            professor: "John Doe",
            quarter: "Spring 2024",
          },
        ],
      },
    },
    {
      id: "user456",
      name: "Jess Williams",
      email: "jess.williams@scu.edu",
      profilePicture: "/path/to/jess-profile.jpg", // Add profile picture path
      expanded: false,
      courses: {
        interested: [
          {
            courseCode: "MATH12-1",
            courseName: "Linear Algebra",
            professor: "Mehdi Ahmadi",
            quarter: "Fall 2024",
          },
          {
            courseCode: "CSCI60-1",
            courseName: "Programming Fundamentals",
            professor: "Tiantian Chen",
            quarter: "Fall 2024",
          },
        ],
        taken: [
          {
            courseCode: "CSCI61",
            courseName: "Algorithms",
            professor: "Jane Smith",
            quarter: "Spring 2024",
          },
        ],
      },
    },
  ]);

  // Updated requests data structure with profile pictures
  const [requests, setRequests] = useState([
    {
      id: "request123",
      name: "Alice Glass",
      email: "aglass@scu.edu",
      profilePicture: "/path/to/alice-profile.jpg", // Add profile picture path
      expanded: false,
      courses: {
        interested: [
          {
            courseCode: "CSCI65",
            courseName: "Web Development",
            professor: "Mark Johnson",
            quarter: "Fall 2024",
          },
        ],
        taken: [
          {
            courseCode: "CSCI60",
            courseName: "Intro to Computer Science",
            professor: "Sarah Lee",
            quarter: "Winter 2024",
          },
        ],
      },
    },
    {
      id: "request456",
      name: "Tom Ford",
      email: "tford@scu.edu",
      profilePicture: "/path/to/tom-profile.jpg", // Add profile picture path
      expanded: false,
      courses: {
        interested: [
          {
            courseCode: "MATH20",
            courseName: "Discrete Mathematics",
            professor: "Emily Wong",
            quarter: "Fall 2024",
          },
        ],
        taken: [
          {
            courseCode: "CSCI62",
            courseName: "Object-Oriented Programming",
            professor: "Michael Brown",
            quarter: "Spring 2024",
          },
        ],
      },
    },
  ]);

  const getUsersByName = async (name) => {
    const users = await chrome.runtime.sendMessage({
      type: "queryUserByName",
      name: name,
    });
    console.log(users);
    // Do something with the users here, maybe setState.
  };

  useEffect(() => {
    getUsersByName("Stevie");
  }, []);

  return (
    <Box
      sx={{
        overflow: "auto",
        padding: 2,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Move invite section to the top */}
      <Box
        sx={{
          mb: 2,
          flexDirection: "column",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Typography variant="h6" sx={{ mb: 2 }}>
          Invite friend
        </Typography>
        <TextField
          fullWidth
          id="outlined-basic"
          label="Enter user's email"
          variant="outlined"
          sx={{ mb: 2 }}
        />
        <Button variant="contained" color="primary" fullWidth>
          Send Invite
        </Button>
      </Box>

      <RequestsAccordion
        requests={requests}
        setRequests={setRequests}
        setFriends={setFriends}
      />
      <FriendsAccordion friends={friends} setFriends={setFriends} />
    </Box>
  );
}
