import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  InputBase,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import CloseIcon from '@mui/icons-material/Close'
import SearchIcon from '@mui/icons-material/Search'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { adminMenuApi } from '../../api'
import { optionsPayload } from '../../utils/optionsPayload'
import OptionsFields from './OptionsFields'

const HEADER_HEIGHT = 40
// Categories start open, in order, while the running total stays within this many items (the first
// always opens). A menu under the limit opens completely; a huge one opens just its first categories.
const ALL_OPEN_LIMIT = 100
// A search that matches most of a huge menu would mount every row at once; cap what is rendered.
const RENDER_CAP = 100
const PRICE_RE = /^\d+(\.\d{1,2})?$/
// decimal(10,2) column — anything at or above this overflows the database.
const MAX_PRICE = 100_000_000
const validPrice = (text) => PRICE_RE.test(text.trim()) && Number(text) < MAX_PRICE

const toDraft = (item) => ({
  name: item.name || '',
  name_ar: item.name_ar || '',
  price: item.price == null ? '' : String(Number(item.price)),
  available: Boolean(item.available),
  compare_at_price: item.compare_at_price == null ? '' : String(Number(item.compare_at_price)),
  offer_badge: item.offer_badge || '',
})

const sameNumber = (a, b) => (a === '' || b === '' ? a === b : Number(a) === Number(b))

// Which fields of the draft differ from the saved item.
function changedFields(item, draft, isAdmin) {
  const base = toDraft(item)
  const changed = {}
  if (draft.name !== base.name) changed.name = true
  if (draft.name_ar !== base.name_ar) changed.name_ar = true
  if (!sameNumber(draft.price, base.price)) changed.price = true
  if (draft.available !== base.available) changed.available = true
  if (isAdmin) {
    if (!sameNumber(draft.compare_at_price, base.compare_at_price)) changed.compare_at_price = true
    if (draft.offer_badge !== base.offer_badge) changed.offer_badge = true
  }
  return changed
}

function fieldErrors(draft, isAdmin) {
  const errors = {}
  if (!draft.name.trim()) errors.name = true
  if (!validPrice(draft.price)) errors.price = true
  if (isAdmin && draft.compare_at_price !== '' && !validPrice(draft.compare_at_price)) {
    errors.compare_at_price = true
  }
  return errors
}

const optionsHaveErrors = (options) =>
  options.some((opt) => !opt.name.trim() || opt.choices.some((c) => !c.label.trim()))

// A cell always shows a bottom rule (>=3:1) so it reads as editable. Changed cells add a
// heavier rule on top of the tint, so the state doesn't rely on colour alone.
function Cell({ changed, error, errorId, errorText, align, width, ...props }) {
  return (
    <>
      <InputBase
        {...props}
        className="bulk-cell"
        error={error}
        fullWidth
        sx={(theme) => ({
          width,
          px: 1,
          py: { xs: 1, md: 0.5 },
          borderRadius: 1,
          border: '1px solid transparent',
          borderBottomColor: 'rgba(0, 0, 0, 0.5)',
          fontSize: '0.875rem',
          bgcolor: changed ? alpha(theme.palette.primary.main, 0.18) : 'transparent',
          boxShadow: changed ? `inset 0 -2px 0 ${theme.palette.secondary.main}` : 'none',
          '&:hover': { borderColor: 'rgba(0, 0, 0, 0.5)' },
          '&.Mui-focused': {
            outline: `2px solid ${theme.palette.secondary.main}`,
            outlineOffset: 1,
            bgcolor: theme.palette.background.paper,
          },
          '&.Mui-error': { borderColor: theme.palette.error.main },
          '& input': {
            p: 0,
            textAlign: { xs: 'start', md: align },
            scrollMarginTop: { xs: '56px', md: '96px' },
          },
        })}
      />
      {error && errorText && (
        <Typography id={errorId} variant="caption" color="error" sx={{ display: 'block', px: 1 }}>
          {errorText}
        </Typography>
      )}
    </>
  )
}

