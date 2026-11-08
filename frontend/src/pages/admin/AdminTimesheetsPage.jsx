import { useEffect, useMemo, useState } from 'react'
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from '@mui/material'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { adminTimesheetsApi, adminEmployeesApi } from '../../api'
import { formatCurrency, localDateString, localMonthString } from '../../utils/format'

function daysInMonth(monthStr) {
  const [year, month] = monthStr.split('-').map(Number)
  return new Date(year, month, 0).getDate()
}

function AdminTimesheetsPage() {
  const { t } = useTranslation()
  const [month, setMonth] = useState(localMonthString())
  const [employees, setEmployees] = useState([])
  const [timesheets, setTimesheets] = useState([])
  const [summaries, setSummaries] = useState({})
  const [loading, setLoading] = useState(true)

  const [cellDialog, setCellDialog] = useState(null) // { employeeId, day, hours_worked, day_off, existingId }
  const [adjustmentDialog, setAdjustmentDialog] = useState(null) // { employeeId }
  const [adjustmentForm, setAdjustmentForm] = useState({ date: '', amount: '', adjustment_type: 'advance', note: '' })

  const days = useMemo(() => Array.from({ length: daysInMonth(month) }, (_, i) => i + 1), [month])

  const timesheetMap = useMemo(() => {
    const map = {}
    timesheets.forEach((ts) => {
      map[`${ts.employee_id}-${ts.date}`] = ts
    })
    return map
  }, [timesheets])

  const load = () => {
    setLoading(true)
    Promise.all([adminEmployeesApi.list(), adminTimesheetsApi.list({ month })])
      .then(([employeesRes, timesheetsRes]) => {
        setEmployees(employeesRes.data)
        setTimesheets(timesheetsRes.data)
        return Promise.all(
          employeesRes.data.map((employee) =>
            adminEmployeesApi
              .payrollSummary(employee.id, month)
              .then((res) => [employee.id, res.data])
          )
        )
      })
      .then((pairs) => setSummaries(Object.fromEntries(pairs)))
      .catch(() => toast.error(t('adminTimesheets.failedToLoad')))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month])

  const dateFor = (day) => `${month}-${String(day).padStart(2, '0')}`

  const openCell = (employeeId, day) => {
    const existing = timesheetMap[`${employeeId}-${dateFor(day)}`]
    setCellDialog({
      employeeId,
      day,
      hours_worked: existing?.hours_worked ?? '',
      day_off: existing?.day_off ?? false,
      existingId: existing?.id ?? null,
    })
  }

  const saveCell = async () => {
    const { employeeId, day, hours_worked, day_off, existingId } = cellDialog
    const payload = {
      employee_id: employeeId,
      date: dateFor(day),
      day_off,
      hours_worked: day_off ? null : hours_worked,
    }

    try {
      if (existingId) {
        await adminTimesheetsApi.update(existingId, payload)
      } else {
        await adminTimesheetsApi.create(payload)
      }
      setCellDialog(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.errors?.join(', ') || t('adminTimesheets.failedToSave'))
    }
  }

  const openAdjustmentDialog = (employeeId) => {
    setAdjustmentForm({
      date: localDateString(),
      amount: '',
      adjustment_type: 'advance',
      note: '',
    })
    setAdjustmentDialog({ employeeId })
  }

  const saveAdjustment = async () => {
    try {
      await adminEmployeesApi.addAdjustment(adjustmentDialog.employeeId, adjustmentForm)
      setAdjustmentDialog(null)
      load()
      toast.success(t('adminTimesheets.adjustmentSaved'))
    } catch (err) {
      toast.error(err.response?.data?.errors?.join(', ') || t('adminTimesheets.failedToSave'))
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
          {t('admin.nav.timesheets')}
        </Typography>
        <TextField
          type="month"
          size="small"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </Stack>

      <TableContainer component={Paper} sx={{ mb: 3, overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 1 }}>
                {t('adminEmployees.name')}
              </TableCell>
              {days.map((day) => (
                <TableCell key={day} align="center">
                  {day}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {employees.length === 0 && (
              <TableRow>
                <TableCell colSpan={days.length + 1}>
                  <Typography color="text.secondary">{t('adminEmployees.noEmployeesYet')}</Typography>
                </TableCell>
              </TableRow>
            )}
            {employees.map((employee) => (
              <TableRow key={employee.id}>
                <TableCell sx={{ position: 'sticky', left: 0, bgcolor: 'background.paper', fontWeight: 600, zIndex: 1 }}>
                  {employee.name}
                </TableCell>
                {days.map((day) => {
                  const ts = timesheetMap[`${employee.id}-${dateFor(day)}`]
                  return (
                    <TableCell
                      key={day}
                      align="center"
                      sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                      onClick={() => openCell(employee.id, day)}
                    >
                      {ts?.day_off ? t('adminTimesheets.off') : ts?.hours_worked ?? ''}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Stack spacing={2}>
        {employees.map((employee) => {
          const summary = summaries[employee.id]
          return (
            <Paper key={employee.id} sx={{ p: 2 }}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <Typography fontWeight={600}>{employee.name}</Typography>
                {summary && (
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Chip size="small" label={`${t('adminTimesheets.hours')}: ${summary.total_hours}`} />
                    <Chip size="small" label={`${t('adminTimesheets.grossPay')}: ${formatCurrency(summary.gross_pay)}`} />
                    <Chip size="small" color="success" label={`${t('adminTimesheets.bonuses')}: ${formatCurrency(summary.bonuses)}`} />
                    <Chip size="small" color="warning" label={`${t('adminTimesheets.advances')}: ${formatCurrency(summary.advances)}`} />
                    <Chip size="small" color="warning" label={`${t('adminTimesheets.deductions')}: ${formatCurrency(summary.deductions)}`} />
                    <Chip size="small" color="error" label={`${t('adminTimesheets.penalties')}: ${formatCurrency(summary.penalties)}`} />
                    <Chip size="small" color="success" label={`${t('adminTimesheets.netPay')}: ${formatCurrency(summary.net_pay)}`} />
                  </Stack>
                )}
                <Button size="small" onClick={() => openAdjustmentDialog(employee.id)}>
                  {t('adminTimesheets.addAdjustment')}
                </Button>
              </Stack>
            </Paper>
          )
        })}
      </Stack>

      <Dialog open={!!cellDialog} onClose={() => setCellDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{cellDialog && dateFor(cellDialog.day)}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={cellDialog?.day_off ?? false}
                  onChange={(e) => setCellDialog({ ...cellDialog, day_off: e.target.checked })}
                />
              }
              label={t('adminTimesheets.dayOff')}
            />
            <TextField
              label={t('adminTimesheets.hoursWorked')}
              type="number"
              disabled={cellDialog?.day_off}
              value={cellDialog?.hours_worked ?? ''}
              onChange={(e) => setCellDialog({ ...cellDialog, hours_worked: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCellDialog(null)}>{t('account.cancel')}</Button>
          <Button variant="contained" onClick={saveCell}>
            {t('account.save')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!adjustmentDialog} onClose={() => setAdjustmentDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('adminTimesheets.addAdjustment')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label={t('adminLedger.date')}
              type="date"
              slotProps={{ inputLabel: { shrink: true } }}
              value={adjustmentForm.date}
              onChange={(e) => setAdjustmentForm({ ...adjustmentForm, date: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>{t('adminTimesheets.adjustmentType')}</InputLabel>
              <Select
                value={adjustmentForm.adjustment_type}
                label={t('adminTimesheets.adjustmentType')}
                onChange={(e) => setAdjustmentForm({ ...adjustmentForm, adjustment_type: e.target.value })}
              >
                <MenuItem value="advance">{t('adminTimesheets.advance')}</MenuItem>
                <MenuItem value="deduction">{t('adminTimesheets.deduction')}</MenuItem>
                <MenuItem value="bonus">{t('adminTimesheets.bonus')}</MenuItem>
                <MenuItem value="penalty">{t('adminTimesheets.penalty')}</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label={t('adminLedger.amount')}
              type="number"
              value={adjustmentForm.amount}
              onChange={(e) => setAdjustmentForm({ ...adjustmentForm, amount: e.target.value })}
            />
            <TextField
              label={t('adminLedger.note')}
              value={adjustmentForm.note}
              onChange={(e) => setAdjustmentForm({ ...adjustmentForm, note: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdjustmentDialog(null)}>{t('account.cancel')}</Button>
          <Button variant="contained" onClick={saveAdjustment}>
            {t('account.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default AdminTimesheetsPage
