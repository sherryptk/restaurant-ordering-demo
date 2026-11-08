import { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useOutletContext } from 'react-router-dom'
import {
  Box,
  Typography,
  ButtonBase,
  Chip,
  Dialog,
  DialogContent,
  IconButton,
  Stack,
  Button,
  FormControlLabel,
  Checkbox,
  Radio,
  FormControl,
  FormLabel,
  FormHelperText,
  CircularProgress,
  Slide,
  useMediaQuery,
} from '@mui/material'
import { keyframes } from '@emotion/react'
import CloseIcon from '@mui/icons-material/Close'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined'
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined'
import DeliveryDiningIcon from '@mui/icons-material/DeliveryDining'
import FavoriteIcon from '@mui/icons-material/Favorite'
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { menuApi, branchApi, favoritesApi } from '../../api'
import {
  setRestaurantData,
  setLoading,
  selectRestaurant,
  selectCart,
  selectCartCount,
  selectCartTotal,
  selectSelectedBranch,
  selectAuth,
  setOrderType,
  setSelectedBranch,
  addItem,
} from '../../store'
import { formatCurrency, stripEmoji } from '../../utils/format'
import MenuHero from '../../components/customer/MenuHero'
import CollectionsStrip from '../../components/customer/CollectionsStrip'

const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)'
const MAX_QUANTITY = 99 // matches OrderItem::MAX_QUANTITY on the server
const INK = '#1A1A1A'
const AMBER = '#F5A623'

