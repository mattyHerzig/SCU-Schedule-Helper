import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import SettingsIcon from '@mui/icons-material/Settings';
import TuneIcon from '@mui/icons-material/Tune';
import HomeIcon from '@mui/icons-material/Home';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

export default function Menu({ navigateToPage }) {
  return (
    <Box sx={{mb: 3}}>
      <AppBar position="static" sx={{ backgroundColor: 'white', boxShadow: 'none', borderBottom: '2px solid black' }}>
        <Toolbar sx={{ backgroundColor: 'white' }}>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: 'black', }}>
            <span style={{ color: '#703331' }}>SCU</span> Schedule Helper
          </Typography>
          <TuneIcon color="white" sx = {{fontSize: 30, px: 1, color: '#d1d1d1', cursor: 'pointer','&:hover': {color: '#703331'}}} onClick={() => navigateToPage('preferences')}/>
          <HomeIcon color="white" sx = {{fontSize: 30, px: 1, color: '#d1d1d1', cursor: 'pointer','&:hover': {color: '#703331'}}} onClick={() => navigateToPage('main')}/>
          <PersonAddIcon color="white" sx = {{fontSize: 30, px: 1, color: '#d1d1d1', cursor: 'pointer','&:hover': {color: '#703331'}}} onClick={() => navigateToPage('friends')}/>
        </Toolbar>
      </AppBar>
    </Box>
  );
}