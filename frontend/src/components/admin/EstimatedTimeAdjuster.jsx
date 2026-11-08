import { useEffect, useRef, useState } from 'react'
import { Box, Stack, Typography, IconButton } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import dayjs from 'dayjs'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { adminOrdersApi } from '../../api'

const MIN_MINUTES = 5
const MAX_MINUTES = 120
const STEP_MINUTES = 5

function defaultMinutesFor(order) {
  return order.order_type === 'delivery'
    ? order.branch?.estimated_delivery_minutes
    : order.branch?.estimated_pickup_minutes
}

function EstimatedTimeAdjuster({ order, onOrderUpdated }) {
  const { t } = useTranslation()
  const [minutes, setMinutes] = useState(order.estimated_minutes_remaining ?? defaultMinutesFor(order) ?? 20)
  const [showUpdated, setShowUpdated] = useState(false)
  const updatedTimeoutRef = useRef(null)

  useEffect(() => {
    setMinutes(order.estimated_minutes_remaining ?? defaultMinutesFor(order) ?? 20)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id, order.estimated_minutes_remaining])

  useEffect(() => () => clearTimeout(updatedTimeoutRef.current), [])

  const handleAdjust = async (delta) => {
    const newMinutes = Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, minutes + delta))
    if (newMinutes === minutes) return

    setMinutes(newMinutes)
    try {
      const res = await adminOrdersApi.updateEstimatedTime(order.id, newMinutes)
      onOrderUpdated?.(res.data)
      setShowUpdated(true)
      clearTimeout(updatedTimeoutRef.current)
      updatedTimeoutRef.current = setTimeout(() => setShowUpdated(false), 2000)
    } catch {
      toast.error(t('estimatedTime.failedToUpdate'))
    }
  }

  const readyLabel = order.estimated_ready_at
    ? t('estimatedTime.readyAt', { time: dayjs(order.estimated_ready_at).format('HH:mm') })
    : t('estimatedTime.estReadyTime')

  return (
    <Box sx={{ mt: 1.5 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          {readyLabel}
        </Typography>
        <Typography
          variant="caption"
          color="success.main"
          sx={{ opacity: showUpdated ? 1 : 0, transition: 'opacity 0.5s ease' }}
        >
          {t('estimatedTime.updated')}
        </Typography>
      </Stack>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'center', mt: 0.5 }}>
        <IconButton
          size="small"
          onClick={() => handleAdjust(-STEP_MINUTES)}
          disabled={minutes <= MIN_MINUTES}
          sx={{ border: '1px solid', borderColor: 'divider' }}
        >
          <RemoveIcon fontSize="small" />
        </IconButton>
        <Box sx={{ textAlign: 'center', minWidth: 36 }}>
          <Typography fontWeight={700} lineHeight={1}>
            {minutes}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('estimatedTime.mins')}
          </Typography>
        </Box>
        <IconButton
          size="small"
          onClick={() => handleAdjust(STEP_MINUTES)}
          disabled={minutes >= MAX_MINUTES}
          sx={{ border: '1px solid', borderColor: 'divider' }}
        >
          <AddIcon fontSize="small" />
        </IconButton>
      </Stack>
    </Box>
  )
}

export default EstimatedTimeAdjuster
