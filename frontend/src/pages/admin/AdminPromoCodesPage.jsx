import { useEffect, useState } from 'react'
import {
  Box,
  Typography,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Switch,
  IconButton,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  CircularProgress,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { adminPromoApi } from '../../api'
import { formatCurrency } from '../../utils/format'

const EMPTY_FORM = {
  code: '',
  discount_type: 'percentage',
  value: '',
  description: '',
  max_uses: '',
  max_uses_per_customer: '',
  one_time_use: false,
  expires_at: '',
}

function AdminPromoCodesPage() {
  const { t } = useTranslation()
  const [promoCodes, setPromoCodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const load = () => {
    setLoading(true)
    adminPromoApi
      .list()
      .then((res) => setPromoCodes(res.data))
      .catch(() => toast.error(t('adminPromo.failedToLoadPromoCodes')))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const openAddDialog = () => {
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      await adminPromoApi.create({
        ...form,
        max_uses: form.max_uses === '' ? null : form.max_uses,
        max_uses_per_customer: form.max_uses_per_customer === '' ? null : form.max_uses_per_customer,
        expires_at: form.expires_at || null,
      })
      setDialogOpen(false)
      load()
      toast.success(t('adminPromo.promoCodeCreated'))
    } catch (err) {
      toast.error(err.response?.data?.errors?.join(', ') || t('adminPromo.failedToSavePromoCode'))
    }
  }

  const handleToggle = async (promoCode) => {
    try {
      await adminPromoApi.toggle(promoCode.id)
      load()
    } catch {
      toast.error(t('adminCombo.failedToUpdateStatus'))
    }
  }

  const handleDelete = async (promoCode) => {
    try {
      await adminPromoApi.destroy(promoCode.id)
      load()
    } catch {
      toast.error(t('adminPromo.failedToDeletePromoCode'))
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>
          {t('admin.nav.promoCodes')}
        </Typography>
        <Button variant="contained" onClick={openAddDialog}>
          {t('adminPromo.addPromoCode')}
        </Button>
      </Stack>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('adminPromo.code')}</TableCell>
              <TableCell>{t('adminPromo.type')}</TableCell>
              <TableCell>{t('adminPromo.value')}</TableCell>
              <TableCell>{t('adminMenu.description')}</TableCell>
              <TableCell>{t('adminPromo.uses')}</TableCell>
              <TableCell>{t('adminPromo.expires')}</TableCell>
              <TableCell>{t('adminCombo.status')}</TableCell>
              <TableCell align="right">{t('adminCombo.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {promoCodes.length === 0 && (
              <TableRow>
                <TableCell colSpan={8}>
                  <Typography color="text.secondary">{t('adminPromo.noPromoCodesYet')}</Typography>
                </TableCell>
              </TableRow>
            )}
            {promoCodes.map((promoCode) => (
              <TableRow key={promoCode.id}>
                <TableCell sx={{ fontWeight: 600 }}>{promoCode.code}</TableCell>
                <TableCell>
                  {promoCode.discount_type === 'percentage' ? t('adminCombo.percentage') : t('adminPromo.fixed')}
                </TableCell>
                <TableCell>
                  {promoCode.discount_type === 'percentage'
                    ? `${promoCode.value}%`
                    : formatCurrency(promoCode.value)}
                </TableCell>
                <TableCell>{promoCode.description || '—'}</TableCell>
                <TableCell>
                  {promoCode.usage_count} / {promoCode.max_uses ?? '∞'}
                </TableCell>
                <TableCell>
                  {promoCode.expires_at ? new Date(promoCode.expires_at).toLocaleDateString() : '—'}
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Chip
                      label={promoCode.active ? t('adminCombo.active') : t('adminCombo.inactive')}
                      size="small"
                      color={promoCode.active ? 'primary' : 'default'}
                    />
                    <Switch
                      size="small"
                      checked={promoCode.active}
                      onChange={() => handleToggle(promoCode)}
                    />
                  </Stack>
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => handleDelete(promoCode)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('adminPromo.addPromoCode')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label={t('adminPromo.code')}
              required
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            />
            <FormControl fullWidth>
              <InputLabel>{t('adminPromo.discountType')}</InputLabel>
              <Select
                value={form.discount_type}
                label={t('adminPromo.discountType')}
                onChange={(e) => setForm({ ...form, discount_type: e.target.value })}
              >
                <MenuItem value="percentage">{t('adminCombo.percentage')}</MenuItem>
                <MenuItem value="fixed">{t('adminPromo.fixed')}</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label={t('adminPromo.value')}
              type="number"
              required
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
            />
            <TextField
              label={t('adminMenu.description')}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <TextField
              label={t('adminPromo.maxUses')}
              type="number"
              value={form.max_uses}
              onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
            />
            <TextField
              label={t('adminPromo.maxUsesPerCustomer')}
              type="number"
              value={form.max_uses_per_customer}
              onChange={(e) => setForm({ ...form, max_uses_per_customer: e.target.value })}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={form.one_time_use}
                  onChange={(e) => setForm({ ...form, one_time_use: e.target.checked })}
                />
              }
              label={t('adminPromo.oneTimeUse')}
            />
            <TextField
              label={t('adminPromo.expiresAt')}
              type="date"
              slotProps={{ inputLabel: { shrink: true } }}
              value={form.expires_at}
              onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{t('account.cancel')}</Button>
          <Button variant="contained" onClick={handleSave}>
            {t('account.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default AdminPromoCodesPage
