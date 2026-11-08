import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { Box, Typography, Card, CardContent, Stack, Chip, Button, Tabs, Tab, CircularProgress } from '@mui/material'
import NavigationIcon from '@mui/icons-material/Navigation'
import dayjs from 'dayjs'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { adminOrdersApi } from '../../api'
import { selectAdminPhone } from '../../store'
import { formatCurrency, formatDeliveryAddress, formatOrderStatus } from '../../utils/format'
import EstimatedTimeAdjuster from '../../components/admin/EstimatedTimeAdjuster'

const ACTIVE_STATUSES_EXCLUDED = ['delivered', 'completed', 'cancelled']
const HISTORY_STATUSES = ['delivered', 'completed']
const POLL_INTERVAL_MS = 30000

function getOsmTileUrl(lat, lng, zoom = 15) {
  const latRad = (Number(lat) * Math.PI) / 180
  const n = Math.pow(2, zoom)
  const x = Math.floor(((Number(lng) + 180) / 360) * n)
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  )
  return `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`
}

function DeliveryLocationMap({ lat, lng, alt }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  const googleUrl = apiKey
    ? `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=300x150&markers=color:red%7C${lat},${lng}&key=${apiKey}`
    : getOsmTileUrl(lat, lng)

  const [src, setSrc] = useState(googleUrl)
  const [failed, setFailed] = useState(false)

  const handleError = () => {
    const osmUrl = getOsmTileUrl(lat, lng)
    if (src !== osmUrl) {
      setSrc(osmUrl)
    } else {
      setFailed(true)
    }
  }

  if (failed) return null

  return (
    <Box
      component="img"
      src={src}
      alt={alt}
      onError={handleError}
      sx={{
        width: '100%',
        maxWidth: 300,
        height: 150,
        borderRadius: 1,
        mt: 1,
        objectFit: 'cover',
        border: '1px solid',
        borderColor: 'divider',
      }}
    />
  )
}

