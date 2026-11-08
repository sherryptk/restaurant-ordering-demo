import { useEffect, useRef, useState } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { createConsumer } from '@rails/actioncable'
import {
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Stack,
  Divider,
  Chip,
  Button,
  CircularProgress,
  Alert,
  TextField,
  IconButton,
} from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { ordersApi } from '../../api'
import { formatCurrency, formatOrderStatus, formatDeliveryAddress } from '../../utils/format'

const PICKUP_STEPS = ['pending', 'confirmed', 'preparing', 'ready', 'completed']
const DELIVERY_STEPS = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered']

function InstapayCopyField({ label, value, onCopy }) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <TextField label={label} value={value} fullWidth size="small" slotProps={{ input: { readOnly: true } }} />
      <IconButton onClick={() => onCopy(value)} title={label}>
        <ContentCopyIcon fontSize="small" />
      </IconButton>
    </Stack>
  )
}

function OrderStatusPage() {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.language === 'ar'
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const guestPhoneParam = new URLSearchParams(location.search).get('guest_phone')
  const [order, setOrder] = useState(location.state?.order || null)
  const [loading, setLoading] = useState(!location.state?.order)
  const [uploadingProof, setUploadingProof] = useState(false)
  const consumerRef = useRef(null)
  const proofInputRef = useRef(null)

  useEffect(() => {
    if (!order) {
      setLoading(true)
      ordersApi
        .getOrder(id, guestPhoneParam)
        .then((res) => setOrder(res.data))
        .finally(() => setLoading(false))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:3000'}/cable`
    const consumer = createConsumer(wsUrl)
    consumerRef.current = consumer

    const subscription = consumer.subscriptions.create(
      { channel: 'OrderStatusChannel', order_id: id },
      {
        received: (data) => {
          setOrder((prev) => (prev ? { ...prev, ...data } : prev))
        },
      }
    )

    return () => {
      subscription.unsubscribe()
      consumer.disconnect()
    }
  }, [id])

  if (loading || !order) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  const handleCopy = (value) => {
    navigator.clipboard.writeText(value)
    toast.success(t('instapay.copied'))
  }

  const handleProofFileChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setUploadingProof(true)
    try {
      const res = await ordersApi.uploadPaymentProof(order.id, file, order.guest_phone)
      setOrder((prev) => ({ ...prev, ...res.data }))
      toast.success(t('instapay.proofUploaded'))
    } catch {
      toast.error(t('instapay.uploadFailed'))
    } finally {
      setUploadingProof(false)
    }
  }

  const steps = order.order_type === 'delivery' ? DELIVERY_STEPS : PICKUP_STEPS
  const isCancelled = order.status === 'cancelled'
  const activeStepIndex = steps.indexOf(order.status)

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto', p: 3 }}>
      <Typography variant="h4" sx={{ mb: 1 }}>
        {t('orderStatusPage.order', { number: order.order_number })}
      </Typography>
      <Chip label={formatOrderStatus(order.status)} color={isCancelled ? 'error' : 'primary'} sx={{ mb: 3 }} />

      {order.estimated_ready_at && !isCancelled && (
        <Box sx={{ mb: 3, p: 2, borderRadius: 1, border: '1px solid #1A1A1A', bgcolor: 'primary.main' }}>
          <Typography fontWeight={700} color="secondary.main">
            {t('orderStatusPage.readyAt', { time: dayjs(order.estimated_ready_at).format('HH:mm') })}
          </Typography>
        </Box>
      )}

      {!isCancelled && (
        <Stepper activeStep={activeStepIndex} alternativeLabel sx={{ mb: 4 }}>
          {steps.map((step) => (
            <Step key={step}>
              <StepLabel>{formatOrderStatus(step)}</StepLabel>
            </Step>
          ))}
        </Stepper>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {t('checkout.items')}
          </Typography>
          <Stack spacing={1}>
            {order.items.map((item) => {
              const itemName = (isRtl && item.item_name_ar_snapshot) || item.item_name_snapshot
              return (
                <Stack key={item.id} spacing={0.25}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Typography>
                      {item.quantity}× {itemName}
                    </Typography>
                    <Typography>{formatCurrency(item.line_total)}</Typography>
                  </Stack>
                  {(item.choices_snapshot || []).map((choice, index) => {
                    if (!choice.label) return null
                    const choiceLabel = (isRtl && choice.label_ar) || choice.label
                    const priceDelta = Number(choice.price_delta) || 0
                    const isExtra = priceDelta > 0
                    return (
                      <Stack key={index} direction="row" sx={{ justifyContent: 'space-between', pl: 2 }}>
                        <Typography
                          variant="body2"
                          color={isExtra ? 'primary.main' : 'text.secondary'}
                          fontWeight={isExtra ? 600 : 400}
                        >
                          {isExtra ? `${t('adminOrders.ticketExtra')}: ${choiceLabel}` : `+ ${choiceLabel}`}
                        </Typography>
                        {isExtra && (
                          <Typography variant="body2" color="primary.main" fontWeight={600}>
                            +{formatCurrency(priceDelta)}
                          </Typography>
                        )}
                      </Stack>
                    )
                  })}
                </Stack>
              )
            })}
          </Stack>
          <Divider sx={{ my: 2 }} />
          <Stack spacing={1}>
            <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
              <Typography color="text.secondary">{t('cart.subtotal')}</Typography>
              <Typography>{formatCurrency(order.subtotal)}</Typography>
            </Stack>
            {order.discount_amount > 0 && (
              <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                <Typography color="success.main">{t('checkout.discount')}</Typography>
                <Typography color="success.main">-{formatCurrency(order.discount_amount)}</Typography>
              </Stack>
            )}
            {order.combo_discount_amount > 0 && (
              <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                <Typography color="success.main">{t('cart.comboDiscount')}</Typography>
                <Typography color="success.main">-{formatCurrency(order.combo_discount_amount)}</Typography>
              </Stack>
            )}
            {order.order_type === 'delivery' && (
              <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                <Typography color="text.secondary">{t('cart.deliveryFee')}</Typography>
                <Typography>{formatCurrency(order.delivery_fee)}</Typography>
              </Stack>
            )}
            {order.tax_amount > 0 && (
              <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                <Typography color="text.secondary">{t('orderStatusPage.vat')}</Typography>
                <Typography>{formatCurrency(order.tax_amount)}</Typography>
              </Stack>
            )}
            <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
              <Typography fontWeight={700}>{t('cart.total')}</Typography>
              <Typography fontWeight={700}>{formatCurrency(order.total)}</Typography>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {order.order_type === 'delivery' && order.delivery_address && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>
              {t('checkout.deliveryAddress')}
            </Typography>
            {formatDeliveryAddress(order.delivery_address).map((line, index) => (
              <Typography key={index} color="text.secondary">
                {line}
              </Typography>
            ))}
          </CardContent>
        </Card>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            {t('orderStatusPage.payment')}
          </Typography>
          <Typography color="text.secondary">
            {formatOrderStatus(order.payment_method)} — {formatOrderStatus(order.payment_status)}
          </Typography>

          {order.payment_method === 'instapay' && order.instapay_details && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                {t('instapay.instructions')}
              </Alert>
              <Stack spacing={1.5}>
                <InstapayCopyField
                  label={t('instapay.bankName')}
                  value={(isRtl && order.instapay_details.bank_name_ar) || order.instapay_details.bank_name}
                  onCopy={handleCopy}
                />
                <InstapayCopyField
                  label={t('instapay.accountNumber')}
                  value={order.instapay_details.account_number}
                  onCopy={handleCopy}
                />
                {order.instapay_details.iban && (
                  <InstapayCopyField label={t('instapay.iban')} value={order.instapay_details.iban} onCopy={handleCopy} />
                )}
                <InstapayCopyField
                  label={t('instapay.beneficiary')}
                  value={order.instapay_details.beneficiary_name}
                  onCopy={handleCopy}
                />
              </Stack>

              <Box sx={{ mt: 2 }}>
                {order.payment_proof_url && (
                  <Box
                    component="img"
                    src={order.payment_proof_url}
                    alt={t('instapay.uploadProof')}
                    sx={{ maxWidth: 200, borderRadius: 1, display: 'block', mb: 1 }}
                  />
                )}
                <input ref={proofInputRef} type="file" accept="image/*" hidden onChange={handleProofFileChange} />
                <Button
                  variant="outlined"
                  size="small"
                  disabled={uploadingProof}
                  onClick={() => proofInputRef.current?.click()}
                >
                  {uploadingProof
                    ? t('instapay.uploading')
                    : order.payment_proof_url
                      ? t('instapay.replaceProof')
                      : t('instapay.uploadProof')}
                </Button>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      <Button variant="contained" onClick={() => navigate('/')}>
        {t('orderStatusPage.backToMenu')}
      </Button>
    </Box>
  )
}

export default OrderStatusPage
