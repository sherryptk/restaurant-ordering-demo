import { useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { createConsumer } from '@rails/actioncable'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  Chip,
  Button,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  TextField,
} from '@mui/material'
import PrintIcon from '@mui/icons-material/Print'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import i18n from '../../i18n'
import { adminOrdersApi, adminUsersApi, adminBranchApi } from '../../api'
import { selectAdminRole } from '../../store'
import { formatCurrency, formatOrderStatus, formatDeliveryAddress } from '../../utils/format'
import EstimatedTimeAdjuster from '../../components/admin/EstimatedTimeAdjuster'

dayjs.extend(relativeTime)

const STATUS_FLOW = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'completed']
const FILTER_OPTIONS = ['all', ...STATUS_FLOW, 'cancelled']
const DONE_STATUSES = ['completed', 'delivered', 'cancelled']

function nextStatus(status) {
  const index = STATUS_FLOW.indexOf(status)
  if (index === -1 || index === STATUS_FLOW.length - 1) return null
  return STATUS_FLOW[index + 1]
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

const DIVIDER = '='.repeat(32)
const THIN_DIVIDER = '-'.repeat(32)

function ticketOrderTypeLabel(orderType) {
  if (orderType === 'pickup') return i18n.t('adminOrders.ticketPickup')
  if (orderType === 'delivery') return i18n.t('adminOrders.ticketDelivery')
  return String(orderType).toUpperCase()
}

function ticketPaymentLabel(paymentMethod) {
  const key = { cash: 'ticketCash', paymob: 'ticketPaymob', kashier: 'ticketKashier' }[paymentMethod]
  return key ? i18n.t(`adminOrders.${key}`) : String(paymentMethod).toUpperCase()
}

function generateOrderTicketHTML(order) {
  const isRtl = i18n.language === 'ar'
  const t = (key) => i18n.t(`adminOrders.${key}`)

  const ticketRow = (label, amount, negative = false) => {
    const sign = negative ? '-' : ''
    if (isRtl) return `${label}: ${sign}EGP ${amount}`
    return `${label}:`.padEnd(19) + `${sign}EGP ${amount}`
  }

  const address = order.delivery_address || {}
  const addressLines = formatDeliveryAddress(address)

  const customerName = order.customer?.name || order.guest_name || t('guest')
  const phone = order.guest_phone || '—'

  const itemLines = order.items
    .map((item) => {
      const itemName = (isRtl && item.item_name_ar_snapshot) || item.item_name_snapshot
      const lines = [`${item.quantity}x ${itemName}`]
      ;(item.choices_snapshot || []).forEach((c) => {
        if (!c.label) return
        const choiceLabel = (isRtl && c.label_ar) || c.label
        const priceDelta = Number(c.price_delta) || 0
        if (priceDelta > 0) {
          lines.push(`     ${t('ticketExtra')}: ${choiceLabel} (+EGP ${priceDelta.toFixed(2)})`)
        } else {
          lines.push(`     + ${choiceLabel}`)
        }
      })
      lines.push(`     EGP ${Number(item.line_total).toFixed(2)}`)
      return lines.join('\n')
    })
    .join('\n')

  const deliveryFee = Number(order.delivery_fee) || 0
  const discount = Number(order.discount_amount) || 0

  const lines = [
    DIVIDER,
    "       Demo Café",
    `     ${t('ticketOrderTitle')}`,
    DIVIDER,
    `${t('ticketOrder')}: ${order.order_number}`,
    `${t('ticketDate')}: ${dayjs(order.created_at).format('YYYY-MM-DD HH:mm')}`,
    `${t('ticketType')}: ${ticketOrderTypeLabel(order.order_type)}`,
    `${t('ticketPayment')}: ${ticketPaymentLabel(order.payment_method)}`,
    DIVIDER,
    `${t('ticketCustomer')}: ${customerName}`,
    `${t('ticketPhone')}: ${phone}`,
  ]

  if (order.order_type === 'delivery' && addressLines.length > 0) {
    lines.push(`${t('ticketAddress')}:`)
    addressLines.forEach((line) => lines.push(`  ${line}`))
  }

  lines.push(DIVIDER, `${t('ticketItems')}:`, itemLines, THIN_DIVIDER)
  lines.push(ticketRow(t('ticketSubtotal'), Number(order.subtotal).toFixed(2)))
  if (discount > 0) {
    lines.push(ticketRow(t('ticketDiscount'), discount.toFixed(2), true))
  }
  if (deliveryFee > 0) {
    lines.push(ticketRow(t('ticketDeliveryFee'), deliveryFee.toFixed(2)))
  }
  if (Number(order.tax_amount) > 0) {
    lines.push(ticketRow(t('ticketVat'), Number(order.tax_amount).toFixed(2)))
  }

  lines.push(DIVIDER, ticketRow(t('ticketTotal'), Number(order.total).toFixed(2)), DIVIDER)

  if (order.notes) {
    lines.push(`${t('ticketNotes')}: ${order.notes}`, DIVIDER)
  }

  lines.push(`     ${t('ticketThankYou')}`, '  demo.example.com', DIVIDER)

  const ticketText = escapeHtml(lines.join('\n'))
  const fontFamily = isRtl ? "'Cairo', sans-serif" : "'Courier New', Courier, monospace"
  const fontLink = isRtl
    ? '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap">'
    : ''

  return `<!DOCTYPE html>
<html lang="${isRtl ? 'ar' : 'en'}" dir="${isRtl ? 'rtl' : 'ltr'}">
<head>
<title>Order ${escapeHtml(order.order_number)}</title>
${fontLink}
<style>
  body {
    font-family: ${fontFamily};
    max-width: 300px;
    margin: 0 auto;
    padding: 12px;
    background: #fff;
    color: #000;
    font-size: 12px;
    direction: ${isRtl ? 'rtl' : 'ltr'};
  }
  pre {
    white-space: pre-wrap;
    word-wrap: break-word;
    margin: 0;
    font-family: inherit;
    text-align: ${isRtl ? 'right' : 'left'};
  }
  @media print {
    body { margin: 0; }
  }
</style>
</head>
<body>
<pre>${ticketText}</pre>
<script>
  window.onload = () => window.print();
</script>
</body>
</html>`
}

function printOrder(order) {
  const printWindow = window.open('', '_blank', 'width=400,height=600')
  printWindow.document.write(generateOrderTicketHTML(order))
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
  printWindow.close()
}

function AdminOrdersPage() {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.language === 'ar'
  const adminRole = useSelector(selectAdminRole)
  const canAssignDriver = adminRole === 'admin' || adminRole === 'operator'
  const canManagePayments = adminRole === 'admin' || adminRole === 'operator'

  const isSuperAdmin = adminRole === 'admin'

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [branches, setBranches] = useState([])
  const [branchFilter, setBranchFilter] = useState('all')
  const [drivers, setDrivers] = useState([])
  const [driverSelections, setDriverSelections] = useState({})
  const [driverFilter, setDriverFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('')

  useEffect(() => {
    if (!canAssignDriver) return
    adminUsersApi
      .list()
      .then((res) =>
        setDrivers(res.data.filter((user) => user.role === 'driver'))
      )
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAssignDriver])

  useEffect(() => {
    if (!isSuperAdmin) return
    adminBranchApi
      .list()
      .then((res) => setBranches(res.data))
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin])

  const loadOrders = (status, branchId, driverId, date) => {
    setLoading(true)
    const params = {}
    if (status && status !== 'all') params.status = status
    if (branchId && branchId !== 'all') params.branch_id = branchId
    if (driverId && driverId !== 'all') params.driver_id = driverId
    if (date) params.date = date

    adminOrdersApi
      .list(params)
      .then((res) => setOrders(res.data.orders))
      .catch(() => toast.error(t('adminOrders.failedToLoadOrders')))
      .finally(() => setLoading(false))
  }

  const filtersRef = useRef({ statusFilter, branchFilter, driverFilter, dateFilter })
  useEffect(() => {
    filtersRef.current = { statusFilter, branchFilter, driverFilter, dateFilter }
  }, [statusFilter, branchFilter, driverFilter, dateFilter])

  useEffect(() => {
    loadOrders(statusFilter, branchFilter, driverFilter, dateFilter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, branchFilter, driverFilter, dateFilter])

  useEffect(() => {
    const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:3000'}/cable`
    const consumer = createConsumer(wsUrl)

    // Re-sync on both `received` and `connected` — `connected` also fires on
    // every reconnect (dropped connection, proxy idle timeout, tab wake from
    // sleep), which otherwise silently swallows any broadcast that happened
    // while disconnected until the admin manually refreshes the page.
    const refresh = () => {
      const { statusFilter, branchFilter, driverFilter, dateFilter } = filtersRef.current
      loadOrders(statusFilter, branchFilter, driverFilter, dateFilter)
    }

    const subscription = consumer.subscriptions.create(
      { channel: 'AdminOrdersChannel' },
      {
        connected: refresh,
        received: refresh,
      }
    )

    return () => {
      subscription.unsubscribe()
      consumer.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleOrderUpdated = (updatedOrder) => {
    setOrders((prev) => prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o)))
  }

  const handleStatusUpdate = async (order, status) => {
    try {
      const res = await adminOrdersApi.updateStatus(order.id, status)
      handleOrderUpdated(res.data)
    } catch {
      toast.error(t('adminCombo.failedToUpdateStatus'))
    }
  }

  const handleMarkPaid = async (order) => {
    try {
      const res = await adminOrdersApi.updatePaymentStatus(order.id, 'paid')
      toast.success(t('adminOrders.paymentMarkedPaid'))
      handleOrderUpdated(res.data)
    } catch {
      toast.error(t('adminOrders.failedToUpdatePaymentStatus'))
    }
  }

  const handleAssignDriver = async (order) => {
    const driverId = driverSelections[order.id]
    if (!driverId) return

    try {
      const res = await adminOrdersApi.assignDriver(order.id, driverId)
      toast.success(t('adminOrders.driverAssigned'))
      handleOrderUpdated(res.data)
    } catch {
      toast.error(t('adminOrders.failedToAssignDriver'))
    }
  }

  const sortedOrders = [...orders].sort((a, b) => {
    const aDone = DONE_STATUSES.includes(a.status)
    const bDone = DONE_STATUSES.includes(b.status)
    if (aDone === bDone) return new Date(b.created_at) - new Date(a.created_at)
    return aDone ? 1 : -1
  })

  return (
    <Box>
      <Stack
        direction="row"
        sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', rowGap: 2, mb: 3 }}
      >
        <Typography variant="h4" fontWeight={700}>
          {t('admin.nav.orders')}
        </Typography>
        <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
          {isSuperAdmin && (
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>{t('admin.nav.branches')}</InputLabel>
              <Select value={branchFilter} label={t('admin.nav.branches')} onChange={(e) => setBranchFilter(e.target.value)}>
                <MenuItem value="all">{t('adminOrders.allBranches')}</MenuItem>
                {branches.map((branch) => (
                  <MenuItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          {canAssignDriver && (
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>{t('adminOrders.driver')}</InputLabel>
              <Select value={driverFilter} label={t('adminOrders.driver')} onChange={(e) => setDriverFilter(e.target.value)}>
                <MenuItem value="all">{t('adminOrders.allDrivers')}</MenuItem>
                {drivers.map((driver) => (
                  <MenuItem key={driver.id} value={driver.id}>
                    {driver.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>{t('adminCombo.status')}</InputLabel>
            <Select value={statusFilter} label={t('adminCombo.status')} onChange={(e) => setStatusFilter(e.target.value)}>
              {FILTER_OPTIONS.map((option) => (
                <MenuItem key={option} value={option}>
                  {option === 'all' ? t('adminOrders.all') : formatOrderStatus(option)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            type="date"
            size="small"
            label={t('adminOrders.date')}
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ minWidth: 160 }}
          />
          {dateFilter && (
            <Button size="small" onClick={() => setDateFilter('')}>
              {t('adminOrders.clearDateFilter')}
            </Button>
          )}
        </Stack>
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
          <CircularProgress />
        </Box>
      ) : orders.length === 0 ? (
        <Typography color="text.secondary">{t('adminOrders.noOrdersFound')}</Typography>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 2 }}>
          {sortedOrders.map((order) => {
            const next = nextStatus(order.status)
            const isDone = DONE_STATUSES.includes(order.status)
            return (
              <Card key={order.id} sx={isDone ? { opacity: 0.6 } : undefined}>
                <CardContent>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography fontWeight={700}>{order.order_number}</Typography>
                    <Stack direction="row" spacing={0.5}>
                      {order.branch && <Chip label={order.branch.name} size="small" variant="outlined" />}
                      <Chip label={order.order_type === 'delivery' ? t('menu.delivery') : t('menu.pickup')} size="small" />
                    </Stack>
                  </Stack>

                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {order.customer?.name || order.guest_name || t('adminOrders.guest')} ·{' '}
                    {order.customer?.email || order.guest_phone || ''}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {dayjs(order.created_at).fromNow()}
                  </Typography>

                  {order.order_type === 'delivery' && order.delivery_address && (
                    <Box sx={{ mt: 1 }}>
                      {formatDeliveryAddress(order.delivery_address).map((line, index) => (
                        <Typography key={index} variant="body2">
                          {line}
                        </Typography>
                      ))}
                      {(() => {
                        const fullAddress = [
                          order.delivery_address.street,
                          order.delivery_address.building,
                          order.delivery_address.floor,
                          order.delivery_address.apartment,
                          order.delivery_address.city,
                        ]
                          .filter(Boolean)
                          .join(', ')

                        if (!fullAddress) return null

                        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          `${fullAddress}, Egypt`
                        )}`

                        return (
                          <Typography
                            component="a"
                            href={mapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            variant="body2"
                            sx={{ color: 'primary.dark', textDecoration: 'none' }}
                          >
                            {t('adminOrders.viewOnMap')}
                          </Typography>
                        )
                      })()}
                    </Box>
                  )}

                  <Stack spacing={0.5} sx={{ mt: 1.5 }}>
                    {order.items.map((item) => (
                      <Stack key={item.id} spacing={0.25}>
                        <Typography variant="body2">
                          {item.quantity}× {(isRtl && item.item_name_ar_snapshot) || item.item_name_snapshot}
                        </Typography>
                        {(item.choices_snapshot || []).map((choice, index) => {
                          if (!choice.label) return null
                          const choiceLabel = (isRtl && choice.label_ar) || choice.label
                          const priceDelta = Number(choice.price_delta) || 0
                          const isExtra = priceDelta > 0
                          return (
                            <Stack key={index} direction="row" sx={{ justifyContent: 'space-between', pl: 2 }}>
                              <Typography
                                variant="caption"
                                color={isExtra ? 'primary.main' : 'text.secondary'}
                                fontWeight={isExtra ? 600 : 400}
                              >
                                {isExtra ? `${t('adminOrders.ticketExtra')}: ${choiceLabel}` : `+ ${choiceLabel}`}
                              </Typography>
                              {isExtra && (
                                <Typography variant="caption" color="primary.main" fontWeight={600}>
                                  +{formatCurrency(priceDelta)}
                                </Typography>
                              )}
                            </Stack>
                          )
                        })}
                      </Stack>
                    ))}
                  </Stack>

                  {order.tax_amount > 0 && (
                    <Stack direction="row" sx={{ justifyContent: 'space-between', mt: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        {t('orderStatusPage.vat')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatCurrency(order.tax_amount)}
                      </Typography>
                    </Stack>
                  )}

                  {!isDone && <EstimatedTimeAdjuster order={order} onOrderUpdated={handleOrderUpdated} />}

                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 1.5 }}>
                    <Typography fontWeight={700}>{formatCurrency(order.total)}</Typography>
                    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                      <Chip label={formatOrderStatus(order.status)} size="small" color="primary" />
                      <IconButton size="small" onClick={() => printOrder(order)} title={t('adminOrders.printTicket')}>
                        <PrintIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>

                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', mt: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      {formatOrderStatus(order.payment_method)} · {formatOrderStatus(order.payment_status)}
                    </Typography>

                    {order.payment_proof_url && (
                      <Typography
                        component="a"
                        href={order.payment_proof_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="caption"
                        sx={{ color: 'primary.dark' }}
                      >
                        {t('adminOrders.viewPaymentProof')}
                      </Typography>
                    )}

                    {canManagePayments && order.payment_status === 'unpaid' && (
                      <Button size="small" variant="text" sx={{ minWidth: 0, py: 0 }} onClick={() => handleMarkPaid(order)}>
                        {t('adminOrders.markAsPaid')}
                      </Button>
                    )}
                  </Stack>

                  {order.driver && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {t('adminOrders.driverName', { name: order.driver.name })}
                    </Typography>
                  )}

                  {canAssignDriver && order.order_type === 'delivery' && (
                    <Stack direction="row" spacing={1} sx={{ mt: 1.5, alignItems: 'center' }}>
                      <FormControl size="small" sx={{ minWidth: 140, flex: 1 }}>
                        <InputLabel>{t('adminOrders.driver')}</InputLabel>
                        <Select
                          label={t('adminOrders.driver')}
                          value={driverSelections[order.id] || ''}
                          onChange={(e) =>
                            setDriverSelections({ ...driverSelections, [order.id]: e.target.value })
                          }
                        >
                          {drivers
                            .filter((driver) => !driver.branch_id || driver.branch_id === order.branch?.id)
                            .map((driver) => (
                              <MenuItem key={driver.id} value={driver.id}>
                                {driver.name}
                              </MenuItem>
                            ))}
                        </Select>
                      </FormControl>
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={!driverSelections[order.id]}
                        onClick={() => handleAssignDriver(order)}
                      >
                        {t('adminOrders.assign')}
                      </Button>
                    </Stack>
                  )}

                  <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                    {adminRole === 'driver' ? (
                      order.status === 'out_for_delivery' && (
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => handleStatusUpdate(order, 'delivered')}
                        >
                          {t('adminOrders.markAsDelivered')}
                        </Button>
                      )
                    ) : (
                      <>
                        {next && (
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleStatusUpdate(order, next)}
                          >
                            {t('adminOrders.markAs', { status: formatOrderStatus(next) })}
                          </Button>
                        )}
                        {order.status === 'pending' && (
                          <Button size="small" color="error" onClick={() => handleStatusUpdate(order, 'cancelled')}>
                            {t('account.cancel')}
                          </Button>
                        )}
                      </>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            )
          })}
        </Box>
      )}
    </Box>
  )
}

export default AdminOrdersPage
