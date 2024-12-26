import * as React from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import CssBaseline from '@mui/material/CssBaseline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import TuneIcon from '@mui/icons-material/Tune';
import InfoIcon from '@mui/icons-material/Info';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { signIn } from '../public/utils/authorization';

const theme = createTheme({
  palette: {
    primary: {
      main: '#802a25',
      dark: '#671f1a',
    },
  },
});

const LandingPage = () => {
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);
  const [showError, setShowError] = React.useState(false);
  const [error, setError] = React.useState('');
  const [expanded, setExpanded] = React.useState(false);

  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  const handleSignIn = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    
    try {
      const errorMessage = await signIn();
      
      if (errorMessage) {
        setError(errorMessage);
        setShowError(true);
      } else {
        window.close();
      }
    } catch (error) {
      setError("An unexpected error occurred during sign in. Please try again.");
      setShowError(true);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleCloseError = () => {
    setShowError(false);
  };

  const features = [
    {
      icon: <InfoIcon sx={{ fontSize: 40 }} />,
      title: "View course and professor information directly in Workday",
      description: "Scores are calculated for each course directly from historical professor and course ratings from RateMyProfessor and SCU Course Evaluations"
    },
    {
      icon: <PersonAddIcon sx={{ fontSize: 40 }} />,
      title: "Add friends and see what classes they are taking",
      description: "Add friends to see what courses they are interested in and have them in Workday."
    },
    {
      icon: <TuneIcon sx={{ fontSize: 40 }} />,
      title: "Filter courses by your preferences",
      description: "Filter courses according to your time preferences, hide important courses automatically, select the course and version quality vs. spot limit score and versus seats/professor slots should be weighted in course scores"
    },
    {
      icon: <CalendarMonthIcon sx={{ fontSize: 40 }} />,
      title: "Generate Course Schedules (under construction)",
      description: "Generate course plans based off your major, courses taken, and preferences"
    }
  ];

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      
      {/* Navigation Bar */}
      <Box 
        sx={{ 
          backgroundColor: 'black',
          color: 'white',
          py: 2,
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1100
        }}
      >
        <Container maxWidth="lg">
          <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
            SCU Schedule Helper
          </Typography>
        </Container>
      </Box>

      {/* Extension Pointer */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          right: 50, // Moved more to the right
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 1200,
          pt: 1,
        }}
      >
        <Box
          component="svg"
          sx={{
            width: 40,
            height: 40,
            animation: 'bounce 1s infinite',
            '@keyframes bounce': {
              '0%, 100%': { transform: 'translateY(0)' },
              '50%': { transform: 'translateY(-10px)' },
            },
          }}
          viewBox="0 0 40 40"
        >
          <path
            d="M20 35 L20 5 L10 15 M20 5 L30 15"
            fill="none"
            stroke={theme.palette.primary.main}
            strokeWidth="2"
          />
        </Box>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 'bold',
            color: theme.palette.primary.main,
            mt: 1,
            textAlign: 'center',
            maxWidth: '150px',
            p: 1,
          }}
        >
          Find the extension here!
          <br />
          Don't forget to pin
        </Typography>
      </Box>
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          pt: '64px',
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '64px',
            left: 0,
            right: 0,
            height: '60vh',
            backgroundImage: 'url("/images/bgimage.jpg")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            opacity: 0.5,
            zIndex: -1
          }
        }}
      >
        <Container maxWidth="lg" sx={{ py: 4, height: '60vh', display: 'flex', alignItems: 'center' }}>
          <Box sx={{ ml: 4 }}>
            <Typography variant="h2" component="h1" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
              Course Registration Made Easier
            </Typography>
            <Typography variant="h6" sx={{ mb: 4 }}>
              Ready to have a better experience registering for courses?
              <br />
              Sign in to access the extension
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                onClick={handleSignIn}
                disabled={isLoggingIn}
                sx={{ py: 1, px: 3 }}
              >
                {isLoggingIn ? "Signing in..." : "Sign In with Google"}
              </Button>
              
            </Box>
          </Box>
        </Container>

        <Box sx={{ backgroundColor: 'white', width: '100%', mt: 4 }}>
          <Container maxWidth="lg" sx={{ py: 4 }}>
            <Grid container spacing={4} sx={{ mb: 6 }}>
              {features.map((feature, index) => (
                <Grid item xs={12} sm={6} md={3} key={index}>
                  <Box 
                    sx={{ 
                      p: 3, 
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                    }}
                  >
                    {feature.icon}
                    <Typography variant="h6" component="h3" sx={{ mt: 2, mb: 1 }}>
                      {feature.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {feature.description}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>

            <Box sx={{ mt: 4 }}>
              <Typography variant="h4" component="h2" gutterBottom sx={{ mb: 3 }}>
                FAQ
              </Typography>
              
              <Accordion 
                expanded={expanded === 'panel1'} 
                onChange={handleAccordionChange('panel1')}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls="panel1-content"
                  id="panel1-header"
                >
                  <Typography component="span">Why do I need to sign in?</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography>
                    Due to the SCU Course Evaluations data policy, we require all students to sign in to access our data. 
                    We use Google OAuth to securely authenticate your SCU credentials.
                  </Typography>
                </AccordionDetails>
              </Accordion>

              <Accordion 
                expanded={expanded === 'panel2'} 
                onChange={handleAccordionChange('panel2')}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls="panel2-content"
                  id="panel2-header"
                >
                  <Typography component="span">How are you using my data?</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography>
                    We only use your data to provide you with course recommendations and to help you find courses that match your preferences. 
                    Your Google account is only used for authentication purposes.
                  </Typography>
                </AccordionDetails>
              </Accordion>
            </Box>
          </Container>
        </Box>

        <Snackbar
          open={showError}
          autoHideDuration={6000}
          onClose={handleCloseError}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={handleCloseError}
            severity="error"
            sx={{ width: '100%' }}
          >
            {error}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
};

export default LandingPage;