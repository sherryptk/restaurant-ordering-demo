import { useState } from 'react'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { AppBar, Toolbar, Typography, IconButton, Avatar, Menu, MenuItem, Button, Box } from '@mui/material'
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined'
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined'
import { useTranslation } from 'react-i18next'
import { selectAuth, selectCartCount, selectRestaurant, logoutCustomer } from '../../store'
import { authApi } from '../../api'
import AuthModal from './AuthModal'
import LanguageSwitcher from './LanguageSwitcher'

const INK = '#1A1A1A'
const AMBER = '#F5A623'
const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)'

// Stand-in mark while the restaurant has no uploaded logo: a waffle grid.
function WaffleMark() {
  return (
    <Box
      aria-hidden
      sx={{ width: 38, height: 38, borderRadius: '4px', bgcolor: INK, display: 'grid', placeItems: 'center', flexShrink: 0 }}
    >
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 6px)', gap: '3px' }}>
        {Array.from({ length: 9 }).map((_, i) => (
          <Box key={i} sx={{ width: 6, height: 6, borderRadius: '1.5px', bgcolor: AMBER }} />
        ))}
      </Box>
    </Box>
  )
}

const press = {
  transition: `transform 160ms ${EASE_OUT}, background-color 160ms ease`,
  '&:active': { transform: 'scale(0.96)' },
  '&.Mui-focusVisible, &:focus-visible': { outline: `2px solid ${INK}`, outlineOffset: 2 },
}

function CustomerNav({ onCartOpen }) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { customer } = useSelector(selectAuth)
  const cartCount = useSelector(selectCartCount)
  const restaurant = useSelector(selectRestaurant)

  const [authOpen, setAuthOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState(null)

  const handleMenuOpen = (e) => setAnchorEl(e.currentTarget)
  const handleMenuClose = () => setAnchorEl(null)

  const handleLogout = async () => {
    handleMenuClose()
    try {
      await authApi.logout()
    } catch {
      // ignore network errors — clear local state regardless
    }
    dispatch(logoutCustomer())
    navigate('/')
  }

  const logoUrl = restaurant.info?.logo_url

  return (
    <>
      <AppBar
        position="sticky"
        color="inherit"
        elevation={0}
        sx={{ bgcolor: 'background.default', color: 'text.primary', borderBottom: `1px solid ${INK}` }}
      >
        <Toolbar sx={{ gap: { xs: 1, md: 1.5 }, minHeight: { xs: 60, md: 68 }, px: { xs: 2, md: 4 }, maxWidth: 1304, width: '100%', mx: 'auto' }}>
          <Box
            component={RouterLink}
            to="/"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              flexGrow: 1,
              minWidth: 0,
              textDecoration: 'none',
              color: 'inherit',
              borderRadius: '12px',
              '&:focus-visible': { outline: `2px solid ${INK}`, outlineOffset: 4 },
            }}
          >
            {logoUrl ? (
              <Box component="img" src={logoUrl} alt="" sx={{ height: 38, width: 'auto', maxWidth: 120, objectFit: 'contain' }} />
            ) : (
              <WaffleMark />
            )}
            <Typography
              component="span"
              noWrap
              sx={{ fontFamily: (theme) => theme.typography.h6.fontFamily, fontWeight: 900, textTransform: 'uppercase', fontSize: { xs: 20, md: 24 }, letterSpacing: '0.01em' }}
            >
              {restaurant.info?.name}
            </Typography>
          </Box>

          <LanguageSwitcher compact />

          <IconButton
            onClick={onCartOpen}
            aria-label={t('menu.viewCart', { count: cartCount })}
            sx={{ position: 'relative', width: 44, height: 44, borderRadius: '4px', border: `1px solid ${INK}`, ...press, '&:hover': { bgcolor: '#F3E2BD' } }}
          >
            <ShoppingBagOutlinedIcon />
            {cartCount > 0 && (
              <Box
                component="span"
                sx={{
                  position: 'absolute',
                  top: -4,
                  insetInlineEnd: -4,
                  minWidth: 20,
                  height: 20,
                  px: 0.5,
                  borderRadius: '2px',
                  bgcolor: AMBER,
                  color: INK,
                  fontSize: 12,
                  fontWeight: 700,
                  lineHeight: '20px',
                  textAlign: 'center',
                  border: '2px solid',
                  borderColor: 'background.default',
                  boxSizing: 'content-box',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {cartCount}
              </Box>
            )}
          </IconButton>

          {customer ? (
            <>
              <IconButton onClick={handleMenuOpen} aria-label={t('nav.myAccount')} sx={{ p: 0.5, ...press }}>
                <Avatar src={customer.avatar_url} alt={customer.name} sx={{ bgcolor: INK, color: AMBER, width: 36, height: 36, fontWeight: 700 }}>
                  {customer.name?.charAt(0)?.toUpperCase() || '?'}
                </Avatar>
              </IconButton>
              <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
                <MenuItem
                  onClick={() => {
                    handleMenuClose()
                    navigate('/account')
                  }}
                >
                  {t('nav.myAccount')}
                </MenuItem>
                <MenuItem onClick={handleLogout}>{t('nav.logOut')}</MenuItem>
              </Menu>
            </>
          ) : (
            <>
              <IconButton
                onClick={() => setAuthOpen(true)}
                aria-label={t('nav.signIn')}
                sx={{ display: { xs: 'inline-flex', sm: 'none' }, width: 44, height: 44, borderRadius: '4px', bgcolor: INK, color: '#fff', ...press, '&:hover': { bgcolor: '#333' } }}
              >
                <PersonOutlinedIcon />
              </IconButton>
              <Button
                onClick={() => setAuthOpen(true)}
                sx={{
                  display: { xs: 'none', sm: 'inline-flex' },
                  height: 44,
                  px: 2,
                  borderRadius: '4px',
                  textTransform: 'uppercase',
                  fontWeight: 800,
                  letterSpacing: '0.03em',
                  bgcolor: INK,
                  color: '#fff',
                  whiteSpace: 'nowrap',
                  ...press,
                  '&:hover': { bgcolor: '#333' },
                }}
              >
                {t('nav.signIn')}
              </Button>
            </>
          )}
        </Toolbar>
      </AppBar>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  )
}

export default CustomerNav
