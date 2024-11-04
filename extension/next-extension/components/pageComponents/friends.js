import React, { useState } from 'react';
import Box from '@mui/material/Box';
import FriendsAccordion from '../FriendsAccordion';
import RequestsAccordion from '../RequestsAccordion';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';

export default function Friends() {
    //test friends
    const [friends, setFriends] = useState([
        { id: 1, name: "Bob", details: "Courses registered next quarter: Math14 with X, COEN20 with Y", expanded: false },
        { id: 2, name: "Jess", details: "Courses registered next quarter: Math12 with Z, COEN21 with A", expanded: false }
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
                <Typography>Search Users: </Typography>
                <TextField id="outlined-basic" label="Enter a name or email" variant="outlined" sx={{ width: '350px' }} />
            </Box>
        </Box>
    );
}