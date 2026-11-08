import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Typography,
  Card,
  CardContent,
  Stack,
  ToggleButtonGroup,
  ToggleButton,
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  Button,
  Divider,
  Alert,
  MenuItem,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { ordersApi, promoApi, addressesApi, phonesApi } from '../../api'
import {
  selectCart,
  selectAuth,
  selectRestaurant,
  selectCartTotal,
  selectAppliedCombo,
  selectSelectedBranch,
  setOrderType,
  setPaymentMethod,
  setSelectedBranch,
  clearCart,
} from '../../store'
import { formatCurrency, formatDeliveryAddress } from '../../utils/format'
import DeliveryMap from '../../components/customer/DeliveryMap'

function CheckoutPage() {
  const { t } = useTranslation()
  const STEPS = [t('checkout.stepReview'), t('checkout.stepDetails'), t('checkout.stepPayment')]
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const cart = useSelector(selectCart)
  const { customer } = useSelector(selectAuth)
  const restaurant = useSelector(selectRestaurant)
  const subtotal = useSelector(selectCartTotal)
  const appliedCombo = useSelector(selectAppliedCombo)
  const selectedBranch = useSelector(selectSelectedBranch)

  const [activeStep, setActiveStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const [guestName, setGuestName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [guestEmail, setGuestEmail] = useState('')

  const [deliveryAddress, setDeliveryAddressState] = useState({
    lat: null,
    lng: null,
    street: '',
    building: '',
    floor: '',
    apartment: '',
    notes: '',
  })
  const [deliveryZone, setDeliveryZone] = useState(null)
  const [hasDeliveryLocation, setHasDeliveryLocation] = useState(false)
  const [locationErrorShown, setLocationErrorShown] = useState(false)

  const [promoCodeInput, setPromoCodeInput] = useState('')
  const [appliedPromoCode, setAppliedPromoCode] = useState(null)
  const [promoResult, setPromoResult] = useState(null)
  const [promoApplying, setPromoApplying] = useState(false)

  const [savedAddresses, setSavedAddresses] = useState([])
  const [addressesLoaded, setAddressesLoaded] = useState(false)
  const [selectedAddressId, setSelectedAddressId] = useState(null)
  const [showAddressPicker, setShowAddressPicker] = useState(false)
  const [saveNewAddress, setSaveNewAddress] = useState(false)
  const [newAddressLabel, setNewAddressLabel] = useState('')
  const [newAddressCity, setNewAddressCity] = useState('')

  const [savedPhones, setSavedPhones] = useState([])
  const [phonesLoaded, setPhonesLoaded] = useState(false)
  const [selectedPhoneId, setSelectedPhoneId] = useState(null)
  const [saveNewPhone, setSaveNewPhone] = useState(false)

  const currency = restaurant.info?.currency || 'EGP'
  const isDelivery = cart.orderType === 'delivery'
  const deliveryAddressLines = formatDeliveryAddress(deliveryAddress)
  const deliveryFee = isDelivery ? Number(deliveryZone?.delivery_fee ?? restaurant.info?.delivery_fee) || 0 : 0
  const discountAmount = promoResult?.valid ? Number(promoResult.discount_amount) || 0 : 0
  const comboDiscountAmount = appliedCombo ? Number(appliedCombo.discount_amount) || 0 : 0
  const vatRate = Number(restaurant.info?.vat_rate) || 0
  const discountedSubtotal = subtotal - discountAmount - comboDiscountAmount
  const vatBase = discountedSubtotal + deliveryFee
  const taxAmount = vatRate > 0 ? Number(((vatBase * vatRate) / 100).toFixed(2)) : 0
  const total = vatBase + taxAmount

  const detailsValid = (customer && isDelivery) || (guestName.trim() && guestPhone.trim())
  const deliveryValid = !isDelivery || (deliveryAddress.lat != null && deliveryAddress.lng != null && deliveryZone != null)
  const selectedAddress = savedAddresses.find((a) => a.id === selectedAddressId) || null

  useEffect(() => {
    if (!customer) return
    setGuestName((prev) => prev || customer.name || '')
    setGuestEmail((prev) => prev || customer.email || '')
  }, [customer])

  useEffect(() => {
    if (!customer || isDelivery || phonesLoaded) return

    phonesApi
      .list()
      .then((res) => {
        setSavedPhones(res.data)
        const defaultPhone = res.data.find((p) => p.is_default) || res.data[0]
        if (defaultPhone) {
          setSelectedPhoneId(defaultPhone.id)
          setGuestPhone(defaultPhone.number)
        }
      })
      .catch(() => {})
      .finally(() => setPhonesLoaded(true))
  }, [customer, isDelivery, phonesLoaded])

  const handleSelectPhone = (value) => {
    if (value === 'new') {
      setSelectedPhoneId(null)
      setGuestPhone('')
      return
    }
    const phone = savedPhones.find((p) => p.id === Number(value))
    if (!phone) return
    setSelectedPhoneId(phone.id)
    setGuestPhone(phone.number)
  }

  useEffect(() => {
    if (!customer || !isDelivery || addressesLoaded) return

    addressesApi
      .list()
      .then((res) => {
        setSavedAddresses(res.data)
        // Prefer the explicit default, but fall back to the first saved
        // address rather than forcing a manual map pick — having any saved
        // address at all should be enough to skip that friction.
        const defaultAddress = res.data.find((a) => a.is_default) || res.data[0]
        if (defaultAddress) {
          setSelectedAddressId(defaultAddress.id)
        }
      })
      .catch(() => {})
      .finally(() => setAddressesLoaded(true))
  }, [customer, isDelivery, addressesLoaded])

  const handleDeliveryBranchChange = (branch) => {
    dispatch(setSelectedBranch(branch))
  }

  const handleDeliveryLocationChange = (_lat, _lng, zone, hasLocation) => {
    setDeliveryZone(zone)
    setHasDeliveryLocation(hasLocation)
    if (hasLocation) setLocationErrorShown(false)
  }

  const handleSelectAddress = (address) => {
    setSelectedAddressId(address.id)
    setShowAddressPicker(false)
  }

  const handleAddNewAddress = () => {
    setSelectedAddressId(null)
    setShowAddressPicker(false)
  }

  const handleNext = () => {
    if (activeStep === 1 && isDelivery && !hasDeliveryLocation) {
      setLocationErrorShown(true)
      return
    }
    setActiveStep((s) => Math.min(s + 1, STEPS.length - 1))
  }
  const handleBack = () => setActiveStep((s) => Math.max(s - 1, 0))

  const handleApplyPromo = async () => {
    setPromoApplying(true)
    try {
      const res = await promoApi.validate(promoCodeInput.trim(), subtotal, guestPhone || undefined)
      setPromoResult(res.data)
      setAppliedPromoCode(res.data.valid ? promoCodeInput.trim() : null)
    } catch {
      setPromoResult({ valid: false, error: t('checkout.failedToValidatePromo') })
      setAppliedPromoCode(null)
    } finally {
      setPromoApplying(false)
    }
  }

  const handleRemovePromo = () => {
    setAppliedPromoCode(null)
    setPromoResult(null)
    setPromoCodeInput('')
  }

  const handlePlaceOrder = async () => {
    if (selectedBranch?.currently_open === false) {
      toast.error(t('checkout.branchClosed'))
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        order: {
          order_type: cart.orderType,
          payment_method: cart.paymentMethod,
          notes: cart.notes,
          branch_id: selectedBranch?.id,
          ...(isDelivery && deliveryZone
            ? {
                delivery_zone_id: deliveryZone.id,
                delivery_zone_name: deliveryZone.name,
                delivery_zone_fee: deliveryZone.delivery_fee,
              }
            : {}),
          guest_name: guestName,
          guest_email: guestEmail,
          guest_phone: guestPhone,
          delivery_address: isDelivery
            ? {
                lat: deliveryAddress.lat,
                lng: deliveryAddress.lng,
                street: deliveryAddress.street,
                building: deliveryAddress.building,
                floor: deliveryAddress.floor,
                apartment: deliveryAddress.apartment,
                notes: deliveryAddress.notes,
              }
            : {},
        },
        items: cart.items.map((item) => ({
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          choices: (item.choices || []).map((c) => c.id),
        })),
        ...(appliedPromoCode ? { promo_code: appliedPromoCode } : {}),
        ...(appliedCombo ? { combo_deal_id: appliedCombo.combo_deal_id } : {}),
      }

      const response = await ordersApi.create(payload)
      const { order, payment } = response.data

      if (customer && isDelivery && !selectedAddressId && saveNewAddress && deliveryAddress.lat != null) {
        try {
          await addressesApi.create({
            label: newAddressLabel || t('checkout.homeLabel'),
            street: deliveryAddress.street,
            city: newAddressCity || restaurant.info?.city || '',
            building: deliveryAddress.building,
            floor: deliveryAddress.floor,
            apartment: deliveryAddress.apartment,
            notes: deliveryAddress.notes,
            lat: deliveryAddress.lat,
            lng: deliveryAddress.lng,
          })
        } catch {
          toast.error(t('checkout.orderPlacedAddressFailed'))
        }
      }

      if (customer && !isDelivery && !selectedPhoneId && saveNewPhone && guestPhone.trim()) {
        try {
          await phonesApi.create({ number: guestPhone.trim() })
        } catch {
          toast.error(t('checkout.orderPlacedPhoneFailed'))
        }
      }

      dispatch(clearCart())

      if (payment?.redirect_url) {
        window.location.href = payment.redirect_url
        return
      }

      navigate(`/orders/${order.id}`, { state: { order } })
    } catch (err) {
      toast.error(err.response?.data?.errors?.join(', ') || t('checkout.failedToPlaceOrder'))
    } finally {
      setSubmitting(false)
    }
  }

  const summaryCard = (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {t('checkout.orderSummary')}
        </Typography>
        {isDelivery ? (
          <Box sx={{ mb: 1.5 }}>
            <Typography variant="body2" color="text.secondary">
              {t('checkout.deliveringTo')}
            </Typography>
            {deliveryAddressLines.length > 0 ? (
              deliveryAddressLines.map((line, index) => (
                <Typography key={index} variant="body2" fontWeight={600}>
                  {line}
                </Typography>
              ))
            ) : (
              <Typography variant="body2" fontWeight={600}>
                {t('checkout.yourDeliveryAddress')}
              </Typography>
            )}
          </Box>
        ) : (
          selectedBranch && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              {t('checkout.pickupAt')} <strong>{selectedBranch.name}</strong>
            </Typography>
          )
        )}
        <Stack spacing={1}>
          {cart.items.map((item, index) => {
            const choicesTotal = (item.choices || []).reduce(
              (sum, c) => sum + (Number(c.price_delta) || 0),
              0
            )
            const lineTotal = (Number(item.price) + choicesTotal) * item.quantity
            const hasOffer = item.compare_at_price && Number(item.compare_at_price) > Number(item.price)
            const compareLineTotal = hasOffer ? (Number(item.compare_at_price) + choicesTotal) * item.quantity : null

            return (
              <Stack key={index} direction="row" sx={{ justifyContent: 'space-between', gap: 1 }}>
                <Typography variant="body2" sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                  {item.quantity}× {item.name}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                  {hasOffer && (
                    <Typography variant="body2" sx={{ textDecoration: 'line-through', color: 'text.disabled' }}>
                      {formatCurrency(compareLineTotal, currency)}
                    </Typography>
                  )}
                  <Typography variant="body2">{formatCurrency(lineTotal, currency)}</Typography>
                </Stack>
              </Stack>
            )
          })}
        </Stack>
        <Divider sx={{ my: 2 }} />
        <Stack spacing={1}>
          <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
            <Typography color="text.secondary">{t('cart.subtotal')}</Typography>
            <Typography>{formatCurrency(subtotal, currency)}</Typography>
          </Stack>
          {discountAmount > 0 && (
            <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
              <Typography color="success.main">{t('checkout.discount')}</Typography>
              <Typography color="success.main">-{formatCurrency(discountAmount, currency)}</Typography>
            </Stack>
          )}
          {appliedCombo && (
            <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
              <Typography color="success.main">{t('checkout.comboDiscountNamed', { name: appliedCombo.name })}</Typography>
              <Typography color="success.main">-{formatCurrency(comboDiscountAmount, currency)}</Typography>
            </Stack>
          )}
          {isDelivery && (
            <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
              <Typography color="text.secondary">{t('cart.deliveryFee')}</Typography>
              <Typography>{formatCurrency(deliveryFee, currency)}</Typography>
            </Stack>
          )}
          {vatRate > 0 && (
            <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
              <Typography color="text.secondary">{t('cart.vat', { rate: vatRate })}</Typography>
              <Typography>{formatCurrency(taxAmount, currency)}</Typography>
            </Stack>
          )}
          <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
            <Typography fontWeight={700}>{t('cart.total')}</Typography>
            <Typography fontWeight={700}>{formatCurrency(total, currency)}</Typography>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: 3 }}>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
        {t('checkout.title')}
      </Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3 }}>
        <Box>
          {activeStep === 0 && (
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  {t('checkout.orderType')}
                </Typography>
                <ToggleButtonGroup
                  value={cart.orderType}
                  exclusive
                  onChange={(_e, value) => value && dispatch(setOrderType(value))}
                  sx={{
                    mb: 3,
                    '& .MuiToggleButton-root': {
                      px: 3,
                      py: 1,
                      fontWeight: 600,
                      border: '2px solid',
                      borderColor: 'divider',
                      color: 'text.secondary',
                    },
                    '& .Mui-selected, & .Mui-selected:hover': {
                      backgroundColor: 'primary.main',
                      borderColor: 'primary.main',
                      color: 'primary.contrastText',
                    },
                  }}
                >
                  {restaurant.info?.accepts_pickup && <ToggleButton value="pickup">{t('menu.pickup')}</ToggleButton>}
                  {restaurant.info?.accepts_delivery && <ToggleButton value="delivery">{t('menu.delivery')}</ToggleButton>}
                </ToggleButtonGroup>

                <Typography variant="h6" sx={{ mb: 2 }}>
                  {t('checkout.items')}
                </Typography>
                <Stack spacing={1}>
                  {cart.items.map((item, index) => (
                    <Stack key={index} direction="row" sx={{ justifyContent: 'space-between' }}>
                      <Typography sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                        {item.quantity}× {item.name}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          )}

          {activeStep === 1 && (
            <Card>
              <CardContent>
                {(!customer || !isDelivery) && (
                  <>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      {t('checkout.yourDetails')}
                    </Typography>
                    <Stack spacing={2} sx={{ mb: 3 }}>
                      <TextField label={t('auth.name')} required value={guestName} onChange={(e) => setGuestName(e.target.value)} />

                      {customer && savedPhones.length > 0 && (
                        <TextField
                          select
                          label={t('auth.phone')}
                          required
                          value={selectedPhoneId ?? 'new'}
                          onChange={(e) => handleSelectPhone(e.target.value)}
                        >
                          {savedPhones.map((phone) => (
                            <MenuItem key={phone.id} value={phone.id}>
                              {phone.number}
                            </MenuItem>
                          ))}
                          <MenuItem value="new">{t('checkout.useNewPhone')}</MenuItem>
                        </TextField>
                      )}

                      {(!customer || savedPhones.length === 0 || selectedPhoneId === null) && (
                        <TextField
                          label={customer && savedPhones.length > 0 ? t('checkout.newPhoneNumber') : t('auth.phone')}
                          required
                          value={guestPhone}
                          onChange={(e) => setGuestPhone(e.target.value)}
                        />
                      )}

                      {customer && selectedPhoneId === null && guestPhone.trim() && (
                        <FormControlLabel
                          control={<Checkbox checked={saveNewPhone} onChange={(e) => setSaveNewPhone(e.target.checked)} />}
                          label={t('checkout.savePhoneForFuture')}
                        />
                      )}

                      <TextField label={t('auth.email')} value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} />
                    </Stack>
                  </>
                )}

                {isDelivery && (
                  <>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      {t('checkout.deliveryAddress')}
                    </Typography>

                    {customer && savedAddresses.length > 0 && showAddressPicker && (
                      <Stack spacing={1.5} sx={{ mb: 3 }}>
                        {savedAddresses.map((address) => (
                          <Card
                            key={address.id}
                            variant="outlined"
                            sx={{
                              borderColor: selectedAddressId === address.id ? 'primary.main' : 'divider',
                              borderWidth: selectedAddressId === address.id ? 2 : 1,
                            }}
                          >
                            <CardContent
                              sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: 2,
                                '&:last-child': { pb: 2 },
                              }}
                            >
                              <Box>
                                <Typography fontWeight={600}>{address.label || t('checkout.homeLabel')}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {[address.street, address.building, address.floor, address.apartment]
                                    .filter(Boolean)
                                    .join(', ')}
                                </Typography>
                              </Box>
                              <Button
                                variant={selectedAddressId === address.id ? 'contained' : 'outlined'}
                                size="small"
                                onClick={() => handleSelectAddress(address)}
                                sx={{ flexShrink: 0 }}
                              >
                                {t('checkout.useThisAddress')}
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                        <Button variant="text" onClick={handleAddNewAddress} sx={{ alignSelf: 'flex-start' }}>
                          {t('checkout.addNewAddress')}
                        </Button>
                      </Stack>
                    )}

                    {customer && savedAddresses.length > 0 && !showAddressPicker && (
                      <Stack
                        direction="row"
                        sx={{
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          mb: 2,
                          p: 1.5,
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: selectedAddress ? 'success.main' : 'divider',
                          bgcolor: selectedAddress ? (theme) => alpha(theme.palette.success.main, 0.08) : 'transparent',
                        }}
                      >
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          {selectedAddress && <CheckCircleIcon color="success" fontSize="small" />}
                          <Typography variant="body2" color={selectedAddress ? 'text.primary' : 'text.secondary'}>
                            {t('checkout.deliveringTo')}{' '}
                            <strong>{selectedAddress ? selectedAddress.label || t('checkout.savedAddress') : t('checkout.newAddress')}</strong>
                          </Typography>
                        </Stack>
                        <Button size="small" onClick={() => setShowAddressPicker(true)}>
                          {t('checkout.changeAddress')}
                        </Button>
                      </Stack>
                    )}

                    <DeliveryMap
                      key={selectedAddressId ?? 'new'}
                      initialLocation={
                        selectedAddress
                          ? { lat: Number(selectedAddress.lat), lng: Number(selectedAddress.lng) }
                          : undefined
                      }
                      initialAddress={
                        selectedAddress
                          ? {
                              street: selectedAddress.street,
                              building: selectedAddress.building,
                              floor: selectedAddress.floor,
                              apartment: selectedAddress.apartment,
                              notes: selectedAddress.notes,
                            }
                          : undefined
                      }
                      onAddressChange={(address) => setDeliveryAddressState(address)}
                      onBranchChange={handleDeliveryBranchChange}
                      onLocationChange={handleDeliveryLocationChange}
                    />
                    {deliveryAddress.lat != null && !deliveryZone && (
                      <Alert severity="error" sx={{ mt: 2 }}>
                        {t('checkout.noDeliveryCoverage')}
                      </Alert>
                    )}

                    {customer && !selectedAddressId && deliveryAddress.lat != null && (
                      <Box sx={{ mt: 2 }}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={saveNewAddress}
                              onChange={(e) => setSaveNewAddress(e.target.checked)}
                            />
                          }
                          label={t('checkout.saveAddressForFuture')}
                        />
                        {saveNewAddress && (
                          <Stack spacing={2} sx={{ mt: 1 }}>
                            <TextField
                              label={t('checkout.addressLabelHint')}
                              value={newAddressLabel}
                              onChange={(e) => setNewAddressLabel(e.target.value)}
                            />
                            <TextField
                              label={t('checkout.city')}
                              value={newAddressCity}
                              onChange={(e) => setNewAddressCity(e.target.value)}
                            />
                          </Stack>
                        )}
                      </Box>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {activeStep === 2 && (
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  {t('checkout.promoCode')}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                  <TextField
                    size="small"
                    placeholder={t('checkout.enterCode')}
                    fullWidth
                    value={promoCodeInput}
                    onChange={(e) => setPromoCodeInput(e.target.value)}
                    disabled={Boolean(appliedPromoCode)}
                  />
                  <Button
                    variant="outlined"
                    onClick={appliedPromoCode ? handleRemovePromo : handleApplyPromo}
                    disabled={promoApplying || (!appliedPromoCode && !promoCodeInput.trim())}
                  >
                    {appliedPromoCode ? t('checkout.remove') : t('checkout.apply')}
                  </Button>
                </Stack>
                {promoResult?.valid && (
                  <Alert severity="success" sx={{ mb: 3 }}>
                    {t('checkout.promoApplied', {
                      code: appliedPromoCode,
                      amount: formatCurrency(promoResult.discount_amount, currency),
                    })}
                  </Alert>
                )}
                {promoResult && !promoResult.valid && (
                  <Alert severity="error" sx={{ mb: 3 }}>
                    {promoResult.error}
                  </Alert>
                )}

                <Typography variant="h6" sx={{ mb: 2 }}>
                  {t('checkout.paymentMethod')}
                </Typography>
                <RadioGroup
                  value={cart.paymentMethod}
                  onChange={(e) => dispatch(setPaymentMethod(e.target.value))}
                >
                  <FormControlLabel value="cash" control={<Radio />} label={t('orderStatus.cash')} />
                  <FormControlLabel value="instapay" control={<Radio />} label={t('orderStatus.instapay')} />
                  {restaurant.info?.payment_gateway === 'paymob' && (
                    <FormControlLabel value="paymob" control={<Radio />} label={t('orderStatus.paymob')} />
                  )}
                  {restaurant.info?.payment_gateway === 'kashier' && (
                    <FormControlLabel value="kashier" control={<Radio />} label={t('orderStatus.kashier')} />
                  )}
                </RadioGroup>
                {cart.paymentMethod === 'instapay' && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    {t('instapay.checkoutNote')}
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {activeStep === 1 && isDelivery && locationErrorShown && !hasDeliveryLocation && (
            <Alert severity="error" sx={{ mt: 3 }}>
              {t('checkout.selectDeliveryLocation')}
            </Alert>
          )}

          <Stack direction="row" sx={{ justifyContent: 'space-between', mt: 3 }}>
            <Button disabled={activeStep === 0} onClick={handleBack}>
              {t('checkout.back')}
            </Button>
            {activeStep < STEPS.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={
                  (activeStep === 0 && cart.items.length === 0) ||
                  (activeStep === 1 && (!detailsValid || (isDelivery && hasDeliveryLocation && !deliveryValid)))
                }
                sx={activeStep === 1 && isDelivery && !hasDeliveryLocation ? { opacity: 0.5 } : undefined}
              >
                {t('checkout.next')}
              </Button>
            ) : (
              <Button variant="contained" onClick={handlePlaceOrder} disabled={submitting}>
                {t('checkout.placeOrder')}
              </Button>
            )}
          </Stack>
        </Box>

        <Box sx={{ display: { xs: 'none', md: 'block' } }}>{summaryCard}</Box>
      </Box>
    </Box>
  )
}

export default CheckoutPage
