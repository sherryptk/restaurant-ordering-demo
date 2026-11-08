import { createTheme } from '@mui/material/styles'

function getTheme(direction = 'ltr') {
  const rtl = direction === 'rtl'

  return createTheme({
    direction,
    palette: {
      primary: {
        main: '#F5A623',
        light: '#FFD06B',
        dark: '#C17D0E',
        contrastText: '#1A1A1A',
      },
      secondary: {
        main: '#1A1A1A',
        light: '#3D3D3D',
      },
      background: {
        default: '#FFFBF2',
        paper: '#FFFFFF',
      },
    },
    shape: {
      borderRadius: 10,
    },
    typography: {
      fontFamily: rtl ? "'Cairo', sans-serif" : "'Inter', sans-serif",
      h4: {
        fontFamily: rtl ? "'Cairo', sans-serif" : "'Poppins', sans-serif",
      },
      h5: {
        fontFamily: rtl ? "'Cairo', sans-serif" : "'Poppins', sans-serif",
      },
      h6: {
        fontFamily: rtl ? "'Cairo', sans-serif" : "'Poppins', sans-serif",
      },
      subtitle1: {
        fontFamily: rtl ? "'Cairo', sans-serif" : "'Poppins', sans-serif",
      },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 8,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
          },
        },
      },
    },
  })
}

export default getTheme
