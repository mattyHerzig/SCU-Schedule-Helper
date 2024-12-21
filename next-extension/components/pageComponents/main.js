import { useRef } from "react";
import { Box, Typography } from "@mui/material";
import ProfCourseSearch from "../queryComponents/ProfCourseSearch";
import AuthWrapper from "./authWrapper";

export default function Main({}) {
  const boxRef = useRef(null);

  function scrollToTop() {
    if (boxRef.current) {
      boxRef.current.parentElement.scrollTo(0, 0);
    }
  }

  return (
    <AuthWrapper>
      <Box ref={boxRef} sx={{ overflow: "auto" }}>
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
            <ProfCourseSearch scrollToTop={scrollToTop} />
          </Box>
        </Box>
      </Box>
    </AuthWrapper>
  );
}
