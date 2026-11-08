import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import {
  Box,
  Typography,
  Stack,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Grid,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { adminMonthlySummaryApi, adminBranchApi } from '../../api'
import { formatCurrency, localMonthString } from '../../utils/format'
import { selectAdminRole, selectAdminBranchName } from '../../store'

function StatCard({ label, value, color }) {
  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h6" fontWeight={700} color={color}>
        {formatCurrency(value)}
      </Typography>
    </Paper>
  )
}

function AdminMonthlySummaryPage() {
  const { t } = useTranslation()
  const adminRole = useSelector(selectAdminRole)
  const adminBranchName = useSelector(selectAdminBranchName)
  const isAdmin = adminRole === 'admin'

  const [branches, setBranches] = useState([])
  const [branchId, setBranchId] = useState('')
  const [month, setMonth] = useState(localMonthString())
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

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
    if (isAdmin && !branchId) return
    setLoading(true)
    const params = { month }
    if (isAdmin) params.branch_id = branchId

    adminMonthlySummaryApi
      .get(params)
      .then((res) => setSummary(res.data))
      .catch(() => toast.error(t('adminMonthlySummary.failedToLoad')))
      .finally(() => setLoading(false))
  }, [isAdmin, branchId, month, t])

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>
          {t('admin.nav.monthlySummary')}
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
            type="month"
            size="small"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Stack>
      </Stack>

      {loading || !summary ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Stack spacing={3}>
          <Box>
            <Typography variant="h6" sx={{ mb: 1.5 }}>
              {t('adminMonthlySummary.cash')}
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6, sm: 3 }}>
                <StatCard label={t('adminCashDrawer.cashSales')} value={summary.cash.cash_sales} />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <StatCard label={t('adminCashDrawer.visaStoreSales')} value={summary.cash.visa_store_sales} />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <StatCard label={t('adminCashDrawer.visaOrdersSales')} value={summary.cash.visa_orders_sales} />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <StatCard label={t('adminCashDrawer.instapayTotal')} value={summary.cash.instapay_sales} />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <StatCard label={t('adminCashDrawer.mobileWalletTotal')} value={summary.cash.mobile_wallet_sales} />
              </Grid>
              <Grid size={{ xs: 6, sm: 4 }}>
                <StatCard label={t('adminMonthlySummary.totalRevenue')} value={summary.cash.total_revenue} color="success.main" />
              </Grid>
              <Grid size={{ xs: 6, sm: 4 }}>
                <StatCard label={t('adminMonthlySummary.totalExpenses')} value={summary.cash.total_expenses} color="error.main" />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <StatCard label={t('adminMonthlySummary.netCashFlow')} value={summary.cash.net_cash_flow} />
              </Grid>
            </Grid>
          </Box>

          <Divider />

          <Box>
            <Typography variant="h6" sx={{ mb: 1.5 }}>
              {t('admin.nav.timesheets')}
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6, sm: 3 }}>
                <StatCard label={t('adminTimesheets.hours')} value={summary.payroll.total_hours} />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <StatCard label={t('adminTimesheets.grossPay')} value={summary.payroll.gross_pay} />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <StatCard label={t('adminTimesheets.bonuses')} value={summary.payroll.bonuses} color="success.main" />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <StatCard label={t('adminTimesheets.advances')} value={summary.payroll.advances} color="warning.main" />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <StatCard label={t('adminTimesheets.deductions')} value={summary.payroll.deductions} color="warning.main" />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <StatCard label={t('adminTimesheets.penalties')} value={summary.payroll.penalties} color="error.main" />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <StatCard label={t('adminTimesheets.netPay')} value={summary.payroll.net_pay} color="success.main" />
              </Grid>
            </Grid>

            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('adminEmployees.name')}</TableCell>
                    <TableCell>{t('adminEmployees.hourlyRate')}</TableCell>
                    <TableCell>{t('adminTimesheets.hours')}</TableCell>
                    <TableCell>{t('adminTimesheets.grossPay')}</TableCell>
                    <TableCell>{t('adminTimesheets.bonuses')}</TableCell>
                    <TableCell>{t('adminTimesheets.advances')}</TableCell>
                    <TableCell>{t('adminTimesheets.deductions')}</TableCell>
                    <TableCell>{t('adminTimesheets.penalties')}</TableCell>
                    <TableCell>{t('adminMonthlySummary.owed')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {summary.employees.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9}>
                        <Typography color="text.secondary">{t('adminEmployees.noEmployeesYet')}</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {summary.employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell sx={{ fontWeight: 600 }}>{employee.name}</TableCell>
                      <TableCell>{formatCurrency(employee.hourly_rate)}</TableCell>
                      <TableCell>{employee.total_hours}</TableCell>
                      <TableCell>{formatCurrency(employee.gross_pay)}</TableCell>
                      <TableCell>{formatCurrency(employee.bonuses)}</TableCell>
                      <TableCell>{formatCurrency(employee.advances)}</TableCell>
                      <TableCell>{formatCurrency(employee.deductions)}</TableCell>
                      <TableCell>{formatCurrency(employee.penalties)}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{formatCurrency(employee.net_pay)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          <Divider />

          <Box>
            <Typography variant="h6" sx={{ mb: 1.5 }}>
              {t('admin.nav.ledger')}
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <StatCard label={t('adminMonthlySummary.totalPayments')} value={summary.ledger.total_payments} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Paper sx={{ p: 2, height: '100%' }}>
                  <Typography variant="caption" color="text.secondary">
                    {t('adminMonthlySummary.paymentCount')}
                  </Typography>
                  <Typography variant="h6" fontWeight={700}>
                    {summary.ledger.count}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Box>

          <Divider />

          <Grid container spacing={2}>
            <Grid size={{ xs: 6 }}>
              <StatCard label={t('adminMonthlySummary.grandTotalIn')} value={summary.grand_total_in} color="success.main" />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <StatCard label={t('adminMonthlySummary.grandTotalOut')} value={summary.grand_total_out} color="error.main" />
            </Grid>
          </Grid>
        </Stack>
      )}
    </Box>
  )
}

export default AdminMonthlySummaryPage
