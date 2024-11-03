
import Box from '@mui/material/Box';

export default function App({ Component, pageProps }) {
  return (
    <Box sx={{ width: 450, height: 600, overflow: 'auto' }}>
      <Component {...pageProps} />
    </Box>
  );
}