import { useEffect } from 'react'
import { Drawer, Box, Typography, IconButton, Divider, Chip, Stack, Button } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import DeleteIcon from '@mui/icons-material/Delete'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { comboApi } from '../../api'
import {
  selectCart,
  selectCartTotal,
  selectAppliedCombo,
  updateQuantity,
  removeItem,
  setAppliedCombo,
  clearAppliedCombo, MAX_ITEM_QUANTITY } from '../../store'
import { formatCurrency } from '../../utils/format'

function CartDrawer({ open, onClose, restaurant }) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const cart = useSelector(selectCart)
  const subtotal = useSelector(selectCartTotal)
  const appliedCombo = useSelector(selectAppliedCombo)
  const currency = restaurant?.currency || 'EGP'
  const deliveryFee = cart.orderType === 'delivery' ? Number(restaurant?.delivery_fee) || 0 : 0
  const comboDiscount = appliedCombo ? Number(appliedCombo.discount_amount) || 0 : 0
  const vatRate = Number(restaurant?.vat_rate) || 0
  const discountedSubtotal = subtotal - comboDiscount
  const vatBase = discountedSubtotal + deliveryFee
  const tax = vatRate > 0 ? Number(((vatBase * vatRate) / 100).toFixed(2)) : 0
  const total = vatBase + tax

  const menuItemIdsKey = JSON.stringify(cart.items.map((item) => item.menu_item_id))

  useEffect(() => {
    const menuItemIds = cart.items.map((item) => item.menu_item_id)

    if (menuItemIds.length < 2) {
      dispatch(clearAppliedCombo())
      return
    }

    comboApi
      .checkCombos(menuItemIds)
      .then((res) => {
        const best = res.data.best_combo
        if (best) {
          dispatch(
            setAppliedCombo({
              combo_deal_id: best.id,
              name: best.name,
              discount_amount: best.discount_amount,
              discount_type: best.discount_type,
              discount_value: best.discount_value,
            })
          )
        } else {
          dispatch(clearAppliedCombo())
        }
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuItemIdsKey])

  const handleCheckout = () => {
    onClose()
    navigate('/checkout')
  }

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box
        sx={{
          width: { xs: '100vw', sm: 420 },
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6">{t('cart.yourCart')}</Typography>
        </Box>
        <Divider />

        <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
          {cart.items.length === 0 && (
            <Typography color="text.secondary">{t('cart.empty')}</Typography>
          )}

          <Stack spacing={2}>
            {cart.items.map((item, index) => {
              const choicesTotal = (item.choices || []).reduce(
                (sum, c) => sum + (Number(c.price_delta) || 0),
                0
              )
              const lineTotal = (Number(item.price) + choicesTotal) * item.quantity

              return (
                <Box key={index} sx={{ borderBottom: '1px solid #eee', pb: 2 }}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography fontWeight={600} sx={{ overflowWrap: 'anywhere' }}>
                        {item.name}
                      </Typography>
                      {(item.choices || []).length > 0 && (
                        <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                          {item.choices.map((c) => (
                            <Chip
                              key={c.id}
                              label={c.label}
                              size="small"
                              // long option labels wrap instead of stretching the row past the drawer edge
                              sx={{ maxWidth: '100%', height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal', overflowWrap: 'anywhere', py: 0.25 } }}
                            />
                          ))}
                        </Stack>
                      )}
                      {item.compare_at_price && Number(item.compare_at_price) > Number(item.price) && (
                        <Stack direction="row" spacing={1} sx={{ mt: 0.5, alignItems: 'center' }}>
                          <Typography variant="body2" sx={{ textDecoration: 'line-through', color: 'text.disabled' }}>
                            {formatCurrency(item.compare_at_price, currency)}
                          </Typography>
                          <Typography variant="body2" color="primary.main" fontWeight={600}>
                            {formatCurrency(item.price, currency)}
                          </Typography>
                        </Stack>
                      )}
                    </Box>
                    <IconButton size="small" onClick={() => dispatch(removeItem(index))} aria-label={t('cart.remove', { defaultValue: 'Remove' })} sx={{ flexShrink: 0 }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>

                  <Stack
                    direction="row"
                    sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 1 }}
                  >
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <IconButton
                        size="small"
                        onClick={() => dispatch(updateQuantity({ index, quantity: item.quantity - 1 }))}
                      >
                        <RemoveIcon fontSize="small" />
                      </IconButton>
                      <Typography>{item.quantity}</Typography>
                      <IconButton
                        size="small"
                        onClick={() => dispatch(updateQuantity({ index, quantity: item.quantity + 1 }))}
                        disabled={item.quantity >= MAX_ITEM_QUANTITY}
                      >
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                    <Typography fontWeight={600}>{formatCurrency(lineTotal, currency)}</Typography>
                  </Stack>
                </Box>
              )
            })}
          </Stack>

          {appliedCombo && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {t('cart.comboDeals')}
              </Typography>
              <Box sx={{ p: 1.5, bgcolor: 'success.light', borderRadius: 1 }}>
                <Typography variant="body2" color="success.dark" fontWeight={600}>
                  {t('cart.comboDealApplied', { name: appliedCombo.name, amount: formatCurrency(comboDiscount, currency) })}
                </Typography>
              </Box>
            </Box>
          )}
        </Box>

        <Divider />
        <Box sx={{ p: 2 }}>
          <Stack spacing={1} sx={{ mb: 2 }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
              <Typography color="text.secondary">{t('cart.subtotal')}</Typography>
              <Typography>{formatCurrency(subtotal, currency)}</Typography>
            </Stack>
            {appliedCombo && (
              <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                <Typography color="success.main">{t('cart.comboDiscount')}</Typography>
                <Typography color="success.main">-{formatCurrency(comboDiscount, currency)}</Typography>
              </Stack>
            )}
            {cart.orderType === 'delivery' && (
              <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                <Typography color="text.secondary">{t('cart.deliveryFee')}</Typography>
                <Typography>{formatCurrency(deliveryFee, currency)}</Typography>
              </Stack>
            )}
            {vatRate > 0 && (
              <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                <Typography color="text.secondary">{t('cart.vat', { rate: vatRate })}</Typography>
                <Typography>{formatCurrency(tax, currency)}</Typography>
              </Stack>
            )}
            <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
              <Typography fontWeight={700}>{t('cart.total')}</Typography>
              <Typography fontWeight={700}>{formatCurrency(total, currency)}</Typography>
            </Stack>
          </Stack>
          <Button fullWidth variant="contained" disabled={cart.items.length === 0} onClick={handleCheckout}>
            {t('cart.proceedToCheckout')}
          </Button>
        </Box>
      </Box>
    </Drawer>
  )
}

export default CartDrawer
