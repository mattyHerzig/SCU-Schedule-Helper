import { Box, Typography, Tooltip } from "@mui/material";

import React from "react";
interface FriendCoursesTooltipProps {
  // friendData may be null while loading or when no data is available
  friendData: {
    friendInterestedInfos: string[];
    friendTakenInfos: string[];
  } | null;
}
export default function FriendCoursesTooltip({ friendData }: FriendCoursesTooltipProps) {
  return (
    friendData && (
      <>
        <Box>
          <Tooltip
            placement="right"
            title={
              friendData.friendInterestedInfos.length > 0 && (
                <Box maxWidth="16rem">
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
              <span style={{ fontWeight: "bold" }}>
                {friendData.friendInterestedInfos.length}{" "}
              </span>
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
                <Box maxWidth="16rem">
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
              <span style={{ fontWeight: "bold" }}>
                {friendData.friendTakenInfos.length}{" "}
              </span>
              {friendData.friendTakenInfos.length === 1
                ? "friend "
                : "friends "}
              took
            </Typography>
          </Tooltip>
        </Box>
      </>
    )
  );
}
