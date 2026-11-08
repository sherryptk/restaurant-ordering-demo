import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { adminMenuApi } from '../../api'
import { formatCurrency } from '../../utils/format'
import { diffMenuCsv, toPayload } from '../../utils/menuCsv'

// A bad export can produce thousands of errors; listing them all would freeze the dialog.
const MAX_LISTED_ERRORS = 50

const cellText = (field, value) => (field === 'price' ? formatCurrency(value) : value || '—')

// Step 1: pick an edited file → Step 2: review the diff → Step 3: apply.
function MenuCsvDialog({ open, onClose, categories, onApplied }) {
  const { t } = useTranslation()
  const [diff, setDiff] = useState(null)
  const [applying, setApplying] = useState(false)

  const close = () => {
    if (applying) return
    setDiff(null)
    onClose()
  }

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setDiff(diffMenuCsv(await file.text(), categories))
  }

  const apply = async () => {
    setApplying(true)
    try {
      await adminMenuApi.bulkUpdateItems(diff.changes.map((c) => ({ id: c.id, ...toPayload(c.fields) })))
      toast.success(t('adminMenu.csvUpdated', { count: diff.changes.length }))
      onApplied()
      setDiff(null)
      onClose()
    } catch (err) {
      // The server applies the batch atomically, so nothing was saved.
      const errors = err.response?.data?.errors
      toast.error(errors?.join('; ') || err.response?.data?.error || t('adminMenu.csvFailed'))
    } finally {
      setApplying(false)
    }
  }

  const hasChanges = diff?.changes.length > 0

  return (
    <Dialog open={open} onClose={close} maxWidth="md" fullWidth>
      <DialogTitle>{t('adminMenu.csvTitle')}</DialogTitle>
      <DialogContent>
        {!diff && (
          <Stack spacing={2} sx={{ alignItems: 'flex-start', mt: 1 }}>
            <Typography color="text.secondary">{t('adminMenu.csvInstructions')}</Typography>
            <Button variant="contained" component="label" startIcon={<FileUploadIcon />}>
              {t('adminMenu.csvChooseFile')}
              <input type="file" accept=".csv,text/csv" hidden onChange={handleFile} />
            </Button>
          </Stack>
        )}

        {diff && (
          <Stack spacing={2} sx={{ mt: 1 }}>
            {diff.errors.length > 0 && (
              <Alert severity="warning">
                <Typography fontWeight={600}>{t('adminMenu.csvSkipped', { count: diff.errors.length })}</Typography>
                <Box component="ul" sx={{ m: 0, pl: 2, maxHeight: 120, overflow: 'auto' }}>
                  {diff.errors.slice(0, MAX_LISTED_ERRORS).map((msg, i) => (
                    <li key={i}>{msg}</li>
                  ))}
                  {diff.errors.length > MAX_LISTED_ERRORS && (
                    <li>{t('adminMenu.csvMoreErrors', { count: diff.errors.length - MAX_LISTED_ERRORS })}</li>
                  )}
                </Box>
              </Alert>
            )}
            {hasChanges ? (
              <>
                <Typography>
                  {t('adminMenu.csvSummary', { changed: diff.changes.length, unchanged: diff.unchanged })}
                </Typography>
                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('adminMenu.csvItem')}</TableCell>
                        <TableCell>{t('adminMenu.csvChange')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {diff.changes.map((change) => (
                        <TableRow key={change.id}>
                          <TableCell>
                            <Typography fontWeight={600}>{change.label}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {change.category}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {Object.entries(change.fields).map(([field, { from, to }]) => (
                              <Typography key={field} variant="body2">
                                <b>{t(`adminMenu.csvField_${field}`)}:</b> {cellText(field, from)} → {cellText(field, to)}
                              </Typography>
                            ))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </>
            ) : (
              <Alert severity="info">{t('adminMenu.csvNoChanges')}</Alert>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        {diff && (
          <Button onClick={() => setDiff(null)} disabled={applying}>
            {t('adminMenu.csvChooseAnother')}
          </Button>
        )}
        <Button onClick={close} disabled={applying}>
          {t('account.cancel')}
        </Button>
        {hasChanges && (
          <Button
            variant="contained"
            onClick={apply}
            disabled={applying}
            startIcon={applying ? <CircularProgress size={16} /> : null}
          >
            {t('adminMenu.csvApply', { count: diff.changes.length })}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

export default MenuCsvDialog