function DriverPortalPage() {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.language === 'ar'
  const adminPhone = useSelector(selectAdminPhone)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('active')

  const loadOrders = () => {
    adminOrdersApi
      .list()
      .then((res) => setOrders(res.data.orders))
      .catch(() => toast.error(t('driverPortal.failedToLoadDeliveries')))
      .finally(() => setLoading(false))
  }

  const activeOrders = useMemo(
    () => orders.filter((o) => !ACTIVE_STATUSES_EXCLUDED.includes(o.status)),
    [orders]
  )
  const historyOrders = useMemo(
    () => orders.filter((o) => HISTORY_STATUSES.includes(o.status)),
    [orders]
  )
  const visibleOrders = tab === 'active' ? activeOrders : historyOrders

  useEffect(() => {
    loadOrders()
    const interval = setInterval(loadOrders, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  const handleMarkDelivered = async (order) => {
    try {
      await adminOrdersApi.updateStatus(order.id, 'delivered')
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: 'delivered' } : o)))
      toast.success(t('driverPortal.markedAsDelivered'))
    } catch {
      toast.error(t('adminCombo.failedToUpdateStatus'))
    }
  }

  const handleOrderUpdated = (updatedOrder) => {
    setOrders((prev) => prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o)))
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
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>
          {t('driverPortal.myDeliveries')}
        </Typography>
        {adminPhone && (
          <Typography variant="body2" color="text.secondary">
            {adminPhone}
          </Typography>
        )}
      </Box>

      <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 2 }}>
        <Tab label={t('driverPortal.active')} value="active" />
        <Tab label={t('driverPortal.history')} value="history" />
      </Tabs>

      {visibleOrders.length === 0 ? (
        <Typography color="text.secondary">
          {tab === 'active' ? t('driverPortal.noDeliveriesYet') : t('driverPortal.noHistoryYet')}
        </Typography>
      ) : tab === 'history' ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 2 }}>
          {visibleOrders.map((order) => {
            const customerName = order.customer?.name || order.guest_name || t('adminOrders.guest')
            const addressLines = formatDeliveryAddress(order.delivery_address || {})

            return (
              <Card key={order.id} sx={{ opacity: 0.85 }}>
                <CardContent>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography fontWeight={700}>{order.order_number}</Typography>
                    <Chip label={formatOrderStatus(order.status)} size="small" color="primary" />
                  </Stack>

                  <Typography variant="body2" sx={{ mt: 0.5 }}>{customerName}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {dayjs(order.created_at).format('YYYY-MM-DD HH:mm')}
                  </Typography>

                  {addressLines.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      {addressLines.map((line, index) => (
                        <Typography key={index} variant="body2" color="text.secondary">
                          {line}
                        </Typography>
                      ))}
                    </Box>
                  )}

                  <Stack spacing={0.5} sx={{ mt: 1.5 }}>
                    {order.items.map((item) => (
                      <Typography variant="body2" key={item.id}>
                        {item.quantity}× {(isRtl && item.item_name_ar_snapshot) || item.item_name_snapshot}
                      </Typography>
                    ))}
                  </Stack>

                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 1.5, flexWrap: 'wrap', gap: 1 }}>
                    <Typography fontWeight={700}>
                      {formatCurrency(order.total)}
                    </Typography>
                    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                      {order.payment_method && (
                        <Chip label={formatOrderStatus(order.payment_method)} variant="outlined" size="small" />
                      )}
                      <Chip
                        label={formatOrderStatus(order.payment_status || 'unpaid')}
                        size="small"
                        color={order.payment_status === 'paid' ? 'success' : 'warning'}
                      />
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            )
          })}
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 2 }}>
          {visibleOrders.map((order) => {
            const customerName = order.customer?.name || order.guest_name || t('adminOrders.guest')
            const phone = order.guest_phone
            const address = order.delivery_address || {}
            const hasCoords = address.lat != null && address.lng != null
            const addressLines = formatDeliveryAddress(address)

            const directionsUrl = hasCoords
              ? `https://www.google.com/maps/dir/?api=1&destination=${address.lat},${address.lng}`
              : null

            return (
              <Card key={order.id}>
                <CardContent>
                  <Typography fontWeight={700}>{order.order_number}</Typography>

                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {customerName}
                    {phone && (
                      <>
                        {' · '}
                        <Typography component="a" href={`tel:${phone}`} sx={{ color: 'primary.dark' }}>
                          {phone}
                        </Typography>
                      </>
                    )}
                  </Typography>

                  {addressLines.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      {addressLines.map((line, index) => (
                        <Typography
                          key={index}
                          variant="body1"
                          fontWeight={index === 0 ? 700 : 500}
                          sx={{ fontSize: '1.05rem', lineHeight: 1.4 }}
                        >
                          {index === 0 ? `📍 ${line}` : line}
                        </Typography>
                      ))}
                    </Box>
                  )}

                  {hasCoords && (
                    <DeliveryLocationMap
                      lat={address.lat}
                      lng={address.lng}
                      alt={t('driverPortal.deliveryLocation')}
                    />
                  )}

                  {directionsUrl && (
                    <Button
                      fullWidth
                      variant="contained"
                      color="info"
                      startIcon={<NavigationIcon />}
                      sx={{ mt: 1 }}
                      href={directionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t('driverPortal.getDirections')}
                    </Button>
                  )}

                  <Stack spacing={0.5} sx={{ mt: 1.5 }}>
                    {order.items.map((item) => (
                      <Typography variant="body2" key={item.id}>
                        {item.quantity}× {(isRtl && item.item_name_ar_snapshot) || item.item_name_snapshot}
                      </Typography>
                    ))}
                  </Stack>

                  <EstimatedTimeAdjuster order={order} onOrderUpdated={handleOrderUpdated} />

                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 1.5, flexWrap: 'wrap', gap: 1 }}>
                    <Typography fontWeight={700}>
                      {formatCurrency(order.total)}
                    </Typography>
                    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                      {order.payment_method && (
                        <Chip label={formatOrderStatus(order.payment_method)} variant="outlined" size="small" />
                      )}
                      <Chip
                        label={formatOrderStatus(order.payment_status || 'unpaid')}
                        size="small"
                        color={order.payment_status === 'paid' ? 'success' : 'warning'}
                      />
                    </Stack>
                  </Stack>

                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={order.status !== 'out_for_delivery'}
                    sx={{ mt: 2 }}
                    onClick={() => handleMarkDelivered(order)}
                  >
                    {t('adminOrders.markAsDelivered')}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </Box>
      )}
    </Box>
  )
}

export default DriverPortalPage
