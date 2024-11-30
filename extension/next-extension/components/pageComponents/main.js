import * as React from "react";
import Box from "@mui/material/Box";
import { Typography } from "@mui/material";
import ProfCourseSearch from '../queryComponents/ProfCourseSearch'; 
import AuthWrapper from "./authWrapper";


export default function Main({ navigateToPage }) {
  return (
    <AuthWrapper>
      <Box sx={{ overflow: "auto"}}>
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
            Search Professor and Course Information:
          </Typography>
          
          <Box sx={{ width: "100%", maxWidth: "420px" }}>
            <ProfCourseSearch />
          </Box>
        </Box>
      </Box>
    </AuthWrapper>
  );
}