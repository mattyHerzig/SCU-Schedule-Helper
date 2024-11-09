import React, { useState } from 'react';
import Box from '@mui/material/Box';
import FriendsAccordion from '../FriendsAccordion';
import RequestsAccordion from '../RequestsAccordion';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';

export default function Friends() {
    //test friends
    const [friends, setFriends] = useState([
        { id: 1, name: "Bob", details: "Courses registered next quarter: Math14 with Shruthi Shapiro, CSCI60-2 with Nicholas Tran", expanded: false },
        { id: 2, name: "Jess", details: "Courses registered next quarter: MATH12-1 with Mehdi Ahmadi, CSCI60-1 with Tiantian Chen", expanded: false }
    ]);

    //test requests
    const [requests, setRequests] = useState([
        { id: 1, name: "Alice", details: "email: aglass@scu.edu", expanded: false },
        { id: 2, name: "Tom", details: "email: tford@scu.edu", expanded: false }
    ]);

    return (
        <Box>
            <RequestsAccordion requests={requests} setRequests={setRequests} setFriends={setFriends} />
            <FriendsAccordion friends={friends} setFriends={setFriends} />
            <Box sx = {{ my: 3, flexDirection: 'column', display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                <Typography>Invite friend: </Typography>
                <TextField id="outlined-basic" label="Enter user's email" variant="outlined" sx={{ width: '350px' }} />
            </Box>
            <Box sx = {{ display: 'flex', justifyContent: 'center', displayContent: 'center'}}>
                <Button variant="contained" color="primary">
                    Send Invite
                </Button>
            </Box>
        </Box>
    );
}