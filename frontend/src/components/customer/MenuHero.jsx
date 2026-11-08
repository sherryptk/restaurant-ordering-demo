import { useEffect, useState } from 'react'
import { Box, ButtonBase, Typography, useMediaQuery, useTheme } from '@mui/material'
import { keyframes } from '@emotion/react'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { useTranslation } from 'react-i18next'
import { stripEmoji } from '../../utils/format'

const INK = '#1A1A1A'
const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)'

const riseIn = keyframes`
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
`

const reveal = (delayMs) => ({
  animation: `${riseIn} 480ms ${EASE_OUT} both`,
  animationDelay: `${delayMs}ms`,
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
})

// Product photos for the rotating hero. Add your own as { src: '/images/your-photo.webp', pos: '50% 50%' }
// (`pos` is the crop point inside the frame). With no photos the hero shows a styled color panel instead.
const SLIDES = []
const SLIDE_MS = 5500

const ORANGE = '#F7901E'
const YELLOW = '#FFD06B'

function SpeechBubble({ children, width }) {
  return (
    <Box sx={{ position: 'relative', width, aspectRatio: '1.3 / 1', flexShrink: 0 }}>
      <Box component="svg" viewBox="0 0 130 100" aria-hidden sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
        <path
          d="M18 6 H112 Q124 6 124 18 V62 Q124 74 112 74 H62 L30 94 L38 74 H18 Q6 74 6 62 V18 Q6 6 18 6 Z"
          fill={YELLOW}
          stroke={INK}
          strokeWidth="3"
          strokeLinejoin="round"
        />
      </Box>
      <Box sx={{ position: 'absolute', insetInline: 0, top: 0, height: '74%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: INK, lineHeight: 0.95 }}>
        {children}
      </Box>
    </Box>
  )
}

function MenuHero({ info, onOrder, maxDiscount = 0, closed = false }) {
  const { t } = useTranslation()
  const theme = useTheme()
  const rtl = theme.direction === 'rtl'
  // Desktop shows two portrait photos side by side, so each is cropped far less than in one wide frame.
  const perView = useMediaQuery(theme.breakpoints.up('md')) ? 2 : 1
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    if (paused || reduceMotion || SLIDES.length < 2) return undefined
    const timer = setTimeout(() => setIndex((i) => (i + perView) % SLIDES.length), SLIDE_MS)
    return () => clearTimeout(timer)
  }, [index, paused, reduceMotion, perView])

  // Photo shown in each visible slot; a step moves every slot on to the next unseen photo.
  const shown = SLIDES.length ? Array.from({ length: Math.min(perView, SLIDES.length) }, (_, slot) => (index + slot) % SLIDES.length) : []
  const displayFamily = theme.typography.h4.fontFamily
  const headlineFamily = rtl ? theme.typography.h4.fontFamily : "'Anton', 'Poppins', sans-serif"
  // The photo hero is the default; `?hero=banner` brings back the uploaded banner artwork.
  const wantBanner = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('hero') === 'banner'

  if (info.banner_url && wantBanner) {
    return (
      <Box sx={{ px: { xs: 2, md: 4 }, pt: { xs: 3, md: 4 } }}>
        <Typography
          component="h1"
          sx={{
            maxWidth: 900,
            mx: 'auto',
            mb: { xs: 2, md: 3 },
            textAlign: 'center',
            fontFamily: (theme) => theme.typography.h4.fontFamily,
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.01em',
            fontSize: { xs: 26, sm: 34, md: 44 },
            lineHeight: 1.1,
            textWrap: 'balance',
            ...reveal(0),
          }}
        >
          {t('menu.heroTitle')}
        </Typography>
        <Box
          sx={{
            maxWidth: 1240,
            mx: 'auto',
            borderRadius: '4px',
            overflow: 'hidden',
            bgcolor: INK,
            // The artwork is 16:9. On phones a taller frame crops the sides (the centered logo
            // and headline survive) so everything renders about a third larger; on wide
            // screens a slightly wider frame trims the top and bottom to keep the menu near the fold.
            aspectRatio: { xs: '1.25 / 1', sm: '16 / 9', md: '2.1 / 1' },
            ...reveal(0),
          }}
        >
          <Box
            component="img"
            src={info.banner_url}
            alt={stripEmoji(info.name)}
            fetchPriority="high"
            sx={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }}
          />
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, pt: { xs: 3, md: 4 } }}>
      <Box
        component="section"
        sx={{
          position: 'relative',
          maxWidth: 1240,
          mx: 'auto',
          overflow: 'hidden',
          border: `1px solid ${INK}`,
          borderRadius: '4px',
          bgcolor: INK,
          ...(SLIDES.length === 0 && {
            backgroundImage: `radial-gradient(circle at 85% 30%, ${ORANGE} 0, ${ORANGE} 22%, transparent 22.2%), radial-gradient(circle at 70% 85%, ${YELLOW} 0, ${YELLOW} 12%, transparent 12.2%)`,
          }),
          color: '#fff',
          // Tall enough on desktop that the portrait photos are cropped far less than in a thin banner.
          minHeight: { xs: 600, md: 'clamp(540px, 76vh, 680px)' },
          display: 'flex',
          alignItems: { xs: 'flex-end', md: 'center' },
        }}
      >
        <Box aria-hidden sx={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          {shown.map((current, slot) => (
            <Box
              key={slot}
              sx={{ position: 'absolute', top: 0, bottom: 0, insetInlineStart: `${(slot * 100) / perView}%`, width: `${100 / perView}%`, overflow: 'hidden' }}
            >
              {/* Every photo is stacked in the slot; the current one fades in while easing from a slight
                  zoom to rest, which reads as a slow, smooth dissolve instead of a hard slide. */}
              {SLIDES.map((slide, i) => {
                const active = i === current
                return (
                  <Box
                    key={slide.src}
                    component="img"
                    src={slide.src}
                    alt=""
                    loading={i === 0 ? 'eager' : 'lazy'}
                    fetchPriority={i === 0 ? 'high' : 'auto'}
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: slide.pos,
                      opacity: active ? 1 : 0,
                      transform: active ? 'scale(1)' : 'scale(1.06)',
                      transition: active
                        ? `opacity 1100ms ease ${slot * 220}ms, transform 7000ms ease-out ${slot * 220}ms`
                        : `opacity 1100ms ease ${slot * 220}ms, transform 0s linear ${1100 + slot * 220}ms`,
                      '@media (prefers-reduced-motion: reduce)': { transition: 'none', transform: 'none' },
                    }}
                  />
                )
              })}
            </Box>
          ))}
        </Box>
        {/* Darkened side so the headline stays readable; the photo stays bright on the other side. */}
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            background: {
              xs: 'linear-gradient(0deg, rgba(26,26,26,0.92) 0%, rgba(26,26,26,0.78) 42%, rgba(26,26,26,0) 78%)',
              md: rtl
                ? 'linear-gradient(270deg, rgba(26,26,26,0.9) 0%, rgba(26,26,26,0.72) 38%, rgba(26,26,26,0) 70%)'
                : 'linear-gradient(90deg, rgba(26,26,26,0.9) 0%, rgba(26,26,26,0.72) 38%, rgba(26,26,26,0) 70%)',
            },
          }}
        />

        <Box sx={{ position: 'relative', zIndex: 1, maxWidth: { md: 560 }, px: { xs: 2.5, md: 7 }, pt: { xs: 3.5, md: 5 }, pb: { xs: 7, md: 5 } }}>
          <Typography
            sx={{ fontFamily: displayFamily, fontWeight: 900, textTransform: 'uppercase', letterSpacing: { xs: '0.1em', md: '0.14em' }, fontSize: { xs: 14, md: 18 }, color: YELLOW, ...reveal(0) }}
          >
            {t('menu.heroKicker')}
          </Typography>
          <Typography
            component="h1"
            sx={{
              m: 0,
              mt: 0.5,
              fontFamily: headlineFamily,
              fontWeight: rtl ? 900 : 400,
              textTransform: 'uppercase',
              color: '#fff',
              fontSize: { xs: 58, sm: 76, md: 96 },
              lineHeight: rtl ? 1.15 : 0.98,
              letterSpacing: rtl ? 0 : '0.01em',
              textWrap: 'balance',
              ...reveal(60),
            }}
          >
            {t('menu.heroBig')}
          </Typography>

          <Box sx={{ mt: { xs: 3, md: 4 }, ...reveal(120) }}>
            {closed ? (
              <Box sx={{ display: 'inline-flex', px: 2.5, py: 1.5, bgcolor: '#fff', color: INK, border: `2px solid ${INK}`, borderRadius: '2px', maxWidth: 420 }}>
                <Typography sx={{ fontWeight: 800, fontSize: { xs: 14, md: 15 }, lineHeight: 1.4 }}>{t('menu.currentlyClosed')}</Typography>
              </Box>
            ) : (
              <ButtonBase
                onClick={onOrder}
                disableRipple
                sx={{
                  height: 54,
                  px: 3.5,
                  gap: 1.5,
                  borderRadius: '2px',
                  bgcolor: ORANGE,
                  color: INK,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontWeight: 800,
                  fontSize: 15,
                  transition: `transform 160ms ${EASE_OUT}, background-color 160ms ease`,
                  '&:active': { transform: 'scale(0.97)' },
                  '&.Mui-focusVisible': { outline: '3px solid #fff', outlineOffset: 3 },
                  '@media (hover: hover) and (pointer: fine)': {
                    '&:hover': { bgcolor: '#FFA640' },
                    '&:hover .cta-arrow': { translate: rtl ? '-3px 0' : '3px 0' },
                  },
                }}
              >
                {t('menu.orderNow')}
                <ArrowForwardIcon className="cta-arrow" sx={{ fontSize: 20, transition: `translate 200ms ${EASE_OUT}`, scale: rtl ? '-1 1' : '1 1' }} />
              </ButtonBase>
            )}
          </Box>
        </Box>

        {SLIDES.length > 1 && (
        <Box
          role="group"
          aria-label="Slides"
          sx={{ position: 'absolute', insetInlineEnd: { xs: 16, md: 28 }, bottom: { xs: 14, md: 20 }, zIndex: 2, display: 'flex', alignItems: 'center', gap: 0.75 }}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          {SLIDES.map((slide, i) => (
            <ButtonBase
              key={slide.src}
              onClick={() => setIndex(i)}
              aria-label={`${i + 1} / ${SLIDES.length}`}
              aria-current={shown.includes(i) ? 'true' : undefined}
              disableRipple
              sx={{
                // 24px hit area around a small bar so dots are easy to tap.
                width: 24,
                height: 24,
                '&::after': {
                  content: '""',
                  width: shown.includes(i) ? 22 : 8,
                  height: 4,
                  borderRadius: '2px',
                  bgcolor: shown.includes(i) ? ORANGE : 'rgba(255,255,255,0.6)',
                  transition: `width 250ms ${EASE_OUT}, background-color 200ms ease`,
                },
                '&.Mui-focusVisible': { outline: '2px solid #fff', outlineOffset: 1 },
              }}
            />
          ))}
        </Box>
        )}

        {maxDiscount > 0 && (
          <Box sx={{ position: 'absolute', top: { xs: '8%', md: '12%' }, insetInlineEnd: { xs: '5%', md: '6%' }, rotate: '8deg', zIndex: 2, ...reveal(420) }}>
            <SpeechBubble width={124}>
              <Typography component="span" sx={{ fontFamily: displayFamily, fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {t('menu.upTo')}
              </Typography>
              <Typography component="span" sx={{ fontFamily: displayFamily, fontWeight: 900, fontSize: 22, textTransform: 'uppercase' }}>
                {t('menu.percentOff', { percent: maxDiscount })}
              </Typography>
            </SpeechBubble>
          </Box>
        )}
      </Box>
    </Box>
  )
}

export default MenuHero
