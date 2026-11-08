import { useEffect, useState } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  TextField,
  Switch,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  CircularProgress,
} from '@mui/material'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { adminSettingsApi } from '../../api'

function ImageUploadField({ label, hint, imageUrl, uploading, onUpload, width, height }) {
  const { t } = useTranslation()
  const handleChange = (e) => {
    const file = e.target.files?.[0]
    if (file) onUpload(file)
    e.target.value = ''
  }

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        {label}
      </Typography>
      <Box
        sx={{
          position: 'relative',
          width,
          height,
          borderRadius: 1,
          overflow: 'hidden',
          mb: 1,
          ...(imageUrl
            ? { backgroundImage: `url(${imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : {
                border: '2px dashed',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'background.default',
              }),
        }}
      >
        {!imageUrl && (
          <Typography variant="body2" color="text.secondary">
            {t('adminSettings.noImageUploaded')}
          </Typography>
        )}
        {uploading && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              bgcolor: 'rgba(255, 255, 255, 0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CircularProgress size={28} />
          </Box>
        )}
      </Box>
      <Button component="label" size="small" disabled={uploading}>
        {t('adminSettings.uploadLabel', { label })}
        <input type="file" accept="image/*" hidden onChange={handleChange} />
      </Button>
      {hint && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          {hint}
        </Typography>
      )}
    </Box>
  )
}

function getGatewayFields(t) {
  return {
    paymob: [
      { key: 'api_key', label: t('adminSettings.apiKey') },
      { key: 'hmac_secret', label: t('adminSettings.hmacSecret') },
      { key: 'iframe_id', label: t('adminSettings.iframeId') },
      { key: 'integration_id', label: t('adminSettings.integrationId') },
    ],
    kashier: [
      { key: 'merchant_id', label: t('adminSettings.merchantId') },
      { key: 'hash_secret', label: t('adminSettings.hashSecret') },
    ],
  }
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function AdminSettingsPage() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedKeys, setSavedKeys] = useState([])
  const [form, setForm] = useState(null)
  const [paymentConfigForm, setPaymentConfigForm] = useState({})
  const [bannerUploading, setBannerUploading] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)

  useEffect(() => {
    adminSettingsApi
      .get()
      .then((res) => {
        setForm(res.data)
        setSavedKeys(res.data.payment_config_keys || [])
      })
      .catch(() => toast.error(t('adminSettings.failedToLoadSettings')))
      .finally(() => setLoading(false))
  }, [])

  const update = (key, value) => setForm({ ...form, [key]: value })

  const handleSave = async () => {
    setSaving(true)
    try {
      const nonEmptyConfig = Object.fromEntries(
        Object.entries(paymentConfigForm).filter(([, value]) => value !== '' && value != null)
      )

      const { payment_config_keys, id, slug, ...editable } = form

      const res = await adminSettingsApi.update({
        ...editable,
        payment_config: nonEmptyConfig,
      })

      setForm(res.data)
      setSavedKeys(res.data.payment_config_keys || [])
      setPaymentConfigForm({})
      toast.success(t('adminSettings.settingsSaved'))
    } catch (err) {
      toast.error(err.response?.data?.errors?.join(', ') || t('adminSettings.failedToSaveSettings'))
    } finally {
      setSaving(false)
    }
  }

  const handleBannerUpload = async (file) => {
    setBannerUploading(true)
    try {
      const res = await adminSettingsApi.uploadBanner(file)
      setForm((prev) => ({ ...prev, banner_url: res.data.banner_url }))
      toast.success(t('adminSettings.bannerUploaded'))
    } catch (err) {
      toast.error(err.response?.data?.errors?.join(', ') || t('adminSettings.failedToUploadBanner'))
    } finally {
      setBannerUploading(false)
    }
  }

  const handleLogoUpload = async (file) => {
    setLogoUploading(true)
    try {
      const res = await adminSettingsApi.uploadLogo(file)
      setForm((prev) => ({ ...prev, logo_url: res.data.logo_url }))
      toast.success(t('adminSettings.logoUploaded'))
    } catch (err) {
      toast.error(err.response?.data?.errors?.join(', ') || t('adminSettings.failedToUploadLogo'))
    } finally {
      setLogoUploading(false)
    }
  }

  if (loading || !form) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  const gatewayFields = getGatewayFields(t)[form.payment_gateway] || []
  const webhookUrl =
    form.payment_gateway !== 'cash'
      ? `${API_BASE_URL}/api/v1/payments/${form.payment_gateway}/callback`
      : null

  return (
    <Box sx={{ maxWidth: 700 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>
          {t('admin.nav.settings')}
        </Typography>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {t('adminSettings.saveChanges')}
        </Button>
      </Stack>

      <Stack spacing={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              {t('adminSettings.branding')}
            </Typography>
            <Stack spacing={3}>
              <ImageUploadField
                label={t('adminSettings.banner')}
                hint={t('adminSettings.bannerHint')}
                imageUrl={form.banner_url}
                uploading={bannerUploading}
                onUpload={handleBannerUpload}
                width="100%"
                height={160}
              />
              <ImageUploadField
                label={t('adminSettings.logo')}
                imageUrl={form.logo_url}
                uploading={logoUploading}
                onUpload={handleLogoUpload}
                width={120}
                height={120}
              />
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              {t('adminSettings.restaurantInfo')}
            </Typography>
            <Stack spacing={2}>
              <TextField label={t('adminMenu.name')} value={form.name || ''} onChange={(e) => update('name', e.target.value)} />
              <TextField
                label={t('adminMenu.nameArabic')}
                value={form.name_ar || ''}
                onChange={(e) => update('name_ar', e.target.value)}
                slotProps={{ htmlInput: { dir: 'rtl' } }}
              />
              <TextField label={t('auth.phone')} value={form.phone || ''} onChange={(e) => update('phone', e.target.value)} />
              <TextField
                label={t('adminMenu.description')}
                multiline
                rows={2}
                value={form.description || ''}
                onChange={(e) => update('description', e.target.value)}
              />
              <TextField
                label={t('adminMenu.descriptionArabic')}
                multiline
                rows={2}
                value={form.description_ar || ''}
                onChange={(e) => update('description_ar', e.target.value)}
                slotProps={{ htmlInput: { dir: 'rtl' } }}
              />
              <TextField label={t('adminSettings.address')} value={form.address || ''} onChange={(e) => update('address', e.target.value)} />
              <TextField label={t('checkout.city')} value={form.city || ''} onChange={(e) => update('city', e.target.value)} />
              <TextField label={t('auth.email')} value={form.email || ''} onChange={(e) => update('email', e.target.value)} />
              <TextField
                label={t('adminSettings.timezone')}
                value={form.timezone || ''}
                onChange={(e) => update('timezone', e.target.value)}
              />
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              {t('adminSettings.orderSettings')}
            </Typography>
            <Stack spacing={2}>
              <FormControlLabel
                control={<Switch checked={form.is_open} onChange={(e) => update('is_open', e.target.checked)} />}
                label={t('adminSettings.restaurantOpen')}
              />
              <FormControlLabel
                control={
                  <Switch checked={form.accepts_pickup} onChange={(e) => update('accepts_pickup', e.target.checked)} />
                }
                label={t('adminSettings.acceptsPickup')}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={form.accepts_delivery}
                    onChange={(e) => update('accepts_delivery', e.target.checked)}
                  />
                }
                label={t('adminSettings.acceptsDelivery')}
              />
              <TextField
                label={t('adminSettings.pickupTimeEstimate')}
                type="number"
                value={form.estimated_pickup_minutes || ''}
                onChange={(e) => update('estimated_pickup_minutes', e.target.value)}
              />
              <TextField
                label={t('adminSettings.deliveryTimeEstimate')}
                type="number"
                value={form.estimated_delivery_minutes || ''}
                onChange={(e) => update('estimated_delivery_minutes', e.target.value)}
              />
              <TextField
                label={t('cart.deliveryFee')}
                type="number"
                value={form.delivery_fee || ''}
                onChange={(e) => update('delivery_fee', e.target.value)}
              />
              <TextField
                label={t('adminSettings.minOrderAmount')}
                type="number"
                value={form.min_order_amount || ''}
                onChange={(e) => update('min_order_amount', e.target.value)}
              />
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              {t('adminSettings.vatTax')}
            </Typography>
            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.vat_rate != null}
                    onChange={(e) => update('vat_rate', e.target.checked ? 14 : null)}
                  />
                }
                label={t('adminSettings.chargeVat')}
              />
              {form.vat_rate != null && (
                <TextField
                  label={t('adminSettings.vatRatePercent')}
                  type="number"
                  value={form.vat_rate}
                  onChange={(e) => update('vat_rate', e.target.value)}
                  inputProps={{ min: 0, max: 100 }}
                />
              )}
              <Typography variant="caption" color="text.secondary">
                {t('adminSettings.vatNote')}
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              {t('adminSettings.paymentGateway')}
            </Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>{t('adminSettings.gateway')}</InputLabel>
              <Select
                value={form.payment_gateway || 'cash'}
                label={t('adminSettings.gateway')}
                onChange={(e) => update('payment_gateway', e.target.value)}
              >
                <MenuItem value="cash">{t('orderStatus.cash')}</MenuItem>
                <MenuItem value="paymob">{t('orderStatus.paymob')}</MenuItem>
                <MenuItem value="kashier">{t('orderStatus.kashier')}</MenuItem>
              </Select>
            </FormControl>

            {gatewayFields.length > 0 && (
              <Stack spacing={2}>
                {savedKeys.length > 0 && (
                  <Typography variant="caption" color="text.secondary">
                    {t('adminSettings.currentlySaved', { keys: savedKeys.join(', ') })}
                  </Typography>
                )}
                {gatewayFields.map((field) => (
                  <TextField
                    key={field.key}
                    label={field.label}
                    type="password"
                    placeholder={savedKeys.includes(field.key) ? '••••••••' : ''}
                    value={paymentConfigForm[field.key] || ''}
                    onChange={(e) =>
                      setPaymentConfigForm({ ...paymentConfigForm, [field.key]: e.target.value })
                    }
                  />
                ))}
                {webhookUrl && (
                  <TextField label={t('adminSettings.webhookUrl')} value={webhookUrl} InputProps={{ readOnly: true }} />
                )}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Stack>
    </Box>
  )
}

export default AdminSettingsPage
