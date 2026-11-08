import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Provider, useDispatch, useSelector } from 'react-redux'
import { ThemeProvider, CssBaseline, Box, CircularProgress } from '@mui/material'
import { CacheProvider } from '@emotion/react'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import toast, { Toaster } from 'react-hot-toast'
import store, { selectRestaurant, selectAuth, setCustomer, logoutCustomer, setRestaurantData } from './store'
import getTheme from './theme'
import getCustomerTheme from './theme/customer'
import { ltrCache, rtlCache } from './theme/rtlCache'
import { authApi, menuApi } from './api'
import CustomerNav from './components/common/CustomerNav'
import Footer from './components/common/Footer'
import CartDrawer from './components/cart/CartDrawer'
import AdminLayout from './components/admin/AdminLayout'
import ErrorBoundary from './components/common/ErrorBoundary'

const MenuPage = lazy(() => import('./pages/customer/MenuPage'))
const CheckoutPage = lazy(() => import('./pages/customer/CheckoutPage'))
const OrderStatusPage = lazy(() => import('./pages/customer/OrderStatusPage'))
const AccountPage = lazy(() => import('./pages/customer/AccountPage'))
const AdminLoginPage = lazy(() => import('./pages/admin/AdminLoginPage'))
const AdminOrdersPage = lazy(() => import('./pages/admin/AdminOrdersPage'))
const AdminMenuPage = lazy(() => import('./pages/admin/AdminMenuPage'))
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage'))
const AdminPromoCodesPage = lazy(() => import('./pages/admin/AdminPromoCodesPage'))
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'))
const DriverPortalPage = lazy(() => import('./pages/admin/DriverPortalPage'))
const AdminComboDealsPage = lazy(() => import('./pages/admin/AdminComboDealsPage'))
const AdminBranchesPage = lazy(() => import('./pages/admin/AdminBranchesPage'))
const AdminCashDrawerPage = lazy(() => import('./pages/admin/AdminCashDrawerPage'))
const AdminEmployeesPage = lazy(() => import('./pages/admin/AdminEmployeesPage'))
const AdminTimesheetsPage = lazy(() => import('./pages/admin/AdminTimesheetsPage'))
const AdminLedgerPage = lazy(() => import('./pages/admin/AdminLedgerPage'))
const AdminMonthlySummaryPage = lazy(() => import('./pages/admin/AdminMonthlySummaryPage'))
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'))

function LoadingFallback() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
      <CircularProgress />
    </Box>
  )
}

function OAuthCallbackHandler() {
  const { t, i18n } = useTranslation()
  const dispatch = useDispatch()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('oauth_token')
    const name = params.get('oauth_name')
    const email = params.get('oauth_email')
    const avatar = params.get('oauth_avatar')
    const lang = params.get('oauth_lang')
    const error = params.get('oauth_error')

    if (token) {
      dispatch(setCustomer({
        customer: { name, email, avatar_url: avatar, preferred_language: lang },
        token
      }))
      if (lang && lang !== i18n.language) i18n.changeLanguage(lang)
      toast.success(t('auth.welcomeUser', { name }))
      window.history.replaceState({}, '', '/')
    }
    if (error) {
      toast.error(t('auth.signInFailed'))
      window.history.replaceState({}, '', '/')
    }
  }, [t, i18n, dispatch])

  return null
}

function CustomerSessionBootstrap() {
  const dispatch = useDispatch()
  const { i18n } = useTranslation()
  const { customer, token } = useSelector(selectAuth)

  useEffect(() => {
    if (!token || customer) return

    authApi
      .me()
      .then((res) => {
        dispatch(setCustomer({ customer: res.data, token }))
        if (res.data.preferred_language && res.data.preferred_language !== i18n.language) {
          i18n.changeLanguage(res.data.preferred_language)
        }
      })
      .catch(() => dispatch(logoutCustomer()))
  }, [token, customer, dispatch, i18n])

  return null
}

function CustomerLayout() {
  const { i18n } = useTranslation()
  const customerTheme = useMemo(() => getCustomerTheme(i18n.language === 'ar' ? 'rtl' : 'ltr'), [i18n.language])
  const [cartOpen, setCartOpen] = useState(false)
  const dispatch = useDispatch()
  const restaurant = useSelector(selectRestaurant)
  const onMenuRoute = useLocation().pathname === '/'

  useEffect(() => {
    // MenuPage fetches its own branch-aware copy of this, but every other
    // customer route (account, checkout, order status) renders CustomerNav
    // without ever populating restaurant.info first — leaving the header's
    // restaurant name blank until the menu page happens to load it.
    // (the menu route is skipped: MenuPage loads the menu itself, so this was a duplicate request)
    if (restaurant.info || onMenuRoute) return

    menuApi
      .getMenu()
      .then((res) => dispatch(setRestaurantData(res.data)))
      .catch(() => {})
  }, [restaurant.info, onMenuRoute, dispatch])

  return (
    <ThemeProvider theme={customerTheme}>
      <CustomerNav onCartOpen={() => setCartOpen(true)} />
      <Outlet context={{ openCart: () => setCartOpen(true) }} />
      <Footer />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} restaurant={restaurant.info} />
    </ThemeProvider>
  )
}

function App() {
  const { i18n } = useTranslation()
  const direction = i18n.language === 'ar' ? 'rtl' : 'ltr'
  const theme = useMemo(() => getTheme(direction), [direction])
  const cache = direction === 'rtl' ? rtlCache : ltrCache

  return (
    <CacheProvider value={cache}>
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Toaster
            position="top-right"
            toastOptions={{ style: { borderRadius: 4, border: '1px solid #1A1A1A', boxShadow: 'none', fontWeight: 600 } }}
          />
          <OAuthCallbackHandler />
          <CustomerSessionBootstrap />
          <BrowserRouter>
            <ErrorBoundary>
              <Suspense fallback={<LoadingFallback />}>
                <Routes>
                  <Route element={<CustomerLayout />}>
                    <Route path="/" element={<MenuPage />} />
                    <Route path="/checkout" element={<CheckoutPage />} />
                    <Route path="/orders/:id" element={<OrderStatusPage />} />
                    <Route path="/account" element={<AccountPage />} />
                  </Route>

                  <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />

                  <Route path="/admin/login" element={<AdminLoginPage />} />

                  <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<Navigate to="/admin/orders" replace />} />
                    <Route path="orders" element={<AdminOrdersPage />} />
                    <Route path="menu" element={<AdminMenuPage />} />
                    <Route path="promo-codes" element={<AdminPromoCodesPage />} />
                    <Route path="settings" element={<AdminSettingsPage />} />
                    <Route path="users" element={<AdminUsersPage />} />
                    <Route path="driver" element={<DriverPortalPage />} />
                    <Route path="combo-deals" element={<AdminComboDealsPage />} />
                    <Route path="branches" element={<AdminBranchesPage />} />
                    <Route path="cash-drawer" element={<AdminCashDrawerPage />} />
                    <Route path="employees" element={<AdminEmployeesPage />} />
                    <Route path="timesheets" element={<AdminTimesheetsPage />} />
                    <Route path="ledger" element={<AdminLedgerPage />} />
                    <Route path="monthly-summary" element={<AdminMonthlySummaryPage />} />
                  </Route>
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </BrowserRouter>
        </ThemeProvider>
      </Provider>
    </CacheProvider>
  )
}

export default App
