import { ButtonBase, Box, ToggleButton, ToggleButtonGroup } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { authApi } from '../../api'
import { selectAuth, updateCustomer } from '../../store'

const LANGUAGES = [
  { value: 'en', label: 'EN', name: 'English' },
  { value: 'ar', label: 'عربي', name: 'العربية' },
]

function LanguageSwitcher({ size = 'small', sx, compact = false }) {
  const { i18n } = useTranslation()
  const dispatch = useDispatch()
  const { customer } = useSelector(selectAuth)

  const changeLanguage = (value) => {
    if (!value || value === i18n.language) return

    i18n.changeLanguage(value)

    if (customer) {
      dispatch(updateCustomer({ preferred_language: value }))
      authApi.updateMe({ preferred_language: value }).catch(() => {})
    }
  }

  if (compact) {
    const other = LANGUAGES.find((language) => language.value !== i18n.language) || LANGUAGES[0]
    const segment = (selected) => ({
      px: 1.25,
      height: 32,
      borderRadius: '2px',
      fontSize: 13,
      fontWeight: 700,
      bgcolor: selected ? '#1A1A1A' : 'transparent',
      color: selected ? '#fff' : 'text.secondary',
      transition: 'transform 160ms cubic-bezier(0.23, 1, 0.32, 1), background-color 160ms ease, color 160ms ease',
      '&:active': { transform: 'scale(0.96)' },
      '&.Mui-focusVisible': { outline: '2px solid #1A1A1A', outlineOffset: 2 },
    })

    return (
      <>
        {/* Phones: one button that offers the other language, to save nav width. */}
        <ButtonBase
          disableRipple
          onClick={() => changeLanguage(other.value)}
          aria-label={other.name}
          sx={{ ...segment(false), display: { xs: 'inline-flex', sm: 'none' }, height: 44, px: 1.75, fontSize: 14, border: '1px solid #1A1A1A', color: 'text.primary', borderRadius: '4px', ...sx }}
        >
          {other.label}
        </ButtonBase>
        <Box
          role="group"
          aria-label="Language"
          sx={{ display: { xs: 'none', sm: 'flex' }, p: 0.5, gap: 0.25, borderRadius: '4px', border: '1px solid #1A1A1A', ...sx }}
        >
          {LANGUAGES.map((language) => {
            const selected = i18n.language === language.value
            return (
              <ButtonBase
                key={language.value}
                disableRipple
                onClick={() => changeLanguage(language.value)}
                aria-pressed={selected}
                aria-label={language.name}
                sx={segment(selected)}
              >
                {language.label}
              </ButtonBase>
            )
          })}
        </Box>
      </>
    )
  }

  return (
    <ToggleButtonGroup
      value={i18n.language}
      exclusive
      size={size}
      onChange={(_event, value) => changeLanguage(value)}
      sx={sx}
      aria-label="Language"
    >
      <ToggleButton value="en" aria-label="English" sx={{ gap: 0.5, px: 1 }}>
        <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>🇺🇸</span> EN
      </ToggleButton>
      <ToggleButton value="ar" aria-label="Arabic" sx={{ gap: 0.5, px: 1 }}>
        <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>🇪🇬</span> AR
      </ToggleButton>
    </ToggleButtonGroup>
  )
}

export default LanguageSwitcher
