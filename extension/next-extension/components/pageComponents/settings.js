import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';


export default function Settings() {
    return (
      <Box>
        <Typography variant='h6'>Settings: </Typography>
        <Typography>Logged in as John Doe </Typography>
        <Stack spacing={2} sx={{mt: 1}}>
          <Button variant="contained" color="primary" onClick={() => console.log("Sign Out clicked")}>
            Sign Out
          </Button>    
          <Button variant="contained" color="primary" onClick={() => console.log("Delete History clicked")}>
            Delete Course History
          </Button>     
          <Button variant="contained" color="error" onClick={() => console.log("Delete Account clicked")}>
            Delete My Account
          </Button>
        </Stack>
      </Box>
    );
}