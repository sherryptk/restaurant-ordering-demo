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
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { adminEmployeesApi, adminBranchApi } from '../../api'
import { formatCurrency } from '../../utils/format'

const EMPTY_FORM = { name: '', name_ar: '', hourly_rate: '', branch_id: '', active: true }

function AdminEmployeesPage() {
  const { t } = useTranslation()
  const [employees, setEmployees] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const load = () => {
    setLoading(true)
    adminEmployeesApi
      .list()
      .then((res) => setEmployees(res.data))
      .catch(() => toast.error(t('adminEmployees.failedToLoad')))
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
      await adminEmployeesApi.create(form)
      setDialogOpen(false)
      load()
      toast.success(t('adminEmployees.employeeSaved'))
    } catch (err) {
      toast.error(err.response?.data?.errors?.join(', ') || t('adminEmployees.failedToSave'))
    }
  }

  const handleToggleActive = async (employee) => {
    try {
      await adminEmployeesApi.update(employee.id, { active: !employee.active })
      load()
    } catch {
      toast.error(t('adminEmployees.failedToSave'))
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
          {t('admin.nav.employees')}
        </Typography>
        <Button variant="contained" onClick={openAddDialog}>
          {t('adminEmployees.addEmployee')}
        </Button>
      </Stack>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('adminEmployees.name')}</TableCell>
              <TableCell>{t('adminEmployees.branch')}</TableCell>
              <TableCell>{t('adminEmployees.hourlyRate')}</TableCell>
              <TableCell>{t('adminCombo.status')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {employees.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography color="text.secondary">{t('adminEmployees.noEmployeesYet')}</Typography>
                </TableCell>
              </TableRow>
            )}
            {employees.map((employee) => (
              <TableRow key={employee.id}>
                <TableCell sx={{ fontWeight: 600 }}>{employee.name}</TableCell>
                <TableCell>{employee.branch?.name || '—'}</TableCell>
                <TableCell>{formatCurrency(employee.hourly_rate)}</TableCell>
                <TableCell>
                  <Switch size="small" checked={employee.active} onChange={() => handleToggleActive(employee)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('adminEmployees.addEmployee')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label={t('adminEmployees.name')}
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <TextField
              label={t('adminEmployees.nameAr')}
              value={form.name_ar}
              onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
            />
            <TextField
              label={t('adminEmployees.hourlyRate')}
              type="number"
              required
              value={form.hourly_rate}
              onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })}
            />
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

export default AdminEmployeesPage
