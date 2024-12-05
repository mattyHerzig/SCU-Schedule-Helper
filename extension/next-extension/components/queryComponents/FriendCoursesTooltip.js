import { Box, Typography, Tooltip } from "@mui/material";
import React from "react";

export default function FriendCoursesTooltip({ friendData }) {
  return (
    friendData && (
      <>
        <Box>
          <Tooltip
            placement="right"
            title={
              friendData.friendInterestedInfos.length > 0 && (
                <Box maxWidth="15.8rem">
                  {friendData.friendInterestedInfos.map((info) => (
                    <Typography key={info} variant="body2">
                      {info}
                    </Typography>
                  ))}
                </Box>
              )
            }
          >
            <Typography
              width="fit-content"
              variant="body1"
              color="text.primary"
              gutterBottom
            >
              {friendData.friendInterestedInfos.length}{" "}
              {friendData.friendInterestedInfos.length === 1
                ? "friend "
                : "friends "}
              interested
            </Typography>
          </Tooltip>
        </Box>
        <Box>
          <Tooltip
            placement="right"
            title={
              friendData.friendTakenInfos.length > 0 && (
                <Box maxWidth="15.8rem">
                  {friendData.friendTakenInfos.map((info) => (
                    <Typography key={info} variant="body2">
                      {info}
                    </Typography>
                  ))}
                </Box>
              )
            }
          >
            <Typography
              width="fit-content"
              variant="body1"
              color="text.primary"
              gutterBottom
            >
              {friendData.friendTakenInfos.length}{" "}
              {friendData.friendTakenInfos.length === 1
                ? "friend "
                : "friends "}
              taken
            </Typography>
          </Tooltip>
        </Box>
      </>
    )
  );
}
