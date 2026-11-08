import { useEffect, useRef, useState } from 'react'
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Button,
  Card,
  CardMedia,
  CardContent,
  Stack,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Collapse,
  Divider,
  CircularProgress,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  ListSubheader,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import TuneIcon from '@mui/icons-material/Tune'
import CloseIcon from '@mui/icons-material/Close'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import SwapVertIcon from '@mui/icons-material/SwapVert'
import EditNoteIcon from '@mui/icons-material/EditNote'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { adminMenuApi } from '../../api'
import { formatCurrency } from '../../utils/format'
import ItemOptionsEditor from '../../components/admin/ItemOptionsEditor'
import ReorderCategoriesDialog from '../../components/admin/ReorderCategoriesDialog'
import MenuCsvDialog from '../../components/admin/MenuCsvDialog'
import BulkEditMenuDialog from '../../components/admin/BulkEditMenuDialog'
import { buildMenuCsv, downloadTextFile } from '../../utils/menuCsv'
import DataToggle from '../../dev/DataToggle'

const CSV_TEMPLATE_HEADER = 'item_name,option_name,required,multi_select,max_selections,choice_label,price_delta\n'

function localized(record, field, language) {
  if (language === 'ar') return record[`${field}_ar`] || record[field]
  return record[field]
}

const EMPTY_CATEGORY = { name: '', name_ar: '', description: '', description_ar: '', visible: true }
const EMPTY_ITEM = {
  name: '',
  name_ar: '',
  description: '',
  description_ar: '',
  price: '',
  available: true,
  featured: false,
  tags: '',
  image: null,
  on_offer: false,
  compare_at_price: '',
  offer_badge: '',
}

function CategoryAccordion({
  category,
  isOperator,
  onEditCategory,
  onDeleteCategory,
  onAddItem,
  onEditItem,
  onOpenOptions,
  onDeleteItem,
  onToggleAvailability,
}) {
  const { t, i18n } = useTranslation()

  return (
    <Box>
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', width: '100%', pr: 2 }}>
            <Typography fontWeight={600}>
              {localized(category, 'name', i18n.language)} ({category.item_count})
            </Typography>
            {!isOperator && (
              <Stack direction="row" spacing={0.5}>
                <IconButton size="small" onClick={(e) => onEditCategory(category, e)}>
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={(e) => onDeleteCategory(category, e)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Stack>
            )}
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          {!isOperator && (
            <Button size="small" sx={{ mb: 2 }} onClick={() => onAddItem(category.id)}>
              {t('adminMenu.addItem')}
            </Button>
          )}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 2 }}>
            {(category.items || []).map((item) => (
              <Card key={item.id}>
                {item.image_url && (
                  <CardMedia component="img" height="120" image={item.image_url} alt={localized(item, 'name', i18n.language)} />
                )}
                <CardContent>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography fontWeight={600}>{localized(item, 'name', i18n.language)}</Typography>
                    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                      {item.options_count > 0 && (
                        <Chip label={t('adminMenu.optionsCount', { count: item.options_count })} size="small" />
                      )}
                      {item.compare_at_price && (
                        <Chip label={item.offer_badge || t('adminMenu.onOffer')} size="small" color="secondary" />
                      )}
                    </Stack>
                  </Stack>
                  <Typography color="primary.main" fontWeight={700} sx={{ mt: 0.5 }}>
                    {formatCurrency(item.price)}
                  </Typography>
                  <FormControlLabel
                    control={<Switch checked={item.available} onChange={() => onToggleAvailability(item)} />}
                    label={t('adminMenu.available')}
                    sx={{ mt: 1 }}
                  />
                  {!isOperator && (
                    <Stack direction="row" spacing={0.5} sx={{ mt: 1 }}>
                      <IconButton size="small" onClick={() => onEditItem(item, category.id)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => onOpenOptions(item)} title={t('adminMenu.optionsAndExtras')}>
                        <TuneIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => onDeleteItem(item)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  )}
                </CardContent>
              </Card>
            ))}
          </Box>
        </AccordionDetails>
      </Accordion>
    </Box>
  )
}

