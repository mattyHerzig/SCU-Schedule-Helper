import { useState, useEffect, useRef } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import AuthWrapper from "./authWrapper";
import FriendsAccordion from "../friendComponents/FriendsAccordion";
import RequestsAccordion from "../friendComponents/RequestsAccordion";

export default function Friends() {
  const [friends, setFriends] = useState([]);
  const [requestsIn, setRequestsIn] = useState([]);
  const [requestsOut, setRequestsOut] = useState([]);
  const [error, setError] = useState(null);
  const errorTimeout = useRef(null);

  useEffect(() => {
    const fetchFriendData = async () => {
      try {
        let { friendRequestsIn, friendRequestsOut, friends } =
          await chrome.storage.local.get([
            "friendRequestsIn",
            "friendRequestsOut",
            "friends",
          ]);

        friendRequestsIn ||= {};
        friendRequestsOut ||= {};
        friends ||= {};

        setRequestsOut(Object.values(friendRequestsOut));
        setRequestsIn(Object.values(friendRequestsIn));
        setFriends(Object.values(friends));
      } catch (error) {
        console.error("Error fetching friend data:", error);
      }
    };

    fetchFriendData();
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (
        namespace === "local" &&
        (changes.friendRequestsIn ||
          changes.friendRequestsOut ||
          changes.friends)
      )
        fetchFriendData();
    });
  }, []);

  const onError = (message) => {
    setError(message);
    if (errorTimeout.current) clearTimeout(errorTimeout.current);
    errorTimeout.current = setTimeout(() => {
      setError(null);
    }, 5000);
  };

  return (
    <AuthWrapper>
      <Box
        sx={{
          overflow: "auto",
          padding: 2,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <FriendsAccordion friends={friends} onError={onError} />
        <RequestsAccordion
          requestsIn={requestsIn}
          requestsOut={requestsOut}
          onError={onError}
        />
        <Box
          sx={{
            flexDirection: "column",
            display: "flex",
          }}
        ></Box>
        {error && <Typography color="error">{error}</Typography>}
        <br />
        <br />
      </Box>
    </AuthWrapper>
  );
}
