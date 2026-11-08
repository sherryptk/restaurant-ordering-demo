import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
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
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  CircularProgress,
  Grid,
  Divider,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { adminCashTransactionsApi, adminDenominationCountsApi, adminBranchApi, adminMenuApi } from '../../api'
import { formatCurrency, localDateString } from '../../utils/format'
import { selectAdminRole, selectAdminBranchName } from '../../store'

const DENOMINATIONS = [200, 100, 50, 20, 10, 5, 1, 0.5, 0.25]

const KINDS = ['cash_sale', 'visa_store_sale', 'visa_orders_sale', 'instapay_sale', 'mobile_wallet_sale', 'expense']

const toLocalInputValue = (date) => {
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16)
}

const EMPTY_TRANSACTION = {
  kind: 'cash_sale',
  amount: '',
  category: '',
  note: '',
  occurred_at: toLocalInputValue(new Date()),
  items: [],
}

const emptyDenominationForm = () => ({
  counted_at: toLocalInputValue(new Date()),
  quantities: Object.fromEntries(DENOMINATIONS.map((value) => [value, ''])),
})

const visibleItems = (items) => items.filter((item) => !item._destroy)

const itemsTotal = (items) =>
  visibleItems(items).reduce((sum, item) => sum + Number(item.unit_price_snapshot) * Number(item.quantity), 0)

function AdminCashDrawerPage() {
  const { t } = useTranslation()
  const adminRole = useSelector(selectAdminRole)
  const adminBranchName = useSelector(selectAdminBranchName)
  const isAdmin = adminRole === 'admin'

  const [branches, setBranches] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [branchId, setBranchId] = useState('')
  const [date, setDate] = useState(localDateString())
  const [summary, setSummary] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  const [txDialogOpen, setTxDialogOpen] = useState(false)
  const [editingTxId, setEditingTxId] = useState(null)
  const [txForm, setTxForm] = useState(EMPTY_TRANSACTION)
  const [itemSearchInput, setItemSearchInput] = useState('')

  const [countDialogOpen, setCountDialogOpen] = useState(false)
  const [countForm, setCountForm] = useState(emptyDenominationForm())

  useEffect(() => {
    if (isAdmin) {
      adminBranchApi
        .list()
        .then((res) => {
          setBranches(res.data)
          if (res.data.length > 0) setBranchId((current) => current || res.data[0].id)
        })
        .catch(() => {})
    }
  }, [isAdmin])

  useEffect(() => {
    adminMenuApi
      .getCategories()
      .then((res) => setMenuItems(res.data.flatMap((category) => category.items || [])))
      .catch(() => {})
  }, [])

  const load = () => {
    if (isAdmin && !branchId) return
    setLoading(true)
    const params = { date }
    if (isAdmin) params.branch_id = branchId

    Promise.all([adminCashTransactionsApi.dailySummary(params), adminCashTransactionsApi.list(params)])
      .then(([summaryRes, txRes]) => {
        setSummary(summaryRes.data)
        setTransactions(txRes.data)
      })
      .catch(() => toast.error(t('adminCashDrawer.failedToLoad')))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, branchId])

  const openAddTx = () => {
    setEditingTxId(null)
    setTxForm({ ...EMPTY_TRANSACTION, occurred_at: toLocalInputValue(new Date()) })
    setItemSearchInput('')
    setTxDialogOpen(true)
  }

  const openEditTx = (tx) => {
    setEditingTxId(tx.id)
    setTxForm({
      kind: tx.kind,
      amount: tx.amount,
      category: tx.category || '',
      note: tx.note || '',
      occurred_at: toLocalInputValue(new Date(tx.occurred_at)),
      items: tx.items.map((item) => ({
        id: item.id,
        menu_item_id: item.menu_item_id,
        item_name_snapshot: item.item_name_snapshot,
        unit_price_snapshot: item.unit_price_snapshot,
        quantity: item.quantity,
      })),
    })
    setItemSearchInput('')
    setTxDialogOpen(true)
  }

  const addMenuItemLine = (menuItem) => {
    if (!menuItem) return
    setItemSearchInput('')
    setTxForm({
      ...txForm,
      items: [
        ...txForm.items,
        { menu_item_id: menuItem.id, item_name_snapshot: menuItem.name, unit_price_snapshot: menuItem.price, quantity: 1 },
      ],
    })
  }

  const updateItemQuantity = (index, quantity) => {
    const items = txForm.items.map((item, i) => (i === index ? { ...item, quantity } : item))
    setTxForm({ ...txForm, items })
  }

  // Persisted lines (with an id) must stay in the payload with `_destroy: true` so the
  // backend actually removes them — dropping them from the array would leave them
  // untouched in the database on save.
  const removeItemLine = (index) => {
    const item = txForm.items[index]
    if (item.id) {
      updateItemFlag(index)
    } else {
      setTxForm({ ...txForm, items: txForm.items.filter((_, i) => i !== index) })
    }
  }

  const updateItemFlag = (index) => {
    const items = txForm.items.map((item, i) => (i === index ? { ...item, _destroy: true } : item))
    setTxForm({ ...txForm, items })
  }

  const hasItems = visibleItems(txForm.items).length > 0

  const saveTx = async () => {
    const payload = {
      kind: txForm.kind,
      amount: hasItems ? itemsTotal(txForm.items) : txForm.amount,
      category: txForm.category,
      note: txForm.note,
      occurred_at: txForm.occurred_at,
      items_attributes: txForm.items.map((item) => ({
        id: item.id,
        menu_item_id: item.menu_item_id,
        item_name_snapshot: item.item_name_snapshot,
        unit_price_snapshot: item.unit_price_snapshot,
        quantity: item.quantity,
        _destroy: item._destroy || false,
      })),
    }
    if (isAdmin) payload.branch_id = branchId

    try {
      if (editingTxId) {
        await adminCashTransactionsApi.update(editingTxId, payload)
      } else {
        await adminCashTransactionsApi.create(payload)
      }
      setTxDialogOpen(false)
      load()
      toast.success(t('adminCashDrawer.transactionSaved'))
    } catch (err) {
      toast.error(err.response?.data?.errors?.join(', ') || t('adminCashDrawer.failedToSave'))
    }
  }

  const deleteTx = async (tx) => {
    try {
      await adminCashTransactionsApi.destroy(tx.id)
      load()
    } catch {
      toast.error(t('adminCashDrawer.failedToSave'))
    }
  }

  const openCountDialog = () => {
    setCountForm(emptyDenominationForm())
    setCountDialogOpen(true)
  }

  const countTotal = Object.entries(countForm.quantities).reduce(
    (sum, [value, qty]) => sum + Number(value) * (Number(qty) || 0),
    0
  )

  const saveCount = async () => {
    const lines = DENOMINATIONS.filter((value) => Number(countForm.quantities[value]) > 0).map((value) => ({
      value,
      quantity: Number(countForm.quantities[value]),
    }))

    try {
      await adminDenominationCountsApi.create({
        branch_id: isAdmin ? branchId : undefined,
        counted_at: countForm.counted_at,
        denomination_lines_attributes: lines,
      })
      setCountDialogOpen(false)
      load()
      toast.success(t('adminCashDrawer.countSaved'))
    } catch (err) {
      toast.error(err.response?.data?.errors?.join(', ') || t('adminCashDrawer.failedToSave'))
    }
  }

  const discrepancy = summary?.discrepancy
  const hasDiscrepancy = discrepancy !== null && discrepancy !== undefined
  const isBalanced = hasDiscrepancy && Math.abs(discrepancy) < 0.01

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>
          {t('admin.nav.cashDrawer')}
        </Typography>
        <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
          {isAdmin ? (
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>{t('adminEmployees.branch')}</InputLabel>
              <Select value={branchId} label={t('adminEmployees.branch')} onChange={(e) => setBranchId(e.target.value)}>
                {branches.map((branch) => (
                  <MenuItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <TextField size="small" label={t('adminEmployees.branch')} value={adminBranchName || ''} disabled />
          )}
          <TextField
            type="date"
            size="small"
            label={t('adminCashDrawer.date')}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Stack>
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Typography variant="caption" color="text.secondary">
                  {t('adminCashDrawer.cashSales')}
                </Typography>
                <Typography fontWeight={600}>{formatCurrency(summary?.cash_sales)}</Typography>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Typography variant="caption" color="text.secondary">
                  {t('adminCashDrawer.visaStoreSales')}
                </Typography>
                <Typography fontWeight={600}>{formatCurrency(summary?.visa_store_sales)}</Typography>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Typography variant="caption" color="text.secondary">
                  {t('adminCashDrawer.visaOrdersSales')}
                </Typography>
                <Typography fontWeight={600}>{formatCurrency(summary?.visa_orders_sales)}</Typography>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Typography variant="caption" color="text.secondary">
                  {t('adminCashDrawer.instapayTotal')}
                </Typography>
                <Typography fontWeight={600}>{formatCurrency(summary?.instapay_sales)}</Typography>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Typography variant="caption" color="text.secondary">
                  {t('adminCashDrawer.mobileWalletTotal')}
                </Typography>
                <Typography fontWeight={600}>{formatCurrency(summary?.mobile_wallet_sales)}</Typography>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Typography variant="caption" color="text.secondary">
                  {t('adminCashDrawer.expenseItems')}
                </Typography>
                <Typography fontWeight={600}>{formatCurrency(summary?.total_expenses)}</Typography>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Typography variant="caption" color="text.secondary">
                  {t('adminCashDrawer.previousClosingCount')}
                </Typography>
                <Typography fontWeight={600}>
                  {summary?.previous_closing_count ? formatCurrency(summary.previous_closing_count.total) : '—'}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Typography variant="caption" color="text.secondary">
                  {t('adminCashDrawer.closingCount')}
                </Typography>
                <Typography fontWeight={600}>
                  {summary?.closing_count ? formatCurrency(summary.closing_count.total) : '—'}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Typography variant="caption" color="text.secondary">
                  {t('adminCashDrawer.discrepancy')}
                </Typography>
                <Box>
                  <Chip
                    label={hasDiscrepancy ? formatCurrency(discrepancy) : t('adminCashDrawer.notCountedYet')}
                    size="small"
                    color={!hasDiscrepancy ? 'default' : isBalanced ? 'success' : 'error'}
                  />
                </Box>
              </Grid>
            </Grid>
            <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
              <Button variant="outlined" onClick={openCountDialog}>
                {t('adminCashDrawer.countCash')}
              </Button>
            </Stack>
          </Paper>

          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">{t('adminCashDrawer.transactions')}</Typography>
            <Button variant="contained" onClick={openAddTx}>
              {t('adminCashDrawer.addTransaction')}
            </Button>
          </Stack>

          <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('adminCashDrawer.time')}</TableCell>
                  <TableCell>{t('adminCashDrawer.kind')}</TableCell>
                  <TableCell>{t('adminCashDrawer.amount')}</TableCell>
                  <TableCell>{t('adminCashDrawer.category')}</TableCell>
                  <TableCell>{t('adminCashDrawer.items')}</TableCell>
                  <TableCell>{t('adminCashDrawer.enteredBy')}</TableCell>
                  <TableCell>{t('adminLedger.note')}</TableCell>
                  <TableCell align="right">{t('adminCombo.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <Typography color="text.secondary">{t('adminCashDrawer.noTransactionsYet')}</Typography>
                    </TableCell>
                  </TableRow>
                )}
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>{new Date(tx.occurred_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</TableCell>
                    <TableCell>{t(`adminCashDrawer.kinds.${tx.kind}`)}</TableCell>
                    <TableCell sx={{ color: tx.kind === 'expense' ? 'error.main' : 'inherit' }}>
                      {tx.kind === 'expense' ? '-' : ''}
                      {formatCurrency(tx.amount)}
                    </TableCell>
                    <TableCell>{tx.category || '—'}</TableCell>
                    <TableCell sx={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tx.items.length > 0
                        ? tx.items.map((item) => `${item.item_name_snapshot} ×${item.quantity}`).join(', ')
                        : '—'}
                    </TableCell>
                    <TableCell>{tx.submitted_by?.name || '—'}</TableCell>
                    <TableCell>{tx.note || '—'}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => openEditTx(tx)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => deleteTx(tx)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      <Dialog open={txDialogOpen} onClose={() => setTxDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingTxId ? t('adminCashDrawer.editTransaction') : t('adminCashDrawer.addTransaction')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth required>
              <InputLabel>{t('adminCashDrawer.kind')}</InputLabel>
              <Select
                value={txForm.kind}
                label={t('adminCashDrawer.kind')}
                onChange={(e) => setTxForm({ ...txForm, kind: e.target.value })}
              >
                {KINDS.map((kind) => (
                  <MenuItem key={kind} value={kind}>
                    {t(`adminCashDrawer.kinds.${kind}`)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {txForm.kind === 'expense' && (
              <TextField
                label={t('adminCashDrawer.category')}
                required
                value={txForm.category}
                onChange={(e) => setTxForm({ ...txForm, category: e.target.value })}
              />
            )}

            {txForm.kind !== 'expense' && (
              <>
                <Divider textAlign="left">{t('adminCashDrawer.items')}</Divider>
                <Autocomplete
                  options={menuItems}
                  value={null}
                  inputValue={itemSearchInput}
                  onInputChange={(_e, newInputValue, reason) => {
                    // Leave the typed text alone when it changes because an option was
                    // just picked ("selectOption") or the popup blurred/reset — only the
                    // explicit clear (already fired in addMenuItemLine) should empty it.
                    if (reason === 'input') setItemSearchInput(newInputValue)
                  }}
                  onChange={(_e, item) => addMenuItemLine(item)}
                  getOptionLabel={(item) => `${item.name} — ${formatCurrency(item.price)}`}
                  getOptionKey={(item) => item.id}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  renderInput={(params) => <TextField {...params} label={t('adminCashDrawer.addItemFromMenu')} />}
                />
                {txForm.items.map((item, index) =>
                  item._destroy ? null : (
                    <Stack key={item.id || index} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Typography sx={{ flex: 1 }}>{item.item_name_snapshot}</Typography>
                      <TextField
                        type="number"
                        size="small"
                        label={t('adminCashDrawer.quantity')}
                        sx={{ width: 100 }}
                        value={item.quantity}
                        onChange={(e) => updateItemQuantity(index, e.target.value)}
                      />
                      <Typography sx={{ minWidth: 90 }} color="text.secondary">
                        {formatCurrency(Number(item.unit_price_snapshot) * Number(item.quantity || 0))}
                      </Typography>
                      <IconButton size="small" onClick={() => removeItemLine(index)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  )
                )}
              </>
            )}

            <TextField
              label={hasItems ? t('adminCashDrawer.amountFromItems') : t('adminCashDrawer.amount')}
              type="number"
              required
              disabled={hasItems}
              value={hasItems ? itemsTotal(txForm.items) : txForm.amount}
              onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
            />
            <TextField
              label={t('adminCashDrawer.time')}
              type="datetime-local"
              value={txForm.occurred_at}
              onChange={(e) => setTxForm({ ...txForm, occurred_at: e.target.value })}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label={t('adminLedger.note')}
              value={txForm.note}
              onChange={(e) => setTxForm({ ...txForm, note: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTxDialogOpen(false)}>{t('account.cancel')}</Button>
          <Button variant="contained" onClick={saveTx}>
            {t('account.save')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={countDialogOpen} onClose={() => setCountDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('adminCashDrawer.countCash')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {DENOMINATIONS.map((value) => (
              <Stack key={value} direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                <Typography sx={{ minWidth: 60 }}>{formatCurrency(value)}</Typography>
                <TextField
                  type="number"
                  size="small"
                  fullWidth
                  label={t('adminCashDrawer.quantity')}
                  value={countForm.quantities[value]}
                  onChange={(e) =>
                    setCountForm({
                      ...countForm,
                      quantities: { ...countForm.quantities, [value]: e.target.value },
                    })
                  }
                />
                <Typography sx={{ minWidth: 90 }} color="text.secondary">
                  {formatCurrency(value * (Number(countForm.quantities[value]) || 0))}
                </Typography>
              </Stack>
            ))}
            <Stack direction="row" sx={{ justifyContent: 'space-between', p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Typography fontWeight={600}>{t('adminCashDrawer.total')}</Typography>
              <Typography fontWeight={600}>{formatCurrency(countTotal)}</Typography>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCountDialogOpen(false)}>{t('account.cancel')}</Button>
          <Button variant="contained" onClick={saveCount}>
            {t('account.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default AdminCashDrawerPage
