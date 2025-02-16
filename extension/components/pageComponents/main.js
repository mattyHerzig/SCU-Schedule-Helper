import { useRef, useState, useEffect } from "react";
import { Box, Typography, IconButton } from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ProfCourseSearch from "../queryComponents/ProfCourseSearch";
import AuthWrapper from "./authWrapper";
import QueryDialog from "../queryComponents/QueryDialog";

export default function Main({}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const boxRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const [stack, setStack] = useState([]);

  useEffect(() => {
    console.log("useEffect triggered with selected:", selected);
    if (selected !== null) {
        setStack(prevStack => {
            if (prevStack[prevStack.length - 1] !== selected) {
                const newStack = [...prevStack, selected];
                console.log("Updated stack:", newStack);
                return newStack;
            }
            return prevStack;
        });
    }
  }, [selected]);

  function scrollToTop() {
    if (boxRef.current) {
      boxRef.current.parentElement.scrollTo(0, 0);
    }
  }

  function handleDialogOpen() {
    setDialogOpen(true);
  }

  function handleDialogClose() {
    setDialogOpen(false);seEffect(() => {
      console.log("useEffect triggered with selected:", selected);
      if (selected !== null) {
          setStack(prevStack => {
              if (prevStack[prevStack.length - 1] !== selected) {
                  const newStack = [...prevStack, selected];
                  console.log("Updated stack:", newStack);
                  return newStack;
              }
              return prevStack;
          });
      }
    }, [selected]);
  }

  function handleBackButton() {
    setStack(prevStack => {
        const newStack = [...prevStack];
        newStack.pop();
        if (newStack.length === 0) {
            setSelected(null);
        } else {
            setSelected(newStack[newStack.length - 1]);
        }
        return newStack;
    });
    console.log(stack);
  }


  function title(){
    if(stack.length === 0){
    console.log("Stack Length: ", stack.length);
    return (
      <Typography
        sx={{
          mb: 3,
          alignSelf: "flex-start",
          ml: "1.3rem",
          fontSize: "1rem",
          margin: "0px 0px 0px 0px",
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
      );
    } else {
      return (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            marginBottom: '1rem'
          }}
        >
          <IconButton
            sx={{
              alignSelf: "flex-start",
              mr: "auto",
            }}
            onClick={() => handleBackButton()}
            aria-label="back"
          >
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <Typography
            sx={{
              mb: 3,
              alignSelf: "flex-end",
              ml: "1.3rem",
              fontSize: "1rem",
              margin: "0px 0px 0px 0px",
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
        </Box>
      );
    }
  }



  return (
    <AuthWrapper>
      <Box ref={boxRef} sx={{ padding: 2, overflow: "auto", pb: 0 }}>
        <Box
          sx={{
            mb: 3,
            flexDirection: "column",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {title()}
          <Box sx={{ width: "100%", maxWidth: "420px" }}>
          <ProfCourseSearch
            scrollToTop={scrollToTop}
            selected={selected}
            setSelected={setSelected}
          />
          </Box>
        </Box>
      </Box>
      <QueryDialog open={dialogOpen} onClose={handleDialogClose} />
    </AuthWrapper>
  );
}
