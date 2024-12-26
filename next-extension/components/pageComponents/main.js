import { useRef, useState } from "react";
import { Box, Typography, IconButton } from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import ProfCourseSearch from "../queryComponents/ProfCourseSearch";
import AuthWrapper from "./authWrapper";
import QueryDialog from "../queryComponents/QueryDialog";

export default function Main({}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const boxRef = useRef(null);

  function scrollToTop() {
    if (boxRef.current) {
      boxRef.current.parentElement.scrollTo(0, 0);
    }
  }

  function handleDialogOpen() {
    setDialogOpen(true);
  }

  function handleDialogClose() {
    setDialogOpen(false);
  }

  return (
    <AuthWrapper>
      <Box ref={boxRef} sx={{ padding: 2, overflow: "auto" }}>
        <Box
          sx={{
            mb: 3,
            flexDirection: "column",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Typography
            sx={{
              mb: 3,
              alignSelf: "flex-start",
              ml: "1.3rem",
              fontSize: "1.1rem", 
            }}
            variant="h6"
          >
            Search Course and Professor Information
            <IconButton
              sx={{
                ml: 0.5,
              }}
              onClick={handleDialogOpen}
              aria-label="info"
            >
              <InfoIcon fontSize="small" />
            </IconButton>
          </Typography>

          <Box sx={{ width: "100%", maxWidth: "420px" }}>
            <ProfCourseSearch scrollToTop={scrollToTop} />
          </Box>
        </Box>
      </Box>
      <QueryDialog open={dialogOpen} onClose={handleDialogClose} />
    </AuthWrapper>
  );
}
