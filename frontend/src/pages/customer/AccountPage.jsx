import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  Box,
  Tabs,
  Tab,
  Card,
  CardMedia,
  CardContent,
  Typography,
  Chip,
  Stack,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import FavoriteIcon from '@mui/icons-material/Favorite'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { ordersApi, addressesApi, favoritesApi } from '../../api'
import { selectAuth, addItem } from '../../store'
import { formatCurrency, formatOrderStatus } from '../../utils/format'

const PAST_ORDER_STATUSES = ['delivered', 'completed', 'cancelled']

const EMPTY_ADDRESS = {
  label: '',
  street: '',
  district: '',
  city: '',
  building: '',
  floor: '',
  apartment: '',
  notes: '',
}

function AccountPage() {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.language === 'ar'
  const { customer } = useSelector(selectAuth)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const [tab, setTab] = useState(0)
  const [orders, setOrders] = useState([])
  const currentOrders = orders.filter((order) => !PAST_ORDER_STATUSES.includes(order.status))
  const pastOrders = orders.filter((order) => PAST_ORDER_STATUSES.includes(order.status))
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [ordersError, setOrdersError] = useState(false)

  const [addresses, setAddresses] = useState([])
  const [addressesLoading, setAddressesLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState(null)
  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS)

  const [favorites, setFavorites] = useState([])
  const [favoritesLoading, setFavoritesLoading] = useState(true)

  useEffect(() => {
    if (!customer) return

    ordersApi
      .getMyOrders()
      .then((res) => setOrders(res.data.orders))
      .catch(() => {
        setOrdersError(true)
        toast.error(t('account.failedToLoadOrders'))
      })
      .finally(() => setOrdersLoading(false))

    loadAddresses()
    loadFavorites()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer])

  const loadAddresses = () => {
    setAddressesLoading(true)
    addressesApi
      .list()
      .then((res) => setAddresses(res.data))
      .catch(() => toast.error(t('account.failedToLoadAddresses')))
      .finally(() => setAddressesLoading(false))
  }

  const loadFavorites = () => {
    setFavoritesLoading(true)
    favoritesApi
      .list()
      .then((res) => setFavorites(res.data))
      .catch(() => toast.error(t('account.failedToLoadFavorites')))
      .finally(() => setFavoritesLoading(false))
  }

  const handleRemoveFavorite = async (item) => {
    setFavorites((prev) => prev.filter((favorite) => favorite.id !== item.id))
    try {
      await favoritesApi.destroy(item.id)
    } catch {
      toast.error(t('account.failedToUpdateFavorite'))
      loadFavorites()
    }
  }

  const handleAddFavoriteToCart = (item) => {
    dispatch(
      addItem({
        menu_item_id: item.id,
        name: item.name,
        price: item.price,
        compare_at_price: item.compare_at_price,
        quantity: 1,
        choices: [],
      })
    )
    toast.success(t('menu.addedToCart', { name: item.name }))
  }

  if (!customer) {
    return <Navigate to="/" replace />
  }

  const openAddDialog = () => {
    setEditingAddress(null)
    setAddressForm(EMPTY_ADDRESS)
    setDialogOpen(true)
  }

  const openEditDialog = (address) => {
    setEditingAddress(address)
    setAddressForm(address)
    setDialogOpen(true)
  }

  const handleAddressSave = async () => {
    try {
      if (editingAddress) {
        await addressesApi.update(editingAddress.id, addressForm)
      } else {
        await addressesApi.create(addressForm)
      }
      setDialogOpen(false)
      loadAddresses()
      toast.success(t('account.addressSaved'))
    } catch (err) {
      toast.error(err.response?.data?.errors?.join(', ') || t('account.failedToSaveAddress'))
    }
  }

  const handleDelete = async (id) => {
    try {
      await addressesApi.destroy(id)
      loadAddresses()
    } catch {
      toast.error(t('account.failedToDeleteAddress'))
    }
  }

  const handleSetDefault = async (address) => {
    try {
      await addressesApi.update(address.id, { is_default: true })
      loadAddresses()
    } catch {
      toast.error(t('account.failedToSetDefaultAddress'))
    }
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        {t('nav.myAccount')}
      </Typography>

      <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label={t('account.currentOrders')} />
        <Tab label={t('account.pastOrders')} />
        <Tab label={t('account.savedAddresses')} />
        <Tab label={t('account.favorites')} />
      </Tabs>

      {(tab === 0 || tab === 1) && (
        <>
          {ordersLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : ordersError ? (
            <Typography color="error">{t('account.couldntLoadOrders')}</Typography>
          ) : (() => {
              const ordersToShow = tab === 0 ? currentOrders : pastOrders
              return ordersToShow.length === 0 ? (
                <Typography color="text.secondary">
                  {tab === 0 ? t('account.noCurrentOrders') : t('account.noPastOrders')}
                </Typography>
              ) : (
                <Stack spacing={2}>
                  {ordersToShow.map((order) => (
                    <Card
                      key={order.id}
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/orders/${order.id}`)}
                    >
                      <CardContent>
                        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography fontWeight={600}>{order.order_number}</Typography>
                          <Chip label={formatOrderStatus(order.status)} size="small" color="primary" />
                        </Stack>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {new Date(order.created_at).toLocaleString()}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          {order.items
                            .map((i) => `${i.quantity}× ${(isRtl && i.item_name_ar_snapshot) || i.item_name_snapshot}`)
                            .join(', ')}
                        </Typography>
                        <Typography fontWeight={700} sx={{ mt: 1 }}>
                          {formatCurrency(order.total)}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )
            })()}
        </>
      )}

      {tab === 2 && (
        <>
          <Button variant="contained" sx={{ mb: 2 }} onClick={openAddDialog}>
            {t('account.addAddress')}
          </Button>

          {addressesLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : addresses.length === 0 ? (
            <Typography color="text.secondary">{t('account.noSavedAddresses')}</Typography>
          ) : (
            <Stack spacing={2}>
              {addresses.map((address) => (
                <Card key={address.id}>
                  <CardContent>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Typography fontWeight={600}>{address.label || t('account.addressFallback')}</Typography>
                        <Typography color="text.secondary">
                          {[address.street, address.building, address.floor, address.apartment, address.city]
                            .filter(Boolean)
                            .join(', ')}
                        </Typography>
                      </Box>
                      <Stack direction="row">
                        <IconButton onClick={() => handleSetDefault(address)}>
                          {address.is_default ? <StarIcon color="primary" /> : <StarBorderIcon />}
                        </IconButton>
                        <IconButton onClick={() => openEditDialog(address)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton onClick={() => handleDelete(address.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </>
      )}

      {tab === 3 && (
        <>
          {favoritesLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : favorites.length === 0 ? (
            <Typography color="text.secondary">{t('account.noFavorites')}</Typography>
          ) : (
            <Stack spacing={2}>
              {favorites.map((item) => (
                <Card key={item.id}>
                  <Stack direction="row" sx={{ alignItems: 'center' }}>
                    {item.image_url && (
                      <CardMedia
                        component="img"
                        image={item.image_url}
                        alt={item.name}
                        sx={{ width: 96, height: 96, objectFit: 'cover' }}
                      />
                    )}
                    <CardContent sx={{ flex: 1 }}>
                      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box>
                          <Typography fontWeight={600}>{item.name}</Typography>
                          <Typography fontWeight={700} color="primary.main" sx={{ mt: 0.5 }}>
                            {formatCurrency(item.price)}
                          </Typography>
                        </Box>
                        <IconButton onClick={() => handleRemoveFavorite(item)} aria-label={t('menu.toggleFavorite')}>
                          <FavoriteIcon color="error" />
                        </IconButton>
                      </Stack>
                      <Button
                        variant="outlined"
                        size="small"
                        disabled={!item.available}
                        sx={{ mt: 1 }}
                        onClick={() => handleAddFavoriteToCart(item)}
                      >
                        {t('account.addToCart')}
                      </Button>
                    </CardContent>
                  </Stack>
                </Card>
              ))}
            </Stack>
          )}
        </>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingAddress ? t('account.editAddress') : t('account.addAddress')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label={t('account.label')}
              value={addressForm.label || ''}
              onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
            />
            <TextField
              label={t('account.street')}
              required
              value={addressForm.street || ''}
              onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
            />
            <TextField
              label={t('account.district')}
              value={addressForm.district || ''}
              onChange={(e) => setAddressForm({ ...addressForm, district: e.target.value })}
            />
            <TextField
              label={t('checkout.city')}
              required
              value={addressForm.city || ''}
              onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
            />
            <TextField
              label={t('deliveryMap.building')}
              value={addressForm.building || ''}
              onChange={(e) => setAddressForm({ ...addressForm, building: e.target.value })}
            />
            <TextField
              label={t('deliveryMap.floor')}
              value={addressForm.floor || ''}
              onChange={(e) => setAddressForm({ ...addressForm, floor: e.target.value })}
            />
            <TextField
              label={t('deliveryMap.apartment')}
              value={addressForm.apartment || ''}
              onChange={(e) => setAddressForm({ ...addressForm, apartment: e.target.value })}
            />
            <TextField
              label={t('account.notes')}
              multiline
              rows={2}
              value={addressForm.notes || ''}
              onChange={(e) => setAddressForm({ ...addressForm, notes: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{t('account.cancel')}</Button>
          <Button variant="contained" onClick={handleAddressSave}>
            {t('account.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default AccountPage
