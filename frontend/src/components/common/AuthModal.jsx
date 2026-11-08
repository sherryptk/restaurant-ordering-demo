import { useState } from 'react'
import { Dialog, DialogTitle, DialogContent, Tabs, Tab, TextField, Button, Box, Alert, Stack, Divider, Typography } from '@mui/material'
import { useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { authApi } from '../../api'
import { setCustomer } from '../../store'

function syncLanguage(i18n, preferredLanguage) {
  if (preferredLanguage && preferredLanguage !== i18n.language) {
    i18n.changeLanguage(preferredLanguage)
  }
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
      <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
      <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18z"/>
      <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
    </svg>
  )
}

function GoogleSignInButton() {
  const { t } = useTranslation()

  return (
    <Button
      fullWidth
      onClick={() => {
        window.location.href = `${API_BASE_URL}/auth/google_oauth2`
      }}
      startIcon={<GoogleIcon />}
      sx={{
        bgcolor: '#fff',
        color: '#3c4043',
        border: '1px solid #dadce0',
        height: 44,
        borderRadius: '4px',
        textTransform: 'none',
        fontWeight: 500,
        '&:hover': { bgcolor: '#f7f8f8' },
      }}
    >
      {t('auth.continueWithGoogle')}
    </Button>
  )
}

function AuthModal({ open, onClose }) {
  const { t, i18n } = useTranslation()
  const dispatch = useDispatch()
  const [tab, setTab] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [signInForm, setSignInForm] = useState({ email: '', password: '' })
  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    password_confirmation: '',
  })

  const handleTabChange = (_e, value) => {
    setTab(value)
    setError('')
  }

  const extractErrorMessage = (err) =>
    err.response?.data?.errors?.join(', ') || t('auth.somethingWentWrong')

  const handleSignIn = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const response = await authApi.login(signInForm)
      const token = response.headers.authorization
      dispatch(setCustomer({ customer: response.data.customer, token }))
      syncLanguage(i18n, response.data.customer.preferred_language)
      onClose()
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const response = await authApi.register({
        ...registerForm,
        preferred_language: i18n.language,
      })
      const token = response.headers.authorization
      dispatch(setCustomer({ customer: response.data.customer, token }))
      onClose()
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('auth.welcome')}</DialogTitle>
      <Tabs value={tab} onChange={handleTabChange} variant="fullWidth">
        <Tab label={t('nav.signIn')} />
        <Tab label={t('auth.createAccount')} />
      </Tabs>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mt: 2 }}>
          <GoogleSignInButton />
        </Box>

        <Divider sx={{ my: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {t('auth.or')}
          </Typography>
        </Divider>

        {tab === 0 ? (
          <Box component="form" onSubmit={handleSignIn}>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label={t('auth.email')}
                type="email"
                required
                value={signInForm.email}
                onChange={(e) => setSignInForm({ ...signInForm, email: e.target.value })}
              />
              <TextField
                label={t('auth.password')}
                type="password"
                required
                value={signInForm.password}
                onChange={(e) => setSignInForm({ ...signInForm, password: e.target.value })}
              />
              <Button type="submit" variant="contained" disabled={loading}>
                {t('nav.signIn')}
              </Button>
            </Stack>
          </Box>
        ) : (
          <Box component="form" onSubmit={handleRegister}>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label={t('auth.name')}
                required
                value={registerForm.name}
                onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
              />
              <TextField
                label={t('auth.email')}
                type="email"
                required
                value={registerForm.email}
                onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
              />
              <TextField
                label={t('auth.phone')}
                value={registerForm.phone}
                onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
              />
              <TextField
                label={t('auth.password')}
                type="password"
                required
                value={registerForm.password}
                onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
              />
              <TextField
                label={t('auth.confirmPassword')}
                type="password"
                required
                value={registerForm.password_confirmation}
                onChange={(e) =>
                  setRegisterForm({ ...registerForm, password_confirmation: e.target.value })
                }
              />
              <Button type="submit" variant="contained" disabled={loading}>
                {t('auth.createAccount')}
              </Button>
            </Stack>
          </Box>
        )}

        <Button fullWidth sx={{ mt: 2 }} onClick={onClose}>
          {t('auth.continueAsGuest')}
        </Button>
      </DialogContent>
    </Dialog>
  )
}

export default AuthModal
