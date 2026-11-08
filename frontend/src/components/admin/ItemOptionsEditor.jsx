import { useEffect, useState } from 'react'
import { Box, Stack, Button, CircularProgress } from '@mui/material'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { adminMenuApi } from '../../api'
import OptionsFields from './OptionsFields'
import { optionsPayload } from '../../utils/optionsPayload'

function ItemOptionsEditor({ itemId }) {
  const { t } = useTranslation()
  const [options, setOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLoading(true)
    adminMenuApi
      .getItemOptions(itemId)
      .then((res) => setOptions(res.data.options))
      .catch(() => toast.error(t('itemOptions.failedToLoadOptions')))
      .finally(() => setLoading(false))
  }, [itemId])

  const handleSaveAll = async () => {
    setSaving(true)
    try {
      const res = await adminMenuApi.saveItemOptions(itemId, optionsPayload(options))
      setOptions(res.data.options)
      toast.success(t('itemOptions.optionsSaved'))
    } catch (err) {
      toast.error(err.response?.data?.errors?.join(', ') || t('itemOptions.failedToSaveOptions'))
    } finally {
      setSaving(false)
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
      <Stack direction="row" sx={{ justifyContent: 'flex-end', alignItems: 'center', mb: 3 }}>
        <Button variant="contained" onClick={handleSaveAll} disabled={saving}>
          {t('itemOptions.saveAll')}
        </Button>
      </Stack>

      <OptionsFields options={options} onChange={setOptions} />
    </Box>
  )
}

export default ItemOptionsEditor
