import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Box, Card, CardContent, Typography, TextField, Button, Stack, Alert } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { adminAuthApi } from '../../api'
import { setAdmin } from '../../store'
import LanguageSwitcher from '../../components/common/LanguageSwitcher'

function AdminLoginPage() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const response = await adminAuthApi.login({ email, password })
      const token = response.headers.authorization
      const { admin } = response.data
      dispatch(
        setAdmin({ admin, token, role: admin.role, name: admin.name, phone: admin.phone, branchName: admin.branch_name })
      )
      navigate(admin.role === 'driver' ? '/admin/driver' : '/admin/orders')
    } catch (err) {
      const status = err.response?.status
      if (!err.response) setError(t('adminLogin.networkError'))
      else if (status === 401 || status === 422) setError(t('adminLogin.invalidCredentials'))
      else if (status === 429) setError(t('adminLogin.tooManyAttempts'))
      else if (status >= 500) setError(t('adminLogin.serverError'))
      else setError(err.response?.data?.errors?.join(', ') || t('adminLogin.loginFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
      }}
    >
      <Card sx={{ width: 360 }}>
        <CardContent sx={{ p: 4 }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" fontWeight={700}>
              {t('adminLogin.title')}
            </Typography>
            <LanguageSwitcher size="small" />
          </Stack>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <TextField
                label={t('auth.email')}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <TextField
                label={t('auth.password')}
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button type="submit" variant="contained" disabled={loading}>
                {t('nav.signIn')}
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}

export default AdminLoginPage
