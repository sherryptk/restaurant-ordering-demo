import { Link as RouterLink } from 'react-router-dom'
import { Box, Typography, Link } from '@mui/material'
import { useTranslation } from 'react-i18next'

function Footer() {
  const { t } = useTranslation()

  return (
    <Box component="footer" sx={{ mt: 4, py: 3, textAlign: 'center', borderTop: '1px solid #1A1A1A' }}>
      <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        <Link component={RouterLink} to="/privacy-policy" color="inherit" underline="hover">
          {t('footer.privacyPolicy')}
        </Link>
      </Typography>
    </Box>
  )
}

export default Footer