// Phones can't fit a nine-column grid, so each item stacks into labelled blocks
// (name / Arabic name / price + availability) and the column header row is dropped.
const cellSx = ({ md, span = 1, minWidth }) => ({
  display: { xs: 'block', md: 'table-cell' },
  gridColumn: { xs: `span ${span}` },
  width: { xs: 'auto', md },
  minWidth: { xs: 0, md: minWidth },
  borderBottom: { xs: 'none', md: 1 },
  borderColor: 'divider',
  '&::before': {
    content: 'attr(data-label)',
    display: { xs: 'block', md: 'none' },
    px: 1,
    fontSize: '0.75rem',
    color: 'text.secondary',
  },
})

const BulkRow = memo(function BulkRow({
  item,
  draft,
  isAdmin,
  expanded,
  optionState,
  onChange,
  onToggleOptions,
  onOptionsChange,
  optionsDirty,
  compact,
}) {
  const { t } = useTranslation()
  const changed = changedFields(item, draft, isAdmin)
  const errors = fieldErrors(draft, isAdmin)
  const set = (field) => (e) => onChange(item.id, { [field]: e.target.value })
  const optionsCount = optionState?.options ? optionState.options.length : item.options_count
  // Row context + state in every input's name, so a screen reader doesn't hear "Price" 49 times.
  const label = (key, field) =>
    `${t(key)} — ${item.name}${changed[field] ? `, ${t('adminMenu.bulkEditedSr')}` : ''}`
  const errId = (field) => `bulk-err-${item.id}-${field}`
  const panelId = `bulk-options-${item.id}`

  return (
    <>
      <TableRow
        hover
        role="row"
        sx={{
          '& > td': { py: 0.25, verticalAlign: 'top' },
          '& button, & input': { scrollMarginTop: { xs: '56px', md: '96px' } },
          display: { xs: 'grid', md: 'table-row' },
          gridTemplateColumns: { xs: '1fr 1fr' },
          borderBottom: { xs: 1, md: 'none' },
          borderColor: 'divider',
          py: { xs: 1, md: 0 },
        }}
      >
        <TableCell role="cell" data-label={t('adminMenu.name')} sx={cellSx({ minWidth: 200, span: 2 })}>
          <Cell
            value={draft.name}
            onChange={set('name')}
            changed={changed.name}
            error={errors.name}
            errorId={errId('name')}
            errorText={t('adminMenu.bulkErrName')}
            slotProps={{
              input: {
                dir: 'auto',
                title: draft.name,
                'data-col': 'name',
                'data-invalid': errors.name ? 'true' : undefined,
                'aria-label': label('adminMenu.name', 'name'),
                'aria-describedby': errors.name ? errId('name') : undefined,
              },
            }}
          />
        </TableCell>
        <TableCell role="cell" data-label={t('adminMenu.nameArabic')} sx={cellSx({ minWidth: 180, span: 2 })}>
          <Cell
            value={draft.name_ar}
            onChange={set('name_ar')}
            changed={changed.name_ar}
            slotProps={{
              input: { dir: 'rtl', lang: 'ar', title: draft.name_ar, 'data-col': 'name_ar', 'aria-label': label('adminMenu.nameArabic', 'name_ar') },
            }}
          />
        </TableCell>
        <TableCell role="cell" data-label={t('adminMenu.price')} sx={cellSx({ md: 140 })}>
          <Cell
            value={draft.price}
            onChange={set('price')}
            changed={changed.price}
            error={errors.price}
            errorId={errId('price')}
            errorText={t('adminMenu.bulkErrPrice')}
            align="end"
            slotProps={{
              input: {
                dir: 'ltr',
                inputMode: 'decimal',
                'data-col': 'price',
                'data-invalid': errors.price ? 'true' : undefined,
                'aria-label': label('adminMenu.price', 'price'),
                'aria-describedby': errors.price ? errId('price') : undefined,
              },
            }}
          />
          {changed.price && !errors.price && (
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', px: 1, textAlign: 'end' }}>
              {t('adminMenu.bulkWas', { value: Number(item.price) })}
            </Typography>
          )}
        </TableCell>
        {isAdmin && (
          <>
            <TableCell role="cell" data-label={t('adminMenu.bulkOriginalShort')} sx={cellSx({ md: 140 })}>
              <Cell
                value={draft.compare_at_price}
                onChange={set('compare_at_price')}
                changed={changed.compare_at_price}
                error={errors.compare_at_price}
                errorId={errId('compare_at_price')}
                errorText={t('adminMenu.bulkErrPrice')}
                align="end"
                placeholder="—"
                slotProps={{
                  input: {
                    dir: 'ltr',
                    inputMode: 'decimal',
                    'data-col': 'compare_at_price',
                    'data-invalid': errors.compare_at_price ? 'true' : undefined,
                    'aria-label': label('adminMenu.originalPrice', 'compare_at_price'),
                    'aria-describedby': errors.compare_at_price ? errId('compare_at_price') : undefined,
                  },
                }}
              />
            </TableCell>
            <TableCell role="cell" data-label={t('adminMenu.offerBadge')} sx={cellSx({ md: 140 })}>
              <Cell
                value={draft.offer_badge}
                onChange={set('offer_badge')}
                changed={changed.offer_badge}
                placeholder={t('adminMenu.offerBadgePlaceholder')}
                slotProps={{
                  input: { title: draft.offer_badge, 'data-col': 'offer_badge', 'aria-label': label('adminMenu.offerBadge', 'offer_badge') },
                }}
              />
            </TableCell>
          </>
        )}
        <TableCell
          role="cell"
          data-label={t('adminMenu.available')}
          sx={{ ...cellSx({ md: 90 }), textAlign: { md: 'center' }, verticalAlign: 'middle !important' }}
        >
          <Switch
            size={compact ? 'medium' : 'small'}
            checked={draft.available}
            onChange={(e) => onChange(item.id, { available: e.target.checked })}
            slotProps={{ input: { 'aria-label': label('adminMenu.available', 'available') } }}
            sx={changed.available ? { '& .MuiSwitch-track': { outline: '2px solid', outlineColor: 'secondary.main' } } : undefined}
          />
        </TableCell>
        {isAdmin && (
          <TableCell role="cell" sx={{ ...cellSx({ md: 150, span: 2 }), verticalAlign: 'middle !important' }}>
            <Button
              size="small"
              color="inherit"
              onClick={() => onToggleOptions(item.id)}
              aria-expanded={expanded}
              aria-controls={expanded ? panelId : undefined}
              aria-label={`${t('adminMenu.bulkOptions', { count: optionsCount })} — ${item.name}`}
              endIcon={expanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
              sx={{ whiteSpace: 'nowrap', minHeight: { xs: 44, md: 'auto' } }}
            >
              {t('adminMenu.bulkOptions', { count: optionsCount })}
            </Button>
            {optionsDirty && <Chip size="small" color="primary" label={t('adminMenu.bulkEdited')} sx={{ ms: 0.5 }} />}
          </TableCell>
        )}
      </TableRow>
      {expanded && (
        <TableRow role="row" sx={{ display: { xs: 'block', md: 'table-row' } }}>
          <TableCell
            id={panelId}
            role="cell"
            colSpan={isAdmin ? 7 : 4}
            sx={{ display: { xs: 'block', md: 'table-cell' }, bgcolor: 'action.hover', p: 2 }}
          >
            {!optionState || optionState.loading ? (
              <CircularProgress size={20} />
            ) : optionState.error ? (
              <Alert severity="error">{t('itemOptions.failedToLoadOptions')}</Alert>
            ) : (
              <OptionsFields options={optionState.options} onChange={(next) => onOptionsChange(item.id, next)} showErrors />
            )}
          </TableCell>
        </TableRow>
      )}
    </>
  )
})

function BulkEditMenuDialog({ open, onClose, categories, isAdmin, onSaved }) {
  const { t, i18n } = useTranslation()
  const theme = useTheme()
  const compact = useMediaQuery(theme.breakpoints.down('md'))
  const searchRef = useRef(null)
  const [drafts, setDrafts] = useState({})
  const [optionStates, setOptionStates] = useState({})
  const [expanded, setExpanded] = useState(() => new Set())
  const [query, setQuery] = useState('')
  const [changedOnly, setChangedOnly] = useState(false)
  const [saving, setSaving] = useState(false)
  const [serverErrors, setServerErrors] = useState([])
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  // Category ids whose rows are mounted. Browsers get quadratically slower inserting rows into one
  // huge table (480 rows froze the page for over a minute), so big menus start with one category open.
  const [openCats, setOpenCats] = useState(() => new Set())
  const tableRef = useRef(null)

  const items = useMemo(
    () => categories.flatMap((category) => (category.items || []).map((item) => ({ item, category }))),
    [categories]
  )

  // Fresh drafts every time the modal opens, from whatever the menu looks like now.
  useEffect(() => {
    if (!open) return
    setDrafts(Object.fromEntries(items.map(({ item }) => [item.id, toDraft(item)])))
    setOptionStates({})
    setExpanded(new Set())
    setQuery('')
    setChangedOnly(false)
    setServerErrors([])
    let budget = ALL_OPEN_LIMIT
    const initiallyOpen = []
    categories.forEach((c, i) => {
      const n = (c.items || []).length
      if (i === 0 || n <= budget) {
        initiallyOpen.push(c.id)
        budget -= n
      }
    })
    setOpenCats(new Set(initiallyOpen))
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = useCallback((id, patch) => {
    setServerErrors([])
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }, [])

  const handleOptionsChange = useCallback((id, options) => {
    setServerErrors([])
    setOptionStates((prev) => ({ ...prev, [id]: { ...prev[id], options } }))
  }, [])

  const handleToggleOptions = useCallback((id) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setOptionStates((prev) => {
      if (prev[id]) return prev
      adminMenuApi
        .getItemOptions(id)
        .then((res) =>
          setOptionStates((cur) => ({
            ...cur,
            [id]: { loading: false, options: res.data.options, original: JSON.stringify(optionsPayload(res.data.options)) },
          }))
        )
        .catch(() => setOptionStates((cur) => ({ ...cur, [id]: { loading: false, error: true } })))
      return { ...prev, [id]: { loading: true } }
    })
  }, [])

  // Per-item summary used for the counts, the filter and the save payload.
  const rows = useMemo(
    () =>
      items.map(({ item, category }) => {
        const draft = drafts[item.id] || toDraft(item)
        const changed = changedFields(item, draft, isAdmin)
        const state = optionStates[item.id]
        const optionsDirty = Boolean(
          isAdmin && state?.options && JSON.stringify(optionsPayload(state.options)) !== state.original
        )
        const invalid =
          Object.keys(fieldErrors(draft, isAdmin)).length > 0 ||
          (optionsDirty && optionsHaveErrors(state.options))
        return { item, category, draft, changed, optionsDirty, dirty: Object.keys(changed).length > 0 || optionsDirty, invalid }
      }),
    [items, drafts, optionStates, isAdmin]
  )

  const dirtyRows = rows.filter((r) => r.dirty)
  const invalidCount = dirtyRows.filter((r) => r.invalid).length

  // Deferred so keystrokes in the search box stay instant while the (heavy) row list catches up.
  const deferredQuery = useDeferredValue(query)
  const visibleGroups = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase()
    const groups = []
    rows.forEach((row) => {
      if (changedOnly && !row.dirty) return
      if (q) {
        const haystack = [row.item.name, row.item.name_ar, row.category.name, row.category.name_ar]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(q)) return
      }
      const last = groups[groups.length - 1]
      if (last && last.category.id === row.category.id) last.rows.push(row)
      else groups.push({ category: row.category, rows: [row] })
    })
    return groups
  }, [rows, deferredQuery, changedOnly])

  const forceOpen = Boolean(deferredQuery.trim()) || changedOnly

  // Under a search/filter every matching category is open — cap the rows actually mounted.
  const { shownGroups, hiddenCount } = useMemo(() => {
    if (!forceOpen) return { shownGroups: visibleGroups, hiddenCount: 0 }
    let budget = RENDER_CAP
    const shown = []
    let total = 0
    visibleGroups.forEach((g) => {
      total += g.rows.length
      if (budget <= 0) return
      const rowsShown = g.rows.slice(0, budget)
      budget -= rowsShown.length
      shown.push({ ...g, rows: rowsShown, total: g.rows.length })
    })
    return { shownGroups: shown, hiddenCount: Math.max(0, total - RENDER_CAP) }
  }, [visibleGroups, forceOpen])

  const requestClose = () => {
    if (saving) return
    if (dirtyRows.length > 0) setConfirmDiscard(true)
    else onClose()
  }

  const handleSave = async () => {
    const payload = dirtyRows.map(({ item, draft, changed, optionsDirty }) => {
      const row = { id: item.id }
      if (changed.name) row.name = draft.name.trim()
      if (changed.name_ar) row.name_ar = draft.name_ar.trim()
      if (changed.price) row.price = Number(draft.price)
      if (changed.available) row.available = draft.available
      if (changed.compare_at_price) row.compare_at_price = draft.compare_at_price === '' ? null : Number(draft.compare_at_price)
      if (changed.offer_badge) row.offer_badge = draft.offer_badge.trim() || null
      if (optionsDirty) row.options = optionsPayload(optionStates[item.id].options)
      return row
    })

    setSaving(true)
    setServerErrors([])
    try {
      await adminMenuApi.bulkUpdateItems(payload)
      toast.success(t('adminMenu.csvUpdated', { count: payload.length }))
      onSaved()
      onClose()
    } catch (err) {
      const errors = err.response?.data?.errors
      setServerErrors(errors?.length ? errors : [err.response?.data?.error || t('adminMenu.bulkSaveFailed')])
    } finally {
      setSaving(false)
    }
  }

  // Spreadsheet-style movement: Enter / ↑ / ↓ jump to the same column in the next / previous row.
  const handleKeyDown = (e) => {
    const col = e.target.dataset?.col
    if (!col || !['Enter', 'ArrowDown', 'ArrowUp'].includes(e.key)) return
    const inputs = [...tableRef.current.querySelectorAll(`input[data-col="${col}"]`)]
    const next = inputs[inputs.indexOf(e.target) + (e.key === 'ArrowUp' || (e.key === 'Enter' && e.shiftKey) ? -1 : 1)]
    if (!next) return
    e.preventDefault()
    next.focus()
    next.select()
  }

  const toggleCategory = (categoryId) =>
    setOpenCats((prev) => {
      const next = new Set(prev)
      if (next.has(categoryId)) next.delete(categoryId)
      else next.add(categoryId)
      return next
    })

  const goToFirstProblem = () => {
    const find = () => tableRef.current?.querySelector('[data-invalid="true"]')
    const target = find()
    if (target) return target.focus()
    // The offending row is filtered out or its category is collapsed: open it, then try again.
    const firstInvalid = rows.find((r) => r.dirty && r.invalid)
    setQuery('')
    setChangedOnly(false)
    if (firstInvalid) setOpenCats((prev) => new Set(prev).add(firstInvalid.category.id))
    setTimeout(() => find()?.focus(), 80)
  }

  const colCount = isAdmin ? 7 : 4
  const categoryName = (category) => (i18n.language === 'ar' && category.name_ar) || category.name

  return (
    <>
      <Dialog
        open={open}
        onClose={requestClose}
        fullScreen
        sx={{
          // Amber alone is 2:1 on white — a darker thumb/track keeps the on/off state visible (1.4.11).
          '& .MuiSwitch-switchBase.Mui-checked': { color: 'primary.dark' },
          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: 'primary.dark' },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            columnGap: 2,
            rowGap: 1,
            px: { xs: 2, md: 3 },
            py: 1.5,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <DialogTitle sx={{ p: 0, fontWeight: 700, flexGrow: { xs: 1, md: 0 } }}>{t('adminMenu.bulkTitle')}</DialogTitle>
          <TextField
            size="small"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('adminMenu.bulkSearch')}
            inputRef={searchRef}
            sx={{ minWidth: { xs: '100%', md: 280 }, order: { xs: 2, md: 1 } }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
              htmlInput: { 'aria-label': t('adminMenu.bulkSearch') },
            }}
          />
          <FormControlLabel
            control={<Switch size="small" checked={changedOnly} onChange={(e) => setChangedOnly(e.target.checked)} />}
            label={t('adminMenu.bulkChangedOnly', { count: dirtyRows.length })}
            sx={{ mr: 0, order: { xs: 3, md: 2 } }}
          />
          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'block' }, order: 3 }} />
          <IconButton
            onClick={requestClose}
            aria-label={t('adminMenu.bulkClose')}
            edge="end"
            sx={{ order: { xs: 1, md: 4 }, width: 44, height: 44 }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        <DialogContent sx={{ p: 0 }} ref={tableRef} onKeyDown={handleKeyDown}>
          {serverErrors.length > 0 && (
            <Alert severity="error" sx={{ m: 2 }}>
              <Typography fontWeight={600}>{t('adminMenu.bulkSaveFailed')}</Typography>
              <Box component="ul" sx={{ m: 0, pl: 2 }}>
                {serverErrors.map((msg, i) => (
                  <li key={i}>{msg}</li>
                ))}
              </Box>
            </Alert>
          )}

          <Table
            size="small"
            stickyHeader
            role="table"
            aria-label={t('adminMenu.bulkTitle')}
            sx={{
              minWidth: { md: isAdmin ? 1000 : 640 },
              display: { xs: 'block', md: 'table' },
              '& tbody': { display: { xs: 'block', md: 'table-row-group' } },
            }}
          >
            <TableHead role="rowgroup" sx={{ display: { xs: 'none', md: 'table-header-group' } }}>
              <TableRow sx={{ '& th': { height: HEADER_HEIGHT, py: 0, fontWeight: 600, whiteSpace: 'nowrap' } }}>
                <TableCell>{t('adminMenu.name')}</TableCell>
                <TableCell>{t('adminMenu.nameArabic')}</TableCell>
                <TableCell align="right">{t('adminMenu.price')}</TableCell>
                {isAdmin && <TableCell align="right">{t('adminMenu.bulkOriginalShort')}</TableCell>}
                {isAdmin && <TableCell>{t('adminMenu.offerBadge')}</TableCell>}
                <TableCell align="center">{t('adminMenu.available')}</TableCell>
                {isAdmin && <TableCell>{t('adminMenu.bulkOptionsHeader')}</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody role="rowgroup">
              {shownGroups.map(({ category, rows: groupRows, total }) => (
                <GroupRows
                  key={category.id}
                  title={`${categoryName(category)} (${total ?? groupRows.length})`}
                  colSpan={colCount}
                  collapsible={!forceOpen}
                  open={forceOpen || openCats.has(category.id)}
                  onToggle={() => toggleCategory(category.id)}
                >
                  {(forceOpen || openCats.has(category.id)) &&
                    groupRows.map(({ item, draft, optionsDirty }) => (
                    <BulkRow
                      key={item.id}
                      compact={compact}
                      item={item}
                      draft={draft}
                      isAdmin={isAdmin}
                      expanded={expanded.has(item.id)}
                      optionState={optionStates[item.id]}
                      optionsDirty={optionsDirty}
                      onChange={handleChange}
                      onToggleOptions={handleToggleOptions}
                      onOptionsChange={handleOptionsChange}
                    />
                  ))}
                </GroupRows>
              ))}
            </TableBody>
          </Table>

          {hiddenCount > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
              {t('adminMenu.bulkCapNotice', { shown: RENDER_CAP, total: RENDER_CAP + hiddenCount })}
            </Typography>
          )}

          {visibleGroups.length === 0 && items.length === 0 && (
            <Typography color="text.secondary" sx={{ py: 8, textAlign: 'center' }}>
              {t('adminMenu.bulkNoItems')}
            </Typography>
          )}

          {visibleGroups.length === 0 && items.length > 0 && (
            <Stack spacing={1.5} sx={{ alignItems: 'center', py: 8 }}>
              <Typography color="text.secondary">{t('adminMenu.bulkNoMatches')}</Typography>
              <Button
                onClick={() => {
                  setQuery('')
                  setChangedOnly(false)
                }}
              >
                {t('adminMenu.bulkClearFilters')}
              </Button>
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ px: { xs: 2, md: 3 }, py: 1.5, borderTop: 1, borderColor: 'divider', gap: 1, flexWrap: 'wrap' }}>
          <Typography
            role="status"
            variant="body2"
            color={invalidCount > 0 ? 'error' : 'text.secondary'}
            sx={{
              flexGrow: 1,
              flexBasis: { xs: '100%', md: 'auto' },
              display: { xs: invalidCount > 0 || dirtyRows.length > 0 ? 'block' : 'none', md: 'block' },
            }}
          >
            {invalidCount > 0
              ? t('adminMenu.bulkInvalid', { count: invalidCount })
              : dirtyRows.length > 0
                ? t('adminMenu.bulkChangedCount', { count: dirtyRows.length })
                : t('adminMenu.bulkTip')}
          </Typography>
          {invalidCount > 0 && (
            <Button color="error" onClick={goToFirstProblem}>
              {t('adminMenu.bulkGoToFirst')}
            </Button>
          )}
          <Button
            color="inherit"
            disabled={dirtyRows.length === 0 || saving}
            onClick={() => {
              setDrafts(Object.fromEntries(items.map(({ item }) => [item.id, toDraft(item)])))
              setOptionStates({})
              setExpanded(new Set())
              setServerErrors([])
              searchRef.current?.focus()
            }}
          >
            {t('adminMenu.bulkDiscard')}
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={dirtyRows.length === 0 || invalidCount > 0 || saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {t('adminMenu.bulkSave', { count: dirtyRows.length })}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmDiscard} onClose={() => setConfirmDiscard(false)}>
        <DialogTitle>{t('adminMenu.bulkLeaveTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t('adminMenu.bulkLeaveBody', { count: dirtyRows.length })}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDiscard(false)}>{t('adminMenu.bulkKeepEditing')}</Button>
          <Button
            color="error"
            onClick={() => {
              setConfirmDiscard(false)
              onClose()
            }}
          >
            {t('adminMenu.bulkDiscard')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

// Category heading row that stays pinned under the column headers while its items scroll.
function GroupRows({ title, colSpan, collapsible, open, onToggle, children }) {
  return (
    <>
      <TableRow role="row" sx={{ display: { xs: 'block', md: 'table-row' } }}>
        <TableCell
          role="rowheader"
          colSpan={colSpan}
          sx={{
            display: { xs: 'block', md: 'table-cell' },
            position: 'sticky',
            top: { xs: 0, md: HEADER_HEIGHT },
            zIndex: 2,
            bgcolor: 'background.default',
            fontWeight: 700,
            p: 0,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          {collapsible ? (
            <ButtonBase
              onClick={onToggle}
              aria-expanded={open}
              sx={{
                width: '100%',
                justifyContent: 'space-between',
                textAlign: 'start',
                px: 2,
                py: 0.75,
                font: 'inherit',
                fontWeight: 700,
                minHeight: { xs: 44, md: 'auto' },
                overflowWrap: 'anywhere',
              }}
            >
              <span>{title}</span>
              {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </ButtonBase>
          ) : (
            <Box sx={{ px: 2, py: 0.75, overflowWrap: 'anywhere' }}>{title}</Box>
          )}
        </TableCell>
      </TableRow>
      {children}
    </>
  )
}

export default BulkEditMenuDialog