// Flat, Goldbelly-style system: square-ish corners, 1px ink rules, no shadows, heavy caps display type.
const RADIUS = '4px'
const RULE = `1px solid ${INK}`
const caps = { textTransform: 'uppercase', letterSpacing: '0.02em', fontWeight: 800 }
const displayFont = (theme) => theme.typography.h4.fontFamily
const serifFont = (theme) =>
  theme.direction === 'rtl' ? theme.typography.fontFamily : "'Libre Caslon Text', Georgia, serif"

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`
const barUp = keyframes`
  from { opacity: 0; transform: translateY(24px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`

const SlideUp = forwardRef(function SlideUp(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />
})

const pressable = {
  transition: `transform 160ms ${EASE_OUT}, background-color 160ms ease, color 160ms ease, box-shadow 160ms ease`,
  '&:active': { transform: 'scale(0.97)' },
}

const focusRing = {
  '&.Mui-focusVisible, &:focus-visible': { outline: `2px solid ${INK}`, outlineOffset: 2 },
}

const reducedMotion = { '@media (prefers-reduced-motion: reduce)': { animation: 'none', transition: 'none' } }

function Price({ price, compareAt, currency, large }) {
  return (
    <Stack direction="row" sx={{ alignItems: 'baseline', columnGap: 1, flexWrap: 'wrap' }}>
      <Typography
        component="span"
        sx={{ fontWeight: 700, fontSize: large ? 20 : 16, color: 'text.primary', fontVariantNumeric: 'tabular-nums' }}
      >
        {formatCurrency(price, currency)}
      </Typography>
      {compareAt && (
        <Typography
          component="span"
          sx={{ fontSize: large ? 14 : 12.5, color: 'text.secondary', textDecoration: 'line-through', fontVariantNumeric: 'tabular-nums' }}
        >
          {formatCurrency(compareAt, currency)}
        </Typography>
      )}
    </Stack>
  )
}

function ItemImage({ src, alt, dim }) {
  // A 404 or blocked image would otherwise show the browser's broken-image icon plus raw alt text.
  const [failed, setFailed] = useState(false)
  return (
    <Box
      sx={{
        position: 'relative',
        aspectRatio: '1 / 1',
        borderRadius: RADIUS,
        overflow: 'hidden',
        bgcolor: 'rgba(245, 166, 35, 0.14)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'primary.dark',
      }}
    >
      {src && !failed ? (
        <Box
          component="img"
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            filter: dim ? 'grayscale(1)' : 'none',
            transition: `transform 400ms ${EASE_OUT}`,
          }}
        />
      ) : (
        <RestaurantIcon sx={{ fontSize: 36, opacity: 0.6 }} />
      )}
    </Box>
  )
}

function AddMark() {
  return (
    <Box
      aria-hidden
      sx={{
        width: 32,
        height: 32,
        borderRadius: RADIUS,
        bgcolor: INK,
        color: AMBER,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: `transform 200ms ${EASE_OUT}, background-color 160ms ease`,
      }}
    >
      <AddIcon sx={{ fontSize: 20 }} />
    </Box>
  )
}

const cardButtonSx = (disabled) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  textAlign: 'start',
  width: '100%',
  height: '100%',
  borderRadius: RADIUS,
  cursor: disabled ? 'default' : 'pointer',
  ...pressable,
  ...(disabled && { '&:active': { transform: 'none' } }),
  ...focusRing,
  '@media (hover: hover) and (pointer: fine)': {
    '&:hover img': { transform: disabled ? 'none' : 'scale(1.04)' },
    '&:hover .add-mark': { transform: disabled ? 'none' : 'scale(1.08)' },
  },
})

const cardRevealSx = (revealIndex) =>
  revealIndex === null
    ? null
    : {
        animation: `${fadeUp} 360ms ${EASE_OUT} both`,
        animationDelay: `${Math.min(revealIndex, 8) * 45}ms`,
        ...reducedMotion,
      }

function OrderTypeToggle({ info, orderType, onChange }) {
  const { t } = useTranslation()
  const options = [
    info.accepts_delivery && {
      value: 'delivery',
      icon: <DeliveryDiningIcon />,
      label: t('menu.delivery'),
      minutes: info.estimated_delivery_minutes,
    },
    info.accepts_pickup && {
      value: 'pickup',
      icon: <StorefrontOutlinedIcon />,
      label: t('menu.pickup'),
      minutes: info.estimated_pickup_minutes,
    },
  ].filter(Boolean)

  return (
    <Box role="radiogroup" aria-label={t('menu.delivery')} sx={{ display: 'flex', border: RULE, borderRadius: RADIUS, overflow: 'hidden' }}>
      {options.map((option) => {
        const selected = orderType === option.value
        return (
          <ButtonBase
            key={option.value}
            role="radio"
            aria-checked={selected}
            disableRipple
            onClick={() => onChange(option.value)}
            sx={{
              flex: 1,
              borderRadius: 0,
              px: 2,
              py: 1.25,
              gap: 1.25,
              justifyContent: 'center',
              bgcolor: selected ? INK : 'transparent',
              color: selected ? '#fff' : 'text.primary',
              ...pressable,
              ...focusRing,
            }}
          >
            <Box sx={{ display: 'flex', color: selected ? AMBER : 'text.secondary', transition: 'color 160ms ease' }}>{option.icon}</Box>
            <Box sx={{ textAlign: 'start', lineHeight: 1.2 }}>
              <Typography component="div" sx={{ ...caps, fontSize: 14, fontFamily: displayFont }}>
                {option.label}
              </Typography>
              <Typography component="div" sx={{ fontSize: 12, opacity: 0.75 }}>
                {t('menu.etaMin', { count: option.minutes })}
              </Typography>
            </Box>
          </ButtonBase>
        )
      })}
    </Box>
  )
}

function BranchPicker({ branches, selectedBranch, onSelect }) {
  const { t } = useTranslation()

  return (
    <Box sx={{ mt: 2 }}>
      <Typography sx={{ ...caps, fontSize: 13, mb: 1, fontFamily: displayFont }}>{t('menu.choosePickupLocation')}</Typography>
      <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
        {branches.map((branch) => {
          const isClosed = branch.currently_open === false
          const selected = selectedBranch?.id === branch.id
          return (
            <ButtonBase
              key={branch.id}
              disabled={isClosed}
              disableRipple
              onClick={() => onSelect(branch)}
              aria-pressed={selected}
              sx={{
                flexDirection: 'column',
                alignItems: 'flex-start',
                textAlign: 'start',
                px: 2,
                py: 1.25,
                minWidth: 140,
                borderRadius: RADIUS,
                border: RULE,
                bgcolor: selected ? INK : '#fff',
                color: selected ? '#fff' : 'text.primary',
                opacity: isClosed ? 0.5 : 1,
                ...pressable,
                ...focusRing,
              }}
            >
              <Typography component="span" sx={{ fontWeight: 700, fontSize: 14 }}>
                {branch.name}
              </Typography>
              <Typography component="span" sx={{ fontSize: 12, opacity: 0.75 }}>
                {isClosed ? t('menu.closed') : t('menu.pickupEtaMin', { count: branch.estimated_pickup_minutes })}
              </Typography>
            </ButtonBase>
          )
        })}
      </Stack>
    </Box>
  )
}

function FavoriteButton({ favorited, onToggle }) {
  const { t } = useTranslation()
  return (
    <IconButton
      onClick={onToggle}
      size="small"
      aria-label={t('menu.toggleFavorite')}
      aria-pressed={favorited}
      sx={{
        position: 'absolute',
        top: 8,
        insetInlineEnd: 8,
        zIndex: 1,
        width: 34,
        height: 34,
        bgcolor: '#fff',
        border: RULE,
        ...pressable,
        '&:hover': { bgcolor: '#fff' },
      }}
    >
      {favorited ? <FavoriteIcon fontSize="small" color="error" /> : <FavoriteBorderIcon fontSize="small" />}
    </IconButton>
  )
}

function Badge({ children, tone = 'amber' }) {
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 8,
        insetInlineStart: 8,
        zIndex: 1,
        px: 1,
        py: 0.25,
        borderRadius: '2px',
        fontSize: 11,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        lineHeight: 1.6,
        bgcolor: tone === 'amber' ? AMBER : INK,
        color: tone === 'amber' ? INK : AMBER,
      }}
    >
      {children}
    </Box>
  )
}

function MenuItemCard({ item, currency, onClick, showFavorite, favorited, onToggleFavorite, revealIndex }) {
  const { t } = useTranslation()
  const hasOffer = item.compare_at_price && Number(item.compare_at_price) > Number(item.price)
  const disabled = !item.available

  return (
    <Box component="article" sx={{ position: 'relative', ...cardRevealSx(revealIndex) }}>
      {showFavorite && (
        <FavoriteButton
          favorited={favorited}
          onToggle={(e) => {
            e.stopPropagation()
            onToggleFavorite(item)
          }}
        />
      )}
      <ButtonBase
        disableRipple
        disabled={false}
        aria-disabled={disabled}
        onClick={() => !disabled && onClick(item)}
        sx={cardButtonSx(disabled)}
      >
        <Box sx={{ position: 'relative', opacity: disabled ? 0.6 : 1 }}>
          {item.offer_badge && <Badge>{item.offer_badge}</Badge>}
          <ItemImage src={item.image_url} alt={item.name} dim={disabled} />
        </Box>
        <Box sx={{ pt: 1.25, px: 0.5, flex: 1, display: 'flex', flexDirection: 'column', opacity: disabled ? 0.6 : 1 }}>
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: 15,
              lineHeight: 1.3,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textWrap: 'balance',
            }}
          >
            {item.name}
          </Typography>
          {item.description && (
            <Typography
              sx={{
                mt: 0.5,
                fontSize: 12.5,
                lineHeight: 1.45,
                color: 'text.secondary',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {item.description}
            </Typography>
          )}
          <Stack
            direction="row"
            sx={{
              mt: 'auto',
              pt: 1.25,
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 1,
              // when the price is too wide to share the row, the + drops below it instead of overflowing
              '& > .add-mark > *, & > .MuiChip-root': { marginInlineStart: 'auto' },
            }}
          >
            <Price price={item.price} compareAt={hasOffer ? item.compare_at_price : null} currency={currency} />
            {disabled ? <Chip label={t('menu.unavailable')} size="small" /> : <Box className="add-mark" sx={{ display: 'contents' }}><AddMark /></Box>}
          </Stack>
        </Box>
      </ButtonBase>
    </Box>
  )
}

function ComboDealCard({ combo, currency, onClick, revealIndex }) {
  const { t } = useTranslation()

  return (
    <Box component="article" sx={{ position: 'relative', ...cardRevealSx(revealIndex) }}>
      <ButtonBase disableRipple onClick={() => onClick(combo)} sx={cardButtonSx(false)}>
        <Box sx={{ position: 'relative' }}>
          <Badge tone="ink">{stripEmoji(t('menu.comboBadge'))}</Badge>
          <ItemImage src={combo.image_url} alt={combo.name} />
        </Box>
        <Box sx={{ pt: 1.25, px: 0.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Typography sx={{ fontWeight: 700, fontSize: 15, lineHeight: 1.3, textWrap: 'balance' }}>{combo.name}</Typography>
          <Typography
            sx={{
              mt: 0.5,
              fontSize: 12.5,
              lineHeight: 1.45,
              color: 'text.secondary',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {combo.items.map((item) => item.name).join(' + ')}
          </Typography>
          <Stack
            direction="row"
            sx={{
              mt: 'auto',
              pt: 1.25,
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 1,
              '& > .add-mark > *': { marginInlineStart: 'auto' },
            }}
          >
            <Price price={combo.discounted_price} compareAt={combo.original_price} currency={currency} />
            <Box className="add-mark" sx={{ display: 'contents' }}>
              <AddMark />
            </Box>
          </Stack>
        </Box>
      </ButtonBase>
    </Box>
  )
}

const gridSx = {
  display: 'grid',
  gridTemplateColumns: {
    xs: 'repeat(2, minmax(0, 1fr))',
    sm: 'repeat(3, minmax(0, 1fr))',
    md: 'repeat(4, minmax(0, 1fr))',
    lg: 'repeat(5, minmax(0, 1fr))',
  },
  columnGap: { xs: 1, md: 1.5 },
  rowGap: { xs: 3, md: 4 },
}

function SectionHeading({ children, icon, subtitle }) {
  return (
    <Stack
      direction="row"
      sx={{ alignItems: 'baseline', flexWrap: 'wrap', columnGap: 1.5, rowGap: 0.25, mb: 2, pb: 1.5, borderBottom: RULE }}
    >
      <Typography
        component="h2"
        sx={{
          m: 0,
          ...caps,
          fontWeight: 900,
          fontFamily: displayFont,
          fontSize: { xs: 24, md: 32 },
          lineHeight: 1.1,
          textWrap: 'balance',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        {icon}
        {children}
      </Typography>
      {subtitle && (
        <Typography component="span" sx={{ fontFamily: serifFont, fontSize: { xs: 15, md: 18 }, color: 'text.secondary' }}>
          {subtitle}
        </Typography>
      )}
    </Stack>
  )
}

function CategoryChip({ label, active, icon, onClick, chipRef }) {
  return (
    <ButtonBase
      ref={chipRef}
      disableRipple
      onClick={onClick}
      aria-current={active ? 'true' : undefined}
      title={label}
      sx={{
        flexShrink: 0,
        maxWidth: 'min(80vw, 300px)',
        gap: 0.75,
        px: 1.5,
        height: 48,
        fontFamily: displayFont,
        ...caps,
        fontWeight: 700,
        fontSize: 13,
        whiteSpace: 'nowrap',
        color: active ? INK : 'text.secondary',
        borderBottom: `3px solid ${active ? INK : 'transparent'}`,
        transition: `color 160ms ease, border-color 160ms ease`,
        '&:active': { transform: 'scale(0.97)' },
        '&.Mui-focusVisible': { outline: `2px solid ${INK}`, outlineOffset: -2 },
        '@media (hover: hover) and (pointer: fine)': { '&:hover': { color: INK } },
      }}
    >
      {icon && <Box sx={{ display: 'flex', color: 'primary.dark' }}>{icon}</Box>}
      <Box component="span" sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {label}
      </Box>
    </ButtonBase>
  )
}

function MenuPage() {
  const { t, i18n } = useTranslation()
  const dispatch = useDispatch()
  const restaurant = useSelector(selectRestaurant)
  const cart = useSelector(selectCart)
  const cartCount = useSelector(selectCartCount)
  const cartTotal = useSelector(selectCartTotal)
  const selectedBranch = useSelector(selectSelectedBranch)
  const { customer } = useSelector(selectAuth)
  const { openCart } = useOutletContext()
  const isMobile = useMediaQuery('(max-width:599.95px)')

  const [activeId, setActiveId] = useState(null)
  const [detailItem, setDetailItem] = useState(null)
  const [selectedChoices, setSelectedChoices] = useState({})
  const [quantity, setQuantity] = useState(1)
  const [showRequiredErrors, setShowRequiredErrors] = useState(false)
  const [comboDeals, setComboDeals] = useState([])
  const [detailCombo, setDetailCombo] = useState(null)
  const [branches, setBranches] = useState([])
  const [favoritedIds, setFavoritedIds] = useState(() => new Set())
  const [stickyOffset, setStickyOffset] = useState(120)
  const [navHeight, setNavHeight] = useState(64)

  const sectionRefs = useRef({})
  const chipRefs = useRef({})
  const chipBarRef = useRef(null)
  const chipScrollRef = useRef(null)
  const scrollLockRef = useRef(0)

  useEffect(() => {
    branchApi
      .list()
      .then((res) => {
        setBranches(res.data)
        if (res.data.length > 0) {
          dispatch(setSelectedBranch(res.data[0]))
        }
      })
      .catch(() => toast.error(t('menu.failedToLoadBranches')))
  }, [dispatch, i18n.language, t])

  useEffect(() => {
    dispatch(setLoading(true))
    menuApi
      .getMenu(selectedBranch?.id)
      .then((res) => {
        dispatch(setRestaurantData(res.data))
        setComboDeals(res.data.combo_deals || [])
      })
      .catch(() => toast.error(t('menu.failedToLoadMenu')))
      .finally(() => dispatch(setLoading(false)))
  }, [dispatch, selectedBranch?.id, i18n.language, t])

  useEffect(() => {
    const ids = restaurant.categories
      .flatMap((category) => category.menu_items)
      .filter((item) => item.favorited)
      .map((item) => item.id)
    setFavoritedIds(new Set(ids))
  }, [restaurant.categories])

  const handleToggleFavorite = async (item) => {
    const wasFavorited = favoritedIds.has(item.id)

    setFavoritedIds((prev) => {
      const next = new Set(prev)
      wasFavorited ? next.delete(item.id) : next.add(item.id)
      return next
    })

    try {
      if (wasFavorited) {
        await favoritesApi.destroy(item.id)
      } else {
        await favoritesApi.create(item.id)
      }
    } catch {
      setFavoritedIds((prev) => {
        const next = new Set(prev)
        wasFavorited ? next.add(item.id) : next.delete(item.id)
        return next
      })
      toast.error(t('menu.failedToUpdateFavorite'))
    }
  }

  const onOfferItems = restaurant.categories
    .flatMap((category) => category.menu_items)
    .filter((item) => item.compare_at_price && Number(item.compare_at_price) > Number(item.price))
  const hasOffers = onOfferItems.length > 0 || comboDeals.length > 0

  const biggestDiscount = Math.max(
    0,
    ...onOfferItems.map((item) => ((Number(item.compare_at_price) - Number(item.price)) / Number(item.compare_at_price)) * 100),
    ...comboDeals.map((combo) => (Number(combo.discount_amount) / Number(combo.original_price)) * 100)
  )
  const collectionEntries = [
    hasOffers && {
      id: 'offers',
      label: stripEmoji(t('menu.offersTab')),
      image: onOfferItems.find((item) => item.image_url)?.image_url || comboDeals.find((combo) => combo.image_url)?.image_url,
      count: onOfferItems.length + comboDeals.length,
      badgePercent: Number.isFinite(biggestDiscount) ? Math.floor(biggestDiscount) : 0,
    },
    ...restaurant.categories
      .filter((category) => category.menu_items.length > 0)
      .map((category) => ({
        id: String(category.id),
        label: stripEmoji(category.name),
        image: category.menu_items.find((item) => item.image_url)?.image_url,
        count: category.menu_items.length,
        badgePercent: 0,
      })),
  ].filter(Boolean)

  // The nav bar and the chip bar both stick to the top, so section anchors have to
  // clear the two of them. Measuring beats hardcoding: the nav is a different height
  // on phones and desktop.
  useLayoutEffect(() => {
    const measure = () => {
      const nav = document.querySelector('header')
      const navHeight = nav ? nav.getBoundingClientRect().height : 0
      const barHeight = chipBarRef.current ? chipBarRef.current.offsetHeight : 0
      setNavHeight(Math.round(navHeight))
      setStickyOffset(Math.round(navHeight + barHeight))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [restaurant.info])

  // Scroll-spy: the chip for the section under the sticky bars is the active one.
  useEffect(() => {
    const entries = Object.entries(sectionRefs.current).filter(([, el]) => el)
    if (entries.length === 0) return undefined

    const observer = new IntersectionObserver(
      (observed) => {
        if (Date.now() < scrollLockRef.current) return
        const visible = observed.filter((entry) => entry.isIntersecting)
        if (visible.length === 0) return
        const topmost = visible.reduce((a, b) => (a.boundingClientRect.top < b.boundingClientRect.top ? a : b))
        setActiveId(topmost.target.dataset.sectionId)
      },
      { rootMargin: `-${stickyOffset + 4}px 0px -65% 0px` }
    )
    entries.forEach(([, el]) => observer.observe(el))
    return () => observer.disconnect()
  }, [restaurant.categories, hasOffers, stickyOffset])

  // Keep the active chip visible inside its own scroller without moving the page.
  useEffect(() => {
    const chip = chipRefs.current[activeId]
    if (!chip) return
    // block: 'nearest' keeps this from nudging the page itself; only the chip scroller moves.
    chip.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [activeId])

  const scrollToSection = (id) => {
    setActiveId(id)
    const element = sectionRefs.current[id]
    if (!element) return
    scrollLockRef.current = Date.now() + 900
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    element.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }

  const openComboDetail = (combo) => setDetailCombo(combo)
  const closeComboDetail = () => setDetailCombo(null)

  const handleAddComboToCart = () => {
    detailCombo.items.forEach((item) => {
      dispatch(
        addItem({
          menu_item_id: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
          choices: [],
        })
      )
    })
    toast.success(t('menu.addedToCart', { name: detailCombo.name }))
    closeComboDetail()
  }

  const openItemDetail = async (item) => {
    try {
      const res = await menuApi.getItem(item.id)
      setDetailItem(res.data)
      setSelectedChoices({})
      setShowRequiredErrors(false)
      setQuantity(1)
    } catch {
      toast.error(t('menu.failedToLoadItem'))
    }
  }

  const closeItemDetail = () => {
    setDetailItem(null)
    setShowRequiredErrors(false)
  }

  const handleChoiceToggle = (option, choice) => {
    setSelectedChoices((prev) => {
      const current = prev[option.id] || []
      if (option.multi_select) {
        const exists = current.some((c) => c.id === choice.id)
        return {
          ...prev,
          [option.id]: exists ? current.filter((c) => c.id !== choice.id) : [...current, choice],
        }
      }
      return { ...prev, [option.id]: [choice] }
    })
  }

  const isChoiceSelected = (optionId, choiceId) =>
    (selectedChoices[optionId] || []).some((c) => c.id === choiceId)

  // Required groups with nothing picked block adding. A required group where every choice is sold
  // out can never be satisfied, so the whole item is unorderable until it is restocked.
  const detailOptions = detailItem?.options || []
  const soldOutRequired = detailOptions.some((o) => o.required && !o.choices.some((c) => c.available))
  const unmetRequired = detailOptions.filter(
    (o) => o.required && o.choices.some((c) => c.available) && !(selectedChoices[o.id] || []).length
  )

  const handleAddToCart = () => {
    if (soldOutRequired) return
    if (unmetRequired.length > 0) {
      setShowRequiredErrors(true)
      const group = document.getElementById(`option-${unmetRequired[0].id}`)
      group?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      group?.querySelector('input:not(:disabled)')?.focus({ preventScroll: true })
      return
    }
    const choices = Object.values(selectedChoices).flat()
    dispatch(
      addItem({
        menu_item_id: detailItem.id,
        name: detailItem.name,
        price: detailItem.price,
        compare_at_price: detailItem.compare_at_price,
        quantity,
        choices,
      })
    )
    toast.success(t('menu.addedToCart', { name: detailItem.name }))
    closeItemDetail()
  }

  if (!restaurant.info) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  const currency = restaurant.info.currency
  const allClosed = branches.length > 0 && branches.every((branch) => branch.currently_open === false)
  const detailTotal = detailItem
    ? (Number(detailItem.price) +
        Object.values(selectedChoices)
          .flat()
          .reduce((sum, choice) => sum + (Number(choice.price_delta) || 0), 0)) *
      quantity
    : 0

  const sheetSx = {
    '& .MuiDialog-container': { alignItems: { xs: 'flex-end', sm: 'center' } },
    '& .MuiDialog-paper': {
      m: { xs: 0, sm: 2 },
      width: '100%',
      maxHeight: { xs: '92dvh', sm: 'calc(100% - 64px)' },
      borderRadius: { xs: '4px 4px 0 0', sm: RADIUS },
      boxShadow: '0 24px 60px rgba(26, 26, 26, 0.28)',
    },
  }

  const closeButton = (onClose) => (
    <IconButton
      onClick={onClose}
      aria-label={t('common.close', { defaultValue: 'Close' })}
      sx={{
        position: 'absolute',
        insetInlineEnd: 12,
        top: 12,
        zIndex: 2,
        width: 40,
        height: 40,
        bgcolor: 'rgba(255, 255, 255, 0.95)',
        boxShadow: '0 1px 6px rgba(26, 26, 26, 0.2)',
        ...pressable,
        '&:hover': { bgcolor: '#fff' },
      }}
    >
      <CloseIcon fontSize="small" />
    </IconButton>
  )

  return (
    <Box sx={{ pb: cartCount > 0 ? 12 : 4, '--sticky-offset': `${stickyOffset}px` }}>
      <Box sx={{ bgcolor: AMBER, color: INK, borderBottom: RULE, px: 2, py: 1, textAlign: 'center' }}>
        <Typography sx={{ fontSize: { xs: 12.5, md: 13.5 }, fontWeight: 700, lineHeight: 1.4 }}>
          {cart.orderType === 'pickup'
            ? restaurant.info.address
              ? t('menu.pickupAt', { address: restaurant.info.address })
              : t('menu.pickupEtaMin', { count: restaurant.info.estimated_pickup_minutes })
            : t('menu.deliveryFeeMinOrder', {
                fee: formatCurrency(restaurant.info.delivery_fee, currency),
                min: formatCurrency(restaurant.info.min_order_amount, currency),
              })}
        </Typography>
      </Box>

      <MenuHero
        info={restaurant.info}
        maxDiscount={Number.isFinite(biggestDiscount) ? Math.floor(biggestDiscount) : 0}
        closed={allClosed}
        onOrder={() => scrollToSection(hasOffers ? 'offers' : String(restaurant.categories[0]?.id))}
      />

      <Box sx={{ maxWidth: 1240, mx: 'auto', px: { xs: 2, md: 4 } }}>
        <Box sx={{ maxWidth: 560, mx: 'auto', mt: 2, bgcolor: '#fff', border: RULE, borderRadius: RADIUS, p: 1 }}>
          <OrderTypeToggle info={restaurant.info} orderType={cart.orderType} onChange={(value) => dispatch(setOrderType(value))} />

          {/* The closed notice lives in the hero, so it isn't repeated here. */}
          {!allClosed && cart.orderType === 'pickup' && branches.length > 0 && (
            <Box sx={{ px: 0.5, pb: 1 }}>
              <BranchPicker branches={branches} selectedBranch={selectedBranch} onSelect={(branch) => dispatch(setSelectedBranch(branch))} />
            </Box>
          )}
        </Box>

        <Box sx={{ mt: { xs: 4, md: 6 }, mb: { xs: 3, md: 4 } }}>
          <SectionHeading subtitle={t('menu.itemCount', { count: restaurant.categories.reduce((n, c) => n + c.menu_items.length, 0) })}>
            {t('menu.collections')}
          </SectionHeading>
          <CollectionsStrip entries={collectionEntries} onSelect={scrollToSection} />
        </Box>
      </Box>

      <Box
        ref={chipBarRef}
        sx={{
          position: 'sticky',
          top: navHeight,
          zIndex: 10,
          bgcolor: 'background.default',
          borderTop: RULE,
          borderBottom: RULE,
        }}
      >
        <Box>
          <Stack
            ref={chipScrollRef}
            direction="row"
            component="nav"
            sx={{
              gap: 0.5,
              // Full-bleed scroller whose first tab still lines up with the 1240px grid below.
              paddingInline: { xs: 1, md: 'max(20px, calc((100% - 1240px) / 2 + 20px))' },
              py: 0,
              overflowX: 'auto',
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': { display: 'none' },
            }}
          >
            {hasOffers && (
              <CategoryChip
                chipRef={(el) => (chipRefs.current.offers = el)}
                label={stripEmoji(t('menu.offersTab'))}
                icon={<LocalOfferOutlinedIcon sx={{ fontSize: 18 }} />}
                active={activeId === 'offers'}
                onClick={() => scrollToSection('offers')}
              />
            )}
            {restaurant.categories.map((category) => (
              <CategoryChip
                key={category.id}
                chipRef={(el) => (chipRefs.current[category.id] = el)}
                label={stripEmoji(category.name)}
                active={activeId === String(category.id)}
                onClick={() => scrollToSection(String(category.id))}
              />
            ))}
          </Stack>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1240, mx: 'auto', px: { xs: 2, md: 4 } }}>
        {hasOffers && (
          <Box
            component="section"
            data-section-id="offers"
            ref={(el) => (sectionRefs.current.offers = el)}
            sx={{ pt: { xs: 4, md: 5 }, scrollMarginTop: 'var(--sticky-offset)' }}
          >
            <SectionHeading subtitle={t('menu.itemCount', { count: onOfferItems.length + comboDeals.length })}>{stripEmoji(t('menu.offersTab'))}</SectionHeading>
            <Box sx={gridSx}>
              {onOfferItems.map((item, index) => (
                <MenuItemCard
                  key={`offer-${item.id}`}
                  item={item}
                  currency={currency}
                  onClick={openItemDetail}
                  showFavorite={Boolean(customer)}
                  favorited={favoritedIds.has(item.id)}
                  onToggleFavorite={handleToggleFavorite}
                  revealIndex={index}
                />
              ))}
              {comboDeals.map((combo, index) => (
                <ComboDealCard key={`combo-${combo.id}`} combo={combo} currency={currency} onClick={openComboDetail} revealIndex={onOfferItems.length + index} />
              ))}
            </Box>
          </Box>
        )}
        {restaurant.categories.length === 0 && comboDeals.length === 0 && (
          <Typography sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>{t('menu.menuEmpty')}</Typography>
        )}
        {restaurant.categories.map((category, categoryIndex) => (
          <Box
            component="section"
            key={category.id}
            data-section-id={String(category.id)}
            ref={(el) => (sectionRefs.current[String(category.id)] = el)}
            sx={{ pt: { xs: 4, md: 5 }, scrollMarginTop: 'var(--sticky-offset)' }}
          >
            <SectionHeading subtitle={t('menu.itemCount', { count: category.menu_items.length })}>{stripEmoji(category.name)}</SectionHeading>
            <Box sx={gridSx}>
              {category.menu_items.map((item, index) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  currency={currency}
                  onClick={openItemDetail}
                  showFavorite={Boolean(customer)}
                  favorited={favoritedIds.has(item.id)}
                  onToggleFavorite={handleToggleFavorite}
                  revealIndex={!hasOffers && categoryIndex === 0 ? index : null}
                />
              ))}
            </Box>
          </Box>
        ))}
      </Box>

      {cartCount > 0 && (
        <Box
          sx={{
            position: 'fixed',
            insetInline: 0,
            bottom: 'max(16px, env(safe-area-inset-bottom))',
            display: 'flex',
            justifyContent: 'center',
            px: 2,
            zIndex: 20,
            pointerEvents: 'none',
          }}
        >
          <ButtonBase
            disableRipple
            onClick={openCart}
            sx={{
              pointerEvents: 'auto',
              width: '100%',
              maxWidth: 480,
              justifyContent: 'space-between',
              gap: 2,
              px: 2,
              py: 1.5,
              borderRadius: RADIUS,
              bgcolor: INK,
              color: '#fff',
              border: `2px solid ${AMBER}`,
              animation: `${barUp} 320ms ${EASE_OUT} both`,
              ...reducedMotion,
              ...pressable,
              ...focusRing,
            }}
          >
            <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ position: 'relative', display: 'flex', color: AMBER }}>
                <ShoppingBagOutlinedIcon />
              </Box>
              <Typography sx={{ fontWeight: 700, fontSize: 15 }}>{t('menu.viewCart', { count: cartCount })}</Typography>
            </Stack>
            <Typography sx={{ fontWeight: 700, fontSize: 15, color: AMBER, fontVariantNumeric: 'tabular-nums' }}>
              {formatCurrency(cartTotal, currency)}
            </Typography>
          </ButtonBase>
        </Box>
      )}

      <Dialog
        open={Boolean(detailItem)}
        onClose={closeItemDetail}
        maxWidth="sm"
        fullWidth
        slots={isMobile ? { transition: SlideUp } : undefined}
        sx={sheetSx}
      >
        {detailItem && (
          <>
            {closeButton(closeItemDetail)}
            <DialogContent sx={{ p: 0 }}>
              {detailItem.image_url && (
                <Box component="img" src={detailItem.image_url} alt={detailItem.name} onError={(e) => { e.currentTarget.style.display = 'none' }} sx={{ width: '100%', aspectRatio: '16 / 10', objectFit: 'cover', display: 'block' }} />
              )}
              <Box sx={{ p: { xs: 2.5, sm: 3 } }}>
                <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.25, textWrap: 'balance' }}>
                    {detailItem.name}
                  </Typography>
                  {customer && (
                    <IconButton onClick={() => handleToggleFavorite(detailItem)} aria-label={t('menu.toggleFavorite')} sx={{ mt: -0.5, ...pressable }}>
                      {favoritedIds.has(detailItem.id) ? <FavoriteIcon color="error" /> : <FavoriteBorderIcon />}
                    </IconButton>
                  )}
                </Stack>
                {detailItem.description && (
                  <Typography sx={{ mt: 1, color: 'text.secondary', lineHeight: 1.6 }}>{detailItem.description}</Typography>
                )}
                <Box sx={{ mt: 1.5 }}>
                  <Price
                    price={detailItem.price}
                    compareAt={
                      detailItem.compare_at_price && Number(detailItem.compare_at_price) > Number(detailItem.price)
                        ? detailItem.compare_at_price
                        : null
                    }
                    currency={currency}
                    large
                  />
                </Box>

                {detailItem.options?.map((option) => {
                  const selectedCount = (selectedChoices[option.id] || []).length
                  const limitReached = option.multi_select && option.max_selections && selectedCount >= option.max_selections

                  const groupSoldOut = option.required && !option.choices.some((c) => c.available)
                  const groupMissing = showRequiredErrors && unmetRequired.some((o) => o.id === option.id)

                  return (
                    <FormControl key={option.id} id={`option-${option.id}`} fullWidth error={groupMissing || groupSoldOut} sx={{ mt: 3.5 }}>
                      <FormLabel sx={{ color: 'text.primary', fontWeight: 700, '&.Mui-focused': { color: 'text.primary' } }}>
                        {option.name}
                        {option.required && (
                          <Typography component="span" sx={{ fontWeight: 500, fontSize: 13, color: 'text.secondary', marginInlineStart: 1 }}>
                            {t('menu.required')}
                          </Typography>
                        )}
                      </FormLabel>
                      {option.multi_select && (
                        <Typography variant="body2" color="text.secondary">
                          {option.max_selections ? t('menu.chooseUpTo', { count: option.max_selections }) : t('menu.chooseAsManyAsYouLike')}
                        </Typography>
                      )}
                      <Stack sx={{ mt: 1 }}>
                        {option.choices.map((choice) => {
                          const selected = isChoiceSelected(option.id, choice.id)
                          const disabled = !choice.available || (limitReached && !selected)

                          return (
                            <FormControlLabel
                              key={choice.id}
                              sx={{ mx: 0, py: 0.25, borderBottom: '1px solid rgba(26, 26, 26, 0.07)', '&:last-of-type': { borderBottom: 0 } }}
                              control={
                                option.multi_select ? (
                                  <Checkbox checked={selected} onChange={() => handleChoiceToggle(option, choice)} disabled={disabled} sx={{ '&.Mui-checked': { color: INK } }} />
                                ) : (
                                  <Radio checked={selected} onChange={() => handleChoiceToggle(option, choice)} disabled={!choice.available} sx={{ '&.Mui-checked': { color: INK } }} />
                                )
                              }
                              label={`${choice.label}${Number(choice.price_delta) ? ` (+${formatCurrency(choice.price_delta, currency)})` : ''}`}
                            />
                          )
                        })}
                      </Stack>
                      {limitReached && (
                        <Typography variant="caption" color="text.secondary">
                          {t('menu.maxSelected', { count: option.max_selections })}
                        </Typography>
                      )}
                      {(groupMissing || groupSoldOut) && (
                        <FormHelperText role="alert">{groupSoldOut ? t('menu.requiredSoldOut') : t('menu.chooseRequired')}</FormHelperText>
                      )}
                    </FormControl>
                  )
                })}
              </Box>
            </DialogContent>

            <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center', p: 2, borderTop: '1px solid rgba(26, 26, 26, 0.08)', bgcolor: '#fff' }}>
              <Stack direction="row" sx={{ alignItems: 'center', borderRadius: RADIUS, bgcolor: 'rgba(26, 26, 26, 0.07)' }}>
                <IconButton onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="-" disabled={quantity <= 1} sx={{ width: 44, height: 44, ...pressable }}>
                  <RemoveIcon fontSize="small" />
                </IconButton>
                <Typography sx={{ minWidth: 28, textAlign: 'center', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{quantity}</Typography>
                <IconButton onClick={() => setQuantity((q) => Math.min(MAX_QUANTITY, q + 1))} aria-label="+" disabled={quantity >= MAX_QUANTITY} sx={{ width: 44, height: 44, ...pressable }}>
                  <AddIcon fontSize="small" />
                </IconButton>
              </Stack>
              <Button
                fullWidth
                variant="contained"
                onClick={handleAddToCart}
                disabled={soldOutRequired}
                sx={{
                  height: 48,
                  borderRadius: RADIUS,
                  justifyContent: 'space-between',
                  px: 2.5,
                  bgcolor: INK,
                  color: '#fff',
                  boxShadow: 'none',
                  ...pressable,
                  '&:hover': { bgcolor: '#333', boxShadow: 'none' },
                }}
              >
                <span>{t('menu.addToCart')}</span>
                <Box component="span" sx={{ color: AMBER, fontVariantNumeric: 'tabular-nums' }}>
                  {formatCurrency(detailTotal, currency)}
                </Box>
              </Button>
            </Stack>
          </>
        )}
      </Dialog>

      <Dialog
        open={Boolean(detailCombo)}
        onClose={closeComboDetail}
        maxWidth="sm"
        fullWidth
        slots={isMobile ? { transition: SlideUp } : undefined}
        sx={sheetSx}
      >
        {detailCombo && (
          <>
            {closeButton(closeComboDetail)}
            <DialogContent sx={{ p: 0 }}>
              {detailCombo.image_url && (
                <Box component="img" src={detailCombo.image_url} alt={detailCombo.name} sx={{ width: '100%', aspectRatio: '16 / 10', objectFit: 'cover', display: 'block' }} />
              )}
              <Box sx={{ p: { xs: 2.5, sm: 3 } }}>
                <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.25, textWrap: 'balance' }}>
                    {detailCombo.name}
                  </Typography>
                  <Chip label={stripEmoji(t('menu.comboBadge'))} size="small" sx={{ bgcolor: INK, color: AMBER, fontWeight: 700 }} />
                </Stack>
                {detailCombo.description && (
                  <Typography sx={{ mt: 1, color: 'text.secondary', lineHeight: 1.6 }}>{detailCombo.description}</Typography>
                )}

                <Stack sx={{ mt: 3 }}>
                  {detailCombo.items.map((item) => (
                    <Stack key={item.id} direction="row" sx={{ gap: 2, alignItems: 'center', py: 1.25, borderBottom: '1px solid rgba(26, 26, 26, 0.07)', '&:last-of-type': { borderBottom: 0 } }}>
                      {item.image_url && (
                        <Box component="img" src={item.image_url} alt="" sx={{ width: 56, height: 56, objectFit: 'cover', borderRadius: RADIUS, flexShrink: 0 }} />
                      )}
                      <Typography sx={{ flex: 1, fontWeight: 600 }}>{item.name}</Typography>
                      <Typography sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(item.price, currency)}</Typography>
                    </Stack>
                  ))}
                </Stack>

                <Box sx={{ mt: 2 }}>
                  <Price price={detailCombo.discounted_price} compareAt={detailCombo.original_price} currency={currency} large />
                  <Typography sx={{ mt: 0.5, fontSize: 14, fontWeight: 600, color: 'success.dark' }}>
                    {t('menu.youSave', { amount: formatCurrency(detailCombo.discount_amount, currency) })}
                  </Typography>
                </Box>
              </Box>
            </DialogContent>

            <Box sx={{ p: 2, borderTop: '1px solid rgba(26, 26, 26, 0.08)', bgcolor: '#fff' }}>
              <Button
                fullWidth
                variant="contained"
                onClick={handleAddComboToCart}
                sx={{ height: 48, borderRadius: RADIUS, bgcolor: INK, color: '#fff', boxShadow: 'none', ...pressable, '&:hover': { bgcolor: '#333', boxShadow: 'none' } }}
              >
                {t('menu.addAllToCart')}
              </Button>
            </Box>
          </>
        )}
      </Dialog>
    </Box>
  )
}

export default MenuPage
