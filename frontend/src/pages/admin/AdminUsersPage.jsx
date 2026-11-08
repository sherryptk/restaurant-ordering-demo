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
  CircularProgress,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import LockResetIcon from '@mui/icons-material/LockReset'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { adminUsersApi, adminBranchApi } from '../../api'
import { selectAuth } from '../../store'

const ROLE_COLOR = { admin: 'error', operator: 'primary', driver: 'success' }

const EMPTY_FORM = { name: '', email: '', phone: '', password: '', role: 'operator', branch_id: '' }

function AdminUsersPage() {
  const { t } = useTranslation()
  const { admin: currentAdmin } = useSelector(selectAuth)

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [branches, setBranches] = useState([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [temporaryPassword, setTemporaryPassword] = useState('')

  const load = () => {
    setLoading(true)
    adminUsersApi
      .list()
      .then((res) => setUsers(res.data))
      .catch(() => toast.error(t('adminUsers.failedToLoadUsers')))
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
    setEditingUser(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  const openEditDialog = (user) => {
    setEditingUser(user)
    setForm({
      name: user.name || '',
      email: user.email,
      phone: user.phone || '',
      password: '',
      role: user.role,
      branch_id: user.branch_id || '',
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      if (editingUser) {
        await adminUsersApi.update(editingUser.id, {
          name: form.name,
          email: form.email,
          phone: form.phone,
          role: form.role,
          branch_id: form.branch_id || null,
        })
        toast.success(t('adminUsers.userUpdated'))
      } else {
        await adminUsersApi.create({ ...form, branch_id: form.branch_id || null })
        toast.success(t('adminUsers.userCreated'))
      }
      setDialogOpen(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.errors?.join(', ') || t('adminUsers.failedToSaveUser'))
    }
  }

  const handleDelete = async (user) => {
    try {
      await adminUsersApi.destroy(user.id)
      toast.success(t('adminUsers.userDeleted'))
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || t('adminUsers.failedToDeleteUser'))
    }
  }

  const handleResetPassword = async (user) => {
    try {
      const res = await adminUsersApi.resetPassword(user.id)
      setTemporaryPassword(res.data.temporary_password)
      setResetDialogOpen(true)
    } catch {
      toast.error(t('adminUsers.failedToResetPassword'))
    }
  }

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(temporaryPassword)
    toast.success(t('adminUsers.copiedToClipboard'))
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
          {t('admin.nav.users')}
        </Typography>
        <Button variant="contained" onClick={openAddDialog}>
          {t('adminUsers.addUser')}
        </Button>
      </Stack>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('adminMenu.name')}</TableCell>
              <TableCell>{t('auth.email')}</TableCell>
              <TableCell>{t('auth.phone')}</TableCell>
              <TableCell>{t('adminUsers.role')}</TableCell>
              <TableCell>{t('admin.nav.branches')}</TableCell>
              <TableCell>{t('adminUsers.created')}</TableCell>
              <TableCell align="right">{t('adminCombo.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography color="text.secondary">{t('adminUsers.noUsersYet')}</Typography>
                </TableCell>
              </TableRow>
            )}
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell sx={{ fontWeight: 600 }}>{user.name || '—'}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.phone || '—'}</TableCell>
                <TableCell>
                  <Chip
                    label={t(`adminUsers.role_${user.role}`)}
                    size="small"
                    color={ROLE_COLOR[user.role] || 'default'}
                  />
                </TableCell>
                <TableCell>{user.branch_name || t('adminOrders.allBranches')}</TableCell>
                <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => handleResetPassword(user)} title={t('adminUsers.resetPassword')}>
                    <LockResetIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => openEditDialog(user)} title={t('adminBranches.edit')}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    disabled={user.id === currentAdmin?.id}
                    onClick={() => handleDelete(user)}
                    title={t('adminBranches.delete')}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingUser ? t('adminUsers.editUser') : t('adminUsers.addUser')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label={t('adminMenu.name')}
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <TextField
              label={t('auth.phone')}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <TextField
              label={t('auth.email')}
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            {!editingUser && (
              <TextField
                label={t('auth.password')}
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            )}
            <FormControl fullWidth>
              <InputLabel>{t('adminUsers.role')}</InputLabel>
              <Select
                value={form.role}
                label={t('adminUsers.role')}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <MenuItem value="operator">{t('adminUsers.role_operator')}</MenuItem>
                <MenuItem value="driver">{t('adminUsers.role_driver')}</MenuItem>
                <MenuItem value="admin">{t('adminUsers.role_admin')}</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel shrink>{t('admin.nav.branches')}</InputLabel>
              <Select
                value={form.branch_id}
                label={t('admin.nav.branches')}
                displayEmpty
                notched
                onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
              >
                <MenuItem value="">{t('adminOrders.allBranches')}</MenuItem>
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

      <Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('adminUsers.temporaryPassword')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('adminUsers.shareWithUser')}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <TextField value={temporaryPassword} fullWidth slotProps={{ input: { readOnly: true } }} />
            <IconButton onClick={handleCopyPassword} title={t('adminUsers.copy')}>
              <ContentCopyIcon />
            </IconButton>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialogOpen(false)}>{t('adminUsers.close')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default AdminUsersPage