function AdminMenuPage() {
  const { t, i18n } = useTranslation()
  const adminRole = localStorage.getItem('admin_role')
  const isOperator = adminRole === 'operator'

  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [categoryForm, setCategoryForm] = useState(EMPTY_CATEGORY)

  const [itemDialogOpen, setItemDialogOpen] = useState(false)
  const [itemCategoryId, setItemCategoryId] = useState(null)
  const [editingItem, setEditingItem] = useState(null)
  const [itemForm, setItemForm] = useState(EMPTY_ITEM)
  const [imagePreview, setImagePreview] = useState(null)

  const [optionsItem, setOptionsItem] = useState(null)
  const [importing, setImporting] = useState(false)
  const [reorderDialogOpen, setReorderDialogOpen] = useState(false)
  const [csvDialogOpen, setCsvDialogOpen] = useState(false)
  const [csvMenuAnchor, setCsvMenuAnchor] = useState(null)
  const [bulkOpen, setBulkOpen] = useState(false)
  const optionsFileInput = useRef(null)

  const loadCategories = () => {
    // Dev only: ?data=worst|empty|one|huge swaps in stress-test fixtures (see src/dev).
    const fixtureMode = import.meta.env.DEV && new URLSearchParams(window.location.search).get('data')
    if (fixtureMode) {
      import('../../dev/menuFixtures').then((m) => {
        setCategories(m.fixtureFor(fixtureMode) || [])
        setLoading(false)
      })
      return
    }
    setLoading(true)
    adminMenuApi
      .getCategories()
      .then((res) => setCategories(res.data))
      .catch(() => toast.error(t('adminMenu.failedToLoadMenu')))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadCategories()
  }, [])

  const openAddCategory = () => {
    setEditingCategory(null)
    setCategoryForm(EMPTY_CATEGORY)
    setCategoryDialogOpen(true)
  }

  const openEditCategory = (category, e) => {
    e.stopPropagation()
    setEditingCategory(category)
    setCategoryForm({
      name: category.name,
      name_ar: category.name_ar || '',
      description: category.description || '',
      description_ar: category.description_ar || '',
      visible: category.visible,
    })
    setCategoryDialogOpen(true)
  }

  const handleCategorySave = async () => {
    try {
      if (editingCategory) {
        await adminMenuApi.updateCategory(editingCategory.id, categoryForm)
      } else {
        await adminMenuApi.createCategory(categoryForm)
      }
      setCategoryDialogOpen(false)
      loadCategories()
    } catch (err) {
      toast.error(err.response?.data?.errors?.join(', ') || t('adminMenu.failedToSaveCategory'))
    }
  }

  const handleCategoryDelete = async (category, e) => {
    e.stopPropagation()
    try {
      await adminMenuApi.deleteCategory(category.id)
      loadCategories()
    } catch {
      toast.error(t('adminMenu.failedToDeleteCategory'))
    }
  }

  const openAddItem = (categoryId) => {
    setItemCategoryId(categoryId)
    setEditingItem(null)
    setItemForm(EMPTY_ITEM)
    setImagePreview(null)
    setItemDialogOpen(true)
  }

  const openEditItem = (item, categoryId) => {
    setItemCategoryId(categoryId)
    setEditingItem(item)
    setItemForm({
      name: item.name,
      name_ar: item.name_ar || '',
      description: item.description || '',
      description_ar: item.description_ar || '',
      price: item.price,
      available: item.available,
      featured: item.featured,
      tags: (item.tags || []).join(', '),
      image: null,
      on_offer: Boolean(item.compare_at_price),
      compare_at_price: item.compare_at_price || '',
      offer_badge: item.offer_badge || '',
    })
    setImagePreview(item.image_url || null)
    setItemDialogOpen(true)
  }

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setItemForm({ ...itemForm, image: file })
    setImagePreview(URL.createObjectURL(file))
  }

  const handleItemSave = async () => {
    const { on_offer, ...rest } = itemForm
    const payload = {
      ...rest,
      tags: itemForm.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      compare_at_price: on_offer ? itemForm.compare_at_price || null : null,
      offer_badge: on_offer ? itemForm.offer_badge || null : null,
    }
    if (!payload.image) delete payload.image

    try {
      if (editingItem) {
        await adminMenuApi.updateItem(editingItem.id, payload)
      } else {
        await adminMenuApi.createItem(itemCategoryId, payload)
      }
      setItemDialogOpen(false)
      loadCategories()
    } catch (err) {
      toast.error(err.response?.data?.errors?.join(', ') || t('adminMenu.failedToSaveItem'))
    }
  }

  const handleItemDelete = async (item) => {
    try {
      await adminMenuApi.deleteItem(item.id)
      loadCategories()
    } catch {
      toast.error(t('adminMenu.failedToDeleteItem'))
    }
  }

  const handleToggleAvailability = async (item) => {
    try {
      await adminMenuApi.toggleAvailability(item.id)
      loadCategories()
    } catch {
      toast.error(t('adminMenu.failedToUpdateAvailability'))
    }
  }

  const downloadCsvTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE_HEADER], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'menu_options_template.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const exportPricesCsv = () =>
    downloadTextFile(buildMenuCsv(categories), `menu_prices_${new Date().toISOString().slice(0, 10)}.csv`)

  const handleCsvImport = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setImporting(true)
    try {
      const res = await adminMenuApi.importOptionsCSV(file)
      const { imported_items: importedItems = [], errors = [] } = res.data
      if (importedItems.length > 0) {
        toast.success(t('adminMenu.importedOptionsFor', { count: importedItems.length }))
      }
      if (errors.length > 0) {
        toast.error(errors.join(', '))
      }
      loadCategories()
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.errors?.join(', ') || t('adminMenu.failedToImportCsv'))
    } finally {
      setImporting(false)
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
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={{ xs: 1.5, md: 0 }}
        sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, mb: 3 }}
      >
        <Typography variant="h4" fontWeight={700}>
          {t('admin.nav.menu')}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', justifyContent: { md: 'flex-end' }, rowGap: 1 }}>
          <Button startIcon={<EditNoteIcon />} variant="outlined" onClick={() => setBulkOpen(true)}>
            {t('adminMenu.bulkEdit')}
          </Button>
          <Button startIcon={<FileUploadIcon />} onClick={(e) => setCsvMenuAnchor(e.currentTarget)}>
            {t('adminMenu.importExport')}
          </Button>
          {!isOperator && (
            <>
              <Button startIcon={<SwapVertIcon />} onClick={() => setReorderDialogOpen(true)}>
                {t('adminMenu.reorderCategories')}
              </Button>
              <Button variant="contained" onClick={openAddCategory}>
                {t('adminMenu.addCategory')}
              </Button>
            </>
          )}
        </Stack>
      </Stack>

      <Menu anchorEl={csvMenuAnchor} open={Boolean(csvMenuAnchor)} onClose={() => setCsvMenuAnchor(null)}>
        <ListSubheader sx={{ lineHeight: '32px' }}>{t('adminMenu.pricesAndNames')}</ListSubheader>
        <MenuItem
          onClick={() => {
            setCsvMenuAnchor(null)
            exportPricesCsv()
          }}
        >
          <ListItemIcon>
            <FileDownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={t('adminMenu.exportPrices')} secondary={t('adminMenu.exportPricesHint')} />
        </MenuItem>
        <MenuItem
          onClick={() => {
            setCsvMenuAnchor(null)
            setCsvDialogOpen(true)
          }}
        >
          <ListItemIcon>
            <FileUploadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={t('adminMenu.importPrices')} secondary={t('adminMenu.importPricesHint')} />
        </MenuItem>
        {!isOperator && [
          <Divider key="divider" />,
          <ListSubheader key="header" sx={{ lineHeight: '32px' }}>
            {t('adminMenu.itemOptions')}
          </ListSubheader>,
          <MenuItem
            key="template"
            onClick={() => {
              setCsvMenuAnchor(null)
              downloadCsvTemplate()
            }}
          >
            <ListItemIcon>
              <FileDownloadIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary={t('adminMenu.downloadCsvTemplate')} secondary={t('adminMenu.optionsTemplateHint')} />
          </MenuItem>,
          <MenuItem
            key="import"
            disabled={importing}
            onClick={() => {
              setCsvMenuAnchor(null)
              optionsFileInput.current?.click()
            }}
          >
            <ListItemIcon>
              <FileUploadIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary={t('adminMenu.importOptionsCsv')} secondary={t('adminMenu.optionsImportHint')} />
          </MenuItem>,
        ]}
      </Menu>
      <input ref={optionsFileInput} type="file" accept=".csv" hidden onChange={handleCsvImport} />

      <BulkEditMenuDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        categories={categories}
        isAdmin={!isOperator}
        onSaved={loadCategories}
      />

      <MenuCsvDialog
        open={csvDialogOpen}
        onClose={() => setCsvDialogOpen(false)}
        categories={categories}
        onApplied={loadCategories}
      />

      {categories.map((category) => (
        <CategoryAccordion
          key={category.id}
          category={category}
          isOperator={isOperator}
          onEditCategory={openEditCategory}
          onDeleteCategory={handleCategoryDelete}
          onAddItem={openAddItem}
          onEditItem={openEditItem}
          onOpenOptions={setOptionsItem}
          onDeleteItem={handleItemDelete}
          onToggleAvailability={handleToggleAvailability}
        />
      ))}

      <Dialog open={categoryDialogOpen} onClose={() => setCategoryDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingCategory ? t('adminMenu.editCategory') : t('adminMenu.addCategory')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label={t('adminMenu.name')}
              required
              value={categoryForm.name}
              onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
            />
            <TextField
              label={t('adminMenu.nameArabic')}
              value={categoryForm.name_ar}
              onChange={(e) => setCategoryForm({ ...categoryForm, name_ar: e.target.value })}
              slotProps={{ htmlInput: { dir: 'rtl' } }}
            />
            <TextField
              label={t('adminMenu.description')}
              multiline
              rows={2}
              value={categoryForm.description}
              onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
            />
            <TextField
              label={t('adminMenu.descriptionArabic')}
              multiline
              rows={2}
              value={categoryForm.description_ar}
              onChange={(e) => setCategoryForm({ ...categoryForm, description_ar: e.target.value })}
              slotProps={{ htmlInput: { dir: 'rtl' } }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={categoryForm.visible}
                  onChange={(e) => setCategoryForm({ ...categoryForm, visible: e.target.checked })}
                />
              }
              label={t('adminMenu.visible')}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCategoryDialogOpen(false)}>{t('account.cancel')}</Button>
          <Button variant="contained" onClick={handleCategorySave}>
            {t('account.save')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={itemDialogOpen} onClose={() => setItemDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingItem ? t('adminMenu.editItem') : t('adminMenu.addItem')}</DialogTitle>
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
              value={itemForm.name}
              onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
            />
            <TextField
              label={t('adminMenu.nameArabic')}
              value={itemForm.name_ar}
              onChange={(e) => setItemForm({ ...itemForm, name_ar: e.target.value })}
              slotProps={{ htmlInput: { dir: 'rtl' } }}
            />
            <TextField
              label={t('adminMenu.description')}
              multiline
              rows={2}
              value={itemForm.description}
              onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
            />
            <TextField
              label={t('adminMenu.descriptionArabic')}
              multiline
              rows={2}
              value={itemForm.description_ar}
              onChange={(e) => setItemForm({ ...itemForm, description_ar: e.target.value })}
              slotProps={{ htmlInput: { dir: 'rtl' } }}
            />
            <TextField
              label={t('adminMenu.price')}
              type="number"
              required
              value={itemForm.price}
              onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
            />
            <TextField
              label={t('adminMenu.tagsCommaSeparated')}
              value={itemForm.tags}
              onChange={(e) => setItemForm({ ...itemForm, tags: e.target.value })}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={itemForm.available}
                  onChange={(e) => setItemForm({ ...itemForm, available: e.target.checked })}
                />
              }
              label={t('adminMenu.available')}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={itemForm.featured}
                  onChange={(e) => setItemForm({ ...itemForm, featured: e.target.checked })}
                />
              }
              label={t('adminMenu.featured')}
            />

            {adminRole === 'admin' && (
              <>
                <Divider />
                <FormControlLabel
                  control={
                    <Switch
                      checked={itemForm.on_offer}
                      onChange={(e) => setItemForm({ ...itemForm, on_offer: e.target.checked })}
                    />
                  }
                  label={t('adminMenu.putOnOffer')}
                />
                <Collapse in={itemForm.on_offer}>
                  <Stack spacing={2}>
                    <TextField
                      label={t('adminMenu.originalPrice')}
                      type="number"
                      helperText={t('adminMenu.originalPriceHelper')}
                      value={itemForm.compare_at_price}
                      onChange={(e) => setItemForm({ ...itemForm, compare_at_price: e.target.value })}
                    />
                    <TextField
                      label={t('adminMenu.offerBadge')}
                      placeholder={t('adminMenu.offerBadgePlaceholder')}
                      value={itemForm.offer_badge}
                      onChange={(e) => setItemForm({ ...itemForm, offer_badge: e.target.value })}
                    />
                  </Stack>
                </Collapse>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setItemDialogOpen(false)}>{t('account.cancel')}</Button>
          <Button variant="contained" onClick={handleItemSave}>
            {t('account.save')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(optionsItem)}
        onClose={() => {
          setOptionsItem(null)
          loadCategories()
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {t('adminMenu.itemOptionsExtras', {
            name: optionsItem ? localized(optionsItem, 'name', i18n.language) : '',
          })}
          <IconButton
            onClick={() => {
              setOptionsItem(null)
              loadCategories()
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {optionsItem && (
            <ItemOptionsEditor itemId={optionsItem.id} itemName={localized(optionsItem, 'name', i18n.language)} />
          )}
        </DialogContent>
      </Dialog>

      <ReorderCategoriesDialog
        open={reorderDialogOpen}
        categories={categories}
        onClose={() => setReorderDialogOpen(false)}
        onSaved={loadCategories}
      />
      {import.meta.env.DEV && <DataToggle />}
    </Box>
  )
}

export default AdminMenuPage
