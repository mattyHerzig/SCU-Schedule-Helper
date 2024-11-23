import * as React from "react";
import Box from "@mui/material/Box";
import { Typography } from "@mui/material";
import ProfCourseSearch from '../ProfCourseSearch'; 

export default function Main({ navigateToPage }) {
  return (
    <Box sx={{ width: 500, height: 600, overflow: "auto"}}>
      <Box
        sx={{
          mb: 3,
          flexDirection: "column",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Typography sx={{ mb: 3 }}>
          Search Professors and Course Information:
        </Typography>
        
        <Box sx={{ width: "100%", maxWidth: "420px" }}>
          <ProfCourseSearch />
        </Box>
      </Box>
    </Box>
  );
}