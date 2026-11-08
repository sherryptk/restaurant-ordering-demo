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
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { adminLedgerApi, adminBranchApi } from '../../api'
import { formatCurrency, localDateString } from '../../utils/format'

const EMPTY_FORM = {
  branch_id: '',
  date: localDateString(),
  payee_name: '',
  amount: '',
  note: '',
}

function AdminLedgerPage() {
  const { t } = useTranslation()
  const [payments, setPayments] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const load = () => {
    setLoading(true)
    adminLedgerApi
      .list()
      .then((res) => setPayments(res.data))
      .catch(() => toast.error(t('adminLedger.failedToLoad')))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    adminBranchApi
      .list()
      .then((res) => setBranches(res.data))
      .catch(() => {})
  }, [])

  const openAddDialog = () => {
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      await adminLedgerApi.create(form)
      setDialogOpen(false)
      load()
      toast.success(t('adminLedger.paymentSaved'))
    } catch (err) {
      toast.error(err.response?.data?.errors?.join(', ') || t('adminLedger.failedToSave'))
    }
  }

  const handleDelete = async (payment) => {
    try {
      await adminLedgerApi.destroy(payment.id)
      load()
    } catch {
      toast.error(t('adminLedger.failedToDelete'))
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
          {t('admin.nav.ledger')}
        </Typography>
        <Button variant="contained" onClick={openAddDialog}>
          {t('adminLedger.addPayment')}
        </Button>
      </Stack>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('adminLedger.date')}</TableCell>
              <TableCell>{t('adminLedger.payeeName')}</TableCell>
              <TableCell>{t('adminLedger.amount')}</TableCell>
              <TableCell>{t('adminLedger.note')}</TableCell>
              <TableCell align="right">{t('adminCombo.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {payments.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography color="text.secondary">{t('adminLedger.noPaymentsYet')}</Typography>
                </TableCell>
              </TableRow>
            )}
            {payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>{payment.date}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{payment.payee_name}</TableCell>
                <TableCell sx={{ color: payment.amount < 0 ? 'error.main' : 'inherit' }}>
                  {formatCurrency(payment.amount)}
                </TableCell>
                <TableCell>{payment.note || '—'}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => handleDelete(payment)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('adminLedger.addPayment')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth required>
              <InputLabel>{t('adminEmployees.branch')}</InputLabel>
              <Select
                value={form.branch_id}
                label={t('adminEmployees.branch')}
                onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
              >
                {branches.map((branch) => (
                  <MenuItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label={t('adminLedger.date')}
              type="date"
              required
              slotProps={{ inputLabel: { shrink: true } }}
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
            <TextField
              label={t('adminLedger.payeeName')}
              required
              value={form.payee_name}
              onChange={(e) => setForm({ ...form, payee_name: e.target.value })}
            />
            <TextField
              label={t('adminLedger.amount')}
              type="number"
              required
              helperText={t('adminLedger.amountHelper')}
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
            <TextField
              label={t('adminLedger.note')}
              multiline
              minRows={2}
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
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

export default AdminLedgerPage
