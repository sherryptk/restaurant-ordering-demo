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
  ToggleButtonGroup,
  ToggleButton,
  Autocomplete,
  Divider,
  CircularProgress,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { adminComboApi, adminMenuApi } from '../../api'
import { formatCurrency } from '../../utils/format'

const EMPTY_FORM = {
  name: '',
  name_ar: '',
  description: '',
  description_ar: '',
  discount_type: 'percentage',
  discount_value: '',
  selectedItems: [],
  image: null,
}

function AdminComboDealsPage() {
  const { t } = useTranslation()
  const [comboDeals, setComboDeals] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCombo, setEditingCombo] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [imagePreview, setImagePreview] = useState(null)

  const load = () => {
    setLoading(true)
    adminComboApi
      .list()
      .then((res) => setComboDeals(res.data))
      .catch(() => toast.error(t('adminCombo.failedToLoadComboDeals')))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    adminMenuApi
      .getCategories()
      .then((res) => setMenuItems(res.data.flatMap((category) => category.items || [])))
      .catch(() => {})
  }, [])

  const openAddDialog = () => {
    setEditingCombo(null)
    setForm(EMPTY_FORM)
    setImagePreview(null)
    setDialogOpen(true)
  }

  const openEditDialog = (combo) => {
    setEditingCombo(combo)
    setForm({
      name: combo.name,
      name_ar: combo.name_ar || '',
      description: combo.description || '',
      description_ar: combo.description_ar || '',
      discount_type: combo.discount_type,
      discount_value: combo.discount_value,
      selectedItems: combo.items,
      image: null,
    })
    setImagePreview(combo.image_url || null)
    setDialogOpen(true)
  }

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setForm({ ...form, image: file })
    setImagePreview(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    const payload = {
      name: form.name,
      name_ar: form.name_ar,
      description: form.description,
      description_ar: form.description_ar,
      discount_type: form.discount_type,
      discount_value: form.discount_value,
      menu_item_ids: form.selectedItems.map((item) => item.id),
      image: form.image,
    }

    try {
      if (editingCombo) {
        await adminComboApi.update(editingCombo.id, payload)
        toast.success(t('adminCombo.comboDealUpdated'))
      } else {
        await adminComboApi.create(payload)
        toast.success(t('adminCombo.comboDealCreated'))
      }
      setDialogOpen(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.errors?.join(', ') || t('adminCombo.failedToSaveComboDeal'))
    }
  }

  const handleToggle = async (combo) => {
    try {
      await adminComboApi.toggle(combo.id)
      load()
    } catch {
      toast.error(t('adminCombo.failedToUpdateStatus'))
    }
  }

  const handleDelete = async (combo) => {
    try {
      await adminComboApi.destroy(combo.id)
      toast.success(t('adminCombo.comboDealDeleted'))
      load()
    } catch {
      toast.error(t('adminCombo.failedToDeleteComboDeal'))
    }
  }

  const originalTotal = form.selectedItems.reduce((sum, item) => sum + Number(item.price), 0)
  const discountValueNum = Number(form.discount_value) || 0
  const previewDiscount =
    form.discount_type === 'percentage'
      ? Math.round(((discountValueNum / 100) * originalTotal + Number.EPSILON) * 100) / 100
      : Math.min(discountValueNum, originalTotal)
  const previewFinal = Math.max(originalTotal - previewDiscount, 0)

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
          {t('admin.nav.comboDeals')}
        </Typography>
        <Button variant="contained" onClick={openAddDialog}>
          {t('adminCombo.addComboDeal')}
        </Button>
      </Stack>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('adminMenu.name')}</TableCell>
              <TableCell>{t('checkout.items')}</TableCell>
              <TableCell>{t('adminCombo.original')}</TableCell>
              <TableCell>{t('adminCombo.discounted')}</TableCell>
              <TableCell>{t('checkout.discount')}</TableCell>
              <TableCell>{t('adminCombo.status')}</TableCell>
              <TableCell align="right">{t('adminCombo.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {comboDeals.length === 0 && (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography color="text.secondary">{t('adminCombo.noComboDealsYet')}</Typography>
                </TableCell>
              </TableRow>
            )}
            {comboDeals.map((combo) => (
              <TableRow key={combo.id}>
                <TableCell sx={{ fontWeight: 600 }}>{combo.name}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                    {combo.items.map((item) => (
                      <Chip key={item.id} label={item.name} size="small" />
                    ))}
                  </Stack>
                </TableCell>
                <TableCell sx={{ textDecoration: 'line-through', color: 'text.disabled' }}>
                  {formatCurrency(combo.original_price)}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{formatCurrency(combo.discounted_price)}</TableCell>
                <TableCell>
                  <Chip
                    label={
                      combo.discount_type === 'percentage'
                        ? t('adminCombo.percentOff', { value: combo.discount_value })
                        : t('adminCombo.amountOff', { value: formatCurrency(combo.discount_value) })
                    }
                    size="small"
                    color="secondary"
                  />
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Chip
                      label={combo.active ? t('adminCombo.active') : t('adminCombo.inactive')}
                      size="small"
                      color={combo.active ? 'primary' : 'default'}
                    />
                    <Switch size="small" checked={combo.active} onChange={() => handleToggle(combo)} />
                  </Stack>
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => openEditDialog(combo)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(combo)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingCombo ? t('adminCombo.editComboDeal') : t('adminCombo.addComboDeal')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {imagePreview && (
              <Box component="img" src={imagePreview} sx={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 1 }} />
            )}
            <Button component="label">
              {t('adminMenu.uploadImage')}
              <input type="file" accept="image/*" hidden onChange={handleImageChange} />
            </Button>
            <TextField
              label={t('adminMenu.name')}
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <TextField
              label={t('adminMenu.nameArabic')}
              value={form.name_ar}
              onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
              slotProps={{ htmlInput: { dir: 'rtl' } }}
            />
            <TextField
              label={t('adminMenu.description')}
              multiline
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <TextField
              label={t('adminMenu.descriptionArabic')}
              multiline
              rows={2}
              value={form.description_ar}
              onChange={(e) => setForm({ ...form, description_ar: e.target.value })}
              slotProps={{ htmlInput: { dir: 'rtl' } }}
            />
            <Autocomplete
              multiple
              options={menuItems}
              value={form.selectedItems}
              onChange={(_e, newValue) => setForm({ ...form, selectedItems: newValue })}
              getOptionLabel={(item) => `${item.name} — ${formatCurrency(item.price)}`}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderTags={(selected, getTagProps) =>
                selected.map((item, index) => {
                  const { key, ...tagProps } = getTagProps({ index })
                  return <Chip key={item.id} label={item.name} {...tagProps} />
                })
              }
              renderInput={(params) => (
                <TextField {...params} label={t('checkout.items')} placeholder={t('adminCombo.searchMenuItems')} />
              )}
            />
            <ToggleButtonGroup
              exclusive
              fullWidth
              value={form.discount_type}
              onChange={(_e, value) => value && setForm({ ...form, discount_type: value })}
            >
              <ToggleButton value="percentage">{t('adminCombo.percentage')}</ToggleButton>
              <ToggleButton value="fixed">{t('adminCombo.fixedAmount')}</ToggleButton>
            </ToggleButtonGroup>
            <TextField
              label={form.discount_type === 'percentage' ? t('adminCombo.discountPercent') : t('adminCombo.discountAmount')}
              type="number"
              required
              value={form.discount_value}
              onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
            />

            {form.selectedItems.length > 0 && (
              <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {t('adminCombo.preview')}
                </Typography>
                <Stack spacing={0.5}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('adminCombo.originalTotal')}
                    </Typography>
                    <Typography variant="body2" sx={{ textDecoration: 'line-through' }}>
                      {formatCurrency(originalTotal)}
                    </Typography>
                  </Stack>
                  <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="success.main">
                      {t('checkout.discount')}
                    </Typography>
                    <Typography variant="body2" color="success.main">
                      -{formatCurrency(previewDiscount)}
                    </Typography>
                  </Stack>
                  <Divider sx={{ my: 0.5 }} />
                  <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Typography fontWeight={700}>{t('adminCombo.finalPrice')}</Typography>
                    <Typography fontWeight={700}>{formatCurrency(previewFinal)}</Typography>
                  </Stack>
                </Stack>
              </Box>
            )}
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

export default AdminComboDealsPage
