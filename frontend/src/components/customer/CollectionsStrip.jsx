import { useRef } from 'react'
import { Box, ButtonBase, IconButton, Typography, useTheme } from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import { useTranslation } from 'react-i18next'

const INK = '#1A1A1A'
const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)'

// Flat colour fields, cycled across tiles. All are brand colours or tints of them,
// and each pairs with a text colour that clears 4.5:1 on its field.
const FIELDS = [
  { bg: '#F5A623', fg: INK },
  { bg: '#1A1A1A', fg: '#FFFFFF' },
  { bg: '#FFD06B', fg: INK },
  { bg: '#5B3320', fg: '#FFFFFF' },
  { bg: '#F3E2BD', fg: INK },
]

function SaleBadge({ percent }) {
  const { t } = useTranslation()
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 10,
        insetInlineStart: 10,
        zIndex: 1,
        width: 60,
        height: 60,
        borderRadius: '50%',
        bgcolor: '#fff',
        color: INK,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        lineHeight: 1.1,
      }}
    >
      <Typography component="span" sx={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {t('menu.upTo')}
      </Typography>
      <Typography component="span" sx={{ fontSize: 13, fontWeight: 900, textTransform: 'uppercase' }}>
        {t('menu.percentOff', { percent })}
      </Typography>
    </Box>
  )
}

function Tile({ entry, field, onSelect }) {
  const { t } = useTranslation()

  return (
    <ButtonBase
      disableRipple
      onClick={() => onSelect(entry.id)}
      sx={{
        position: 'relative',
        flex: '0 0 auto',
        width: { xs: 150, sm: 190, md: 224 },
        aspectRatio: '4 / 5',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        textAlign: 'start',
        bgcolor: field.bg,
        color: field.fg,
        scrollSnapAlign: 'start',
        transition: `transform 160ms ${EASE_OUT}`,
        '&:active': { transform: 'scale(0.98)' },
        '&.Mui-focusVisible': { outline: `3px solid ${INK}`, outlineOffset: 2 },
        '@media (hover: hover) and (pointer: fine)': { '&:hover img': { transform: 'scale(1.05)' } },
      }}
    >
      {entry.badgePercent > 0 && <SaleBadge percent={entry.badgePercent} />}
      <Box sx={{ flex: '1 1 0', minHeight: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {entry.image ? (
          <Box
            component="img"
            src={entry.image}
            alt=""
            loading="lazy"
            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: `transform 500ms ${EASE_OUT}` }}
          />
        ) : (
          <RestaurantIcon sx={{ fontSize: 40, opacity: 0.5 }} />
        )}
      </Box>
      <Box sx={{ px: 1.5, pt: 1.25, pb: 1.5 }}>
        <Typography
          component="div"
          sx={{
            fontFamily: (theme) => (theme.direction === 'rtl' ? theme.typography.fontFamily : "'Libre Caslon Text', Georgia, serif"),
            fontSize: 13,
            lineHeight: 1.3,
            opacity: 0.9,
          }}
        >
          {t('menu.itemCount', { count: entry.count })}
        </Typography>
        <Typography
          component="div"
          sx={{
            mt: 0.25,
            fontFamily: (theme) => theme.typography.h4.fontFamily,
            fontWeight: 800,
            fontSize: { xs: 16, md: 19 },
            lineHeight: 1.15,
            textTransform: 'uppercase',
            letterSpacing: '0.01em',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {entry.label}
        </Typography>
      </Box>
    </ButtonBase>
  )
}

function CollectionsStrip({ entries, onSelect }) {
  const scrollerRef = useRef(null)
  const rtl = useTheme().direction === 'rtl'

  if (entries.length === 0) return null

  const scrollByPage = (direction) => {
    const scroller = scrollerRef.current
    if (!scroller) return
    // direction: 1 = towards the end of the row. In RTL the row's end is on the left.
    const sign = rtl ? -1 : 1
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    scroller.scrollBy({ left: sign * direction * scroller.clientWidth * 0.8, behavior: reduce ? 'auto' : 'smooth' })
  }

  const arrowSx = (side) => ({
    display: { xs: 'none', md: 'flex' },
    position: 'absolute',
    top: '50%',
    [side]: -18,
    transform: 'translateY(-50%)',
    zIndex: 2,
    width: 40,
    height: 40,
    bgcolor: '#fff',
    color: INK,
    border: `1px solid ${INK}`,
    '&:hover': { bgcolor: '#F3E2BD' },
    '&:active': { transform: 'translateY(-50%) scale(0.96)' },
  })

  return (
    <Box sx={{ position: 'relative' }}>
      <IconButton aria-label="Previous" onClick={() => scrollByPage(-1)} sx={arrowSx('insetInlineStart')}>
        {rtl ? <ChevronRightIcon /> : <ChevronLeftIcon />}
      </IconButton>
      <IconButton aria-label="Next" onClick={() => scrollByPage(1)} sx={arrowSx('insetInlineEnd')}>
        {rtl ? <ChevronLeftIcon /> : <ChevronRightIcon />}
      </IconButton>
      <Box
        ref={scrollerRef}
        sx={{
          display: 'flex',
          gap: 1,
          overflowX: 'auto',
          scrollSnapType: 'x proximity',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {entries.map((entry, index) => (
          <Tile key={entry.id} entry={entry} field={FIELDS[index % FIELDS.length]} onSelect={onSelect} />
        ))}
      </Box>
    </Box>
  )
}

export default CollectionsStrip
