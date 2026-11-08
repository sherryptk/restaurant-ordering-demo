import { useState } from 'react'
import { Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  IconButton,
  AppBar,
  useMediaQuery,
  Button,
  Divider,
  Chip,
  Stack,
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu'
import LocalOfferIcon from '@mui/icons-material/LocalOffer'
import SellIcon from '@mui/icons-material/Sell'
import SettingsIcon from '@mui/icons-material/Settings'
import PeopleIcon from '@mui/icons-material/People'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import LogoutIcon from '@mui/icons-material/Logout'
import PointOfSaleIcon from '@mui/icons-material/PointOfSale'
import BadgeIcon from '@mui/icons-material/Badge'
import EventNoteIcon from '@mui/icons-material/EventNote'
import PaymentsIcon from '@mui/icons-material/Payments'
import AssessmentIcon from '@mui/icons-material/Assessment'
import { useTheme } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'
import { selectAuth, selectAdminRole, selectAdminBranchName, logoutAdmin } from '../../store'
import { adminAuthApi } from '../../api'
import LanguageSwitcher from '../common/LanguageSwitcher'
import NewOrderAlarm from './NewOrderAlarm'

function getNavItems(t) {
  return [
    { label: t('admin.nav.orders'), path: '/admin/orders', icon: <ReceiptLongIcon /> },
    { label: t('admin.nav.menu'), path: '/admin/menu', icon: <RestaurantMenuIcon />, roles: ['admin', 'operator'] },
    { label: t('admin.nav.branches'), path: '/admin/branches', icon: <LocationOnIcon />, roles: ['admin'] },
    { label: t('admin.nav.comboDeals'), path: '/admin/combo-deals', icon: <SellIcon />, roles: ['admin'] },
    { label: t('admin.nav.promoCodes'), path: '/admin/promo-codes', icon: <LocalOfferIcon />, roles: ['admin'] },
    {
      label: t('admin.nav.cashDrawer'),
      path: '/admin/cash-drawer',
      icon: <PointOfSaleIcon />,
      roles: ['admin', 'operator'],
    },
    { label: t('admin.nav.employees'), path: '/admin/employees', icon: <BadgeIcon />, roles: ['admin'] },
    {
      label: t('admin.nav.timesheets'),
      path: '/admin/timesheets',
      icon: <EventNoteIcon />,
      roles: ['admin', 'operator'],
    },
    { label: t('admin.nav.ledger'), path: '/admin/ledger', icon: <PaymentsIcon />, roles: ['admin'] },
    {
      label: t('admin.nav.monthlySummary'),
      path: '/admin/monthly-summary',
      icon: <AssessmentIcon />,
      roles: ['admin'],
    },
    { label: t('admin.nav.settings'), path: '/admin/settings', icon: <SettingsIcon />, roles: ['admin'] },
    { label: t('admin.nav.users'), path: '/admin/users', icon: <PeopleIcon />, roles: ['admin'] },
  ]
}

const ROLE_BADGE_COLOR = { admin: 'error', operator: 'primary', driver: 'success' }

const DRAWER_WIDTH = 240

function AdminLayout() {
  const { t } = useTranslation()
  const { adminToken } = useSelector(selectAuth)
  const adminRole = useSelector(selectAdminRole)
  const adminName = useSelector((state) => state.auth.adminName)
  const adminBranchName = useSelector(selectAdminBranchName)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))
  const [mobileOpen, setMobileOpen] = useState(false)

  if (!adminToken) {
    return <Navigate to="/admin/login" replace />
  }

  const handleLogout = async () => {
    try {
      await adminAuthApi.logout()
    } catch {
      // ignore network errors — clear local state regardless
    }
    dispatch(logoutAdmin())
    navigate('/admin/login')
  }

  const visibleNavItems = getNavItems(t).filter((item) => !item.roles || item.roles.includes(adminRole))

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Typography variant="h6" fontWeight={700}>
          {t('admin.nav.title')}
        </Typography>
        <LanguageSwitcher size="small" />
      </Toolbar>
      <Divider />
      <List sx={{ flex: 1 }}>
        {visibleNavItems.map((item) => {
          const active = location.pathname.startsWith(item.path)
          return (
            <ListItemButton
              key={item.path}
              selected={active}
              onClick={() => {
                navigate(item.path)
                setMobileOpen(false)
              }}
              sx={{
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'white',
                  '& .MuiListItemIcon-root': { color: 'white' },
                  '&:hover': { bgcolor: 'primary.main' },
                },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          )
        })}
      </List>
      <Divider />
      <Box sx={{ p: 2 }}>
        <Stack spacing={0.5} sx={{ mb: 1.5 }}>
          <Typography variant="body2" fontWeight={600} noWrap>
            {adminName || t('admin.nav.title')}
          </Typography>
          {adminRole && (
            <Chip
              label={adminRole}
              size="small"
              color={ROLE_BADGE_COLOR[adminRole] || 'default'}
              sx={{ width: 'fit-content', textTransform: 'capitalize' }}
            />
          )}
          {adminBranchName && (
            <Typography variant="caption" color="text.secondary" noWrap>
              {adminBranchName}
            </Typography>
          )}
        </Stack>
        <Button fullWidth startIcon={<LogoutIcon />} onClick={handleLogout}>
          {t('nav.logOut')}
        </Button>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex' }}>
      <NewOrderAlarm />
      {!isDesktop && (
        <AppBar position="fixed" color="default" elevation={1}>
          <Toolbar>
            <IconButton edge="start" onClick={() => setMobileOpen(true)}>
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" sx={{ ml: 1, flexGrow: 1 }}>
              {t('admin.nav.title')}
            </Typography>
            <LanguageSwitcher size="small" />
          </Toolbar>
        </AppBar>
      )}

      {isDesktop ? (
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
          }}
        >
          {drawerContent}
        </Drawer>
      ) : (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
        >
          {drawerContent}
        </Drawer>
      )}

      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, p: 3, mt: isDesktop ? 0 : 8, width: '100%' }}>
        <Outlet />
      </Box>
    </Box>
  )
}

export default AdminLayout
