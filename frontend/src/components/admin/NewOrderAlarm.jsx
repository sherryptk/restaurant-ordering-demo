import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSelector } from 'react-redux'
import { createConsumer } from '@rails/actioncable'
import { Typography, Button, Stack, Box } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { selectAdminRole } from '../../store'

const TAB_ALERT_TITLE = '🚨 NEW ORDER! 🚨'
// Last-resort safety valve: force-silence the alarm after this long even if
// nobody clicks Acknowledge, so a rendering glitch can never ring forever.
const MAX_RING_MS = 3 * 60 * 1000

// Stashed on window (outside this module's scope) so that if Vite hot-reloads
// this file while a chime is actively looping, the next mount can find and
// kill the orphaned interval/AudioContext from the previous module instance —
// otherwise it keeps looping forever with no reference left to stop it.
function stopAnyOrphanedAlarm() {
  if (window.__newOrderAlarmStop) {
    window.__newOrderAlarmStop()
    window.__newOrderAlarmStop = null
  }
}

function startSiren() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext
  if (!AudioCtx) return null

  stopAnyOrphanedAlarm()

  const ctx = new AudioCtx()

  function playChime() {
    const now = ctx.currentTime
    // Soft two-note "ding-dong" — sine tones with a smooth attack/decay envelope
    ;[880, 660].forEach((freq, i) => {
      const start = now + i * 0.28
      const osc = ctx.createOscillator()
      const noteGain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      noteGain.gain.setValueAtTime(0, start)
      noteGain.gain.linearRampToValueAtTime(0.2, start + 0.04)
      noteGain.gain.exponentialRampToValueAtTime(0.001, start + 0.6)
      osc.connect(noteGain)
      noteGain.connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 0.6)
    })
  }

  playChime()
  const interval = setInterval(playChime, 2800)

  const stop = () => {
    clearInterval(interval)
    ctx.close()
    if (window.__newOrderAlarmStop === stop) window.__newOrderAlarmStop = null
  }
  window.__newOrderAlarmStop = stop

  return stop
}

function NewOrderAlarm() {
  const { t } = useTranslation()
  const adminRole = useSelector(selectAdminRole)
  const [pendingOrders, setPendingOrders] = useState([])
  const stopSirenRef = useRef(null)
  const originalTitleRef = useRef(document.title)
  const titleFlashRef = useRef(null)
  const maxRingTimeoutRef = useRef(null)

  const isRinging = pendingOrders.length > 0
  const acknowledge = () => setPendingOrders([])

  useEffect(() => {
    if (adminRole === 'driver') return

    const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:3000'}/cable`
    const consumer = createConsumer(wsUrl)

    const subscription = consumer.subscriptions.create(
      { channel: 'AdminOrdersChannel' },
      {
        received: (payload) => {
          if (payload?.type !== 'new_order') return
          setPendingOrders((prev) => [...prev, payload.order_number])
        },
      }
    )

    return () => {
      subscription.unsubscribe()
      consumer.disconnect()
    }
  }, [adminRole])

  useEffect(() => {
    if (isRinging && !stopSirenRef.current) {
      stopSirenRef.current = startSiren()
      titleFlashRef.current = setInterval(() => {
        document.title = document.title === TAB_ALERT_TITLE ? originalTitleRef.current : TAB_ALERT_TITLE
      }, 1000)
      if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300])
      maxRingTimeoutRef.current = setTimeout(acknowledge, MAX_RING_MS)
    }

    if (!isRinging && stopSirenRef.current) {
      stopSirenRef.current()
      stopSirenRef.current = null
      clearInterval(titleFlashRef.current)
      document.title = originalTitleRef.current
      clearTimeout(maxRingTimeoutRef.current)
    }
  }, [isRinging])

  useEffect(() => {
    return () => {
      if (stopSirenRef.current) stopSirenRef.current()
      clearInterval(titleFlashRef.current)
      clearTimeout(maxRingTimeoutRef.current)
      document.title = originalTitleRef.current
    }
  }, [])

  // Keyboard fallback independent of the overlay's own rendering, in case it
  // ever fails to paint (e.g. a stray CSS transform on an ancestor breaking
  // `position: fixed`).
  useEffect(() => {
    if (!isRinging) return

    const onKeyDown = (event) => {
      if (event.key === 'Escape') acknowledge()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isRinging])

  if (adminRole === 'driver' || !isRinging) return null

  return createPortal(
    <Box
      onClick={acknowledge}
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        textAlign: 'center',
        color: 'white',
        cursor: 'pointer',
        '@keyframes newOrderPulse': {
          '0%': { backgroundColor: '#b71c1c' },
          '50%': { backgroundColor: '#ff1744' },
          '100%': { backgroundColor: '#b71c1c' },
        },
        animation: 'newOrderPulse 1s infinite',
      }}
    >
      <Box
        sx={{
          fontSize: 64,
          '@keyframes newOrderShake': {
            '0%, 100%': { transform: 'translate(0, 0) rotate(0deg)' },
            '20%': { transform: 'translate(-6px, 0) rotate(-2deg)' },
            '40%': { transform: 'translate(6px, 0) rotate(2deg)' },
            '60%': { transform: 'translate(-6px, 0) rotate(-2deg)' },
            '80%': { transform: 'translate(6px, 0) rotate(2deg)' },
          },
          animation: 'newOrderShake 0.5s infinite',
        }}
      >
        🚨
      </Box>
      <Typography variant="h4" fontWeight={900}>
        {t('adminOrders.newOrderAlertTitle')}
      </Typography>
      <Stack spacing={0.5}>
        {pendingOrders.map((orderNumber, index) => (
          <Typography key={`${orderNumber}-${index}`} variant="h6" fontWeight={700}>
            {orderNumber}
          </Typography>
        ))}
      </Stack>
      <Button
        variant="contained"
        size="large"
        color="warning"
        onClick={(event) => {
          event.stopPropagation()
          acknowledge()
        }}
        sx={{ fontWeight: 700, mt: 1 }}
      >
        {t('adminOrders.acknowledgeNewOrder')}
      </Button>
    </Box>,
    document.body
  )
}

export default NewOrderAlarm
