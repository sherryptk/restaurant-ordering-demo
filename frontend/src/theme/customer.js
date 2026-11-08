import { createTheme } from '@mui/material/styles'
import getTheme from './index'

const INK = '#1A1A1A'
const RULE = `1px solid ${INK}`

// The flat, ink-ruled system the customer pages share: 4px corners, 1px rules, no
// shadows, heavy caps display type. Nested over the base theme for customer routes only,
// so the admin area keeps its own look.
function getCustomerTheme(direction = 'ltr') {
  const base = getTheme(direction)
  const display = base.typography.h4.fontFamily
  const heading = (weight) => ({ fontFamily: display, fontWeight: weight, textTransform: 'uppercase', letterSpacing: '0.01em', lineHeight: 1.12 })

  return createTheme(base, {
    shape: { borderRadius: 4 },
    typography: {
      h4: heading(900),
      h5: heading(800),
      h6: heading(800),
      subtitle1: { fontWeight: 700 },
      button: { textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.03em' },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 4, textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.03em', boxShadow: 'none', '&:hover': { boxShadow: 'none' } },
        },
        variants: [
          { props: { variant: 'contained', color: 'primary' }, style: { backgroundColor: INK, color: '#fff', '&:hover': { backgroundColor: '#333' } } },
          { props: { variant: 'outlined', color: 'primary' }, style: { borderColor: INK, color: INK, '&:hover': { borderColor: INK, backgroundColor: '#F3E2BD' } } },
          { props: { variant: 'text', color: 'primary' }, style: { color: INK } },
        ],
      },
      MuiCard: { styleOverrides: { root: { borderRadius: 4, boxShadow: 'none', border: RULE } } },
      MuiDialog: { styleOverrides: { paper: { borderRadius: 4 } } },
      MuiDrawer: { styleOverrides: { paper: { borderRadius: 0, boxShadow: 'none', borderInlineStart: RULE } } },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 4,
            '& .MuiOutlinedInput-notchedOutline': { borderColor: INK },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: INK },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: INK, borderWidth: 2 },
          },
        },
      },
      MuiFormLabel: { styleOverrides: { root: { '&.Mui-focused': { color: INK } } } },
      MuiChip: { styleOverrides: { root: { borderRadius: 2, fontWeight: 700 } } },
      MuiAlert: { styleOverrides: { root: { borderRadius: 4 } } },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            borderRadius: 4,
            fontWeight: 800,
            borderColor: INK,
            color: INK,
            '&.Mui-selected, &.Mui-selected:hover': { backgroundColor: INK, color: '#fff' },
          },
        },
      },
      MuiRadio: { styleOverrides: { root: { '&.Mui-checked': { color: INK } } } },
      MuiCheckbox: { styleOverrides: { root: { '&.Mui-checked': { color: INK } } } },
      MuiDivider: { styleOverrides: { root: { borderColor: 'rgba(26, 26, 26, 0.18)' } } },
    },
  })
}

export default getCustomerTheme
