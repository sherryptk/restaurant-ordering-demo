import { Box, Container, Typography, Link, Stack } from '@mui/material'
import { useTranslation, Trans } from 'react-i18next'

function Section({ title, children }) {
  return (
    <Box component="section" sx={{ mt: 4 }}>
      <Typography variant="h6" component="h2" gutterBottom>
        {title}
      </Typography>
      <Stack spacing={1.5}>{children}</Stack>
    </Box>
  )
}

export default function PrivacyPolicyPage() {
  const { t } = useTranslation()

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {t('privacy.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {t('privacy.effectiveDate')}
      </Typography>

      <Typography sx={{ mt: 2 }}>
        <Trans i18nKey="privacy.intro">
          This Privacy Policy explains how Demo Café ("Demo Café," "we," "us," or "our"), available at{' '}
          <Link href="https://demo.example.com/" target="_blank" rel="noopener">
            demo.example.com
          </Link>
          , collects, uses, stores, shares, and protects information when you visit our website or use our
          online ordering service (the "Service"), including information obtained through Sign in
          with Google.
        </Trans>
      </Typography>

      <Section title={t('privacy.section1.title')}>
        <Typography>{t('privacy.section1.intro')}</Typography>

        <Typography fontWeight={600}>{t('privacy.section1.directHeading')}</Typography>
        <Box component="ul" sx={{ mt: 0, pl: 3 }}>
          <li>
            <Typography>{t('privacy.section1.direct1')}</Typography>
          </li>
          <li>
            <Typography>{t('privacy.section1.direct2')}</Typography>
          </li>
        </Box>

        <Typography fontWeight={600}>{t('privacy.section1.googleHeading')}</Typography>
        <Typography>{t('privacy.section1.googleIntro')}</Typography>
        <Box component="ul" sx={{ mt: 0, pl: 3 }}>
          <li>
            <Typography>{t('privacy.section1.google1')}</Typography>
          </li>
          <li>
            <Typography>{t('privacy.section1.google2')}</Typography>
          </li>
          <li>
            <Typography>{t('privacy.section1.google3')}</Typography>
          </li>
        </Box>
        <Typography>{t('privacy.section1.googleNote')}</Typography>

        <Typography fontWeight={600}>{t('privacy.section1.autoHeading')}</Typography>
        <Typography>{t('privacy.section1.autoNote')}</Typography>
      </Section>

      <Section title={t('privacy.section2.title')}>
        <Typography>{t('privacy.section2.intro')}</Typography>
        <Box component="ul" sx={{ mt: 0, pl: 3 }}>
          <li>
            <Typography>{t('privacy.section2.item1')}</Typography>
          </li>
          <li>
            <Typography>{t('privacy.section2.item2')}</Typography>
          </li>
          <li>
            <Typography>{t('privacy.section2.item3')}</Typography>
          </li>
          <li>
            <Typography>{t('privacy.section2.item4')}</Typography>
          </li>
          <li>
            <Typography>{t('privacy.section2.item5')}</Typography>
          </li>
          <li>
            <Typography>{t('privacy.section2.item6')}</Typography>
          </li>
        </Box>
        <Typography>{t('privacy.section2.note')}</Typography>
      </Section>

      <Section title={t('privacy.section3.title')}>
        <Typography>{t('privacy.section3.noSell')}</Typography>
        <Typography>{t('privacy.section3.intro')}</Typography>
        <Box component="ul" sx={{ mt: 0, pl: 3 }}>
          <li>
            <Typography>{t('privacy.section3.item1')}</Typography>
          </li>
          <li>
            <Typography>{t('privacy.section3.item2')}</Typography>
          </li>
          <li>
            <Typography>{t('privacy.section3.item3')}</Typography>
          </li>
        </Box>
        <Typography>{t('privacy.section3.note')}</Typography>
      </Section>

      <Section title={t('privacy.section4.title')}>
        <Typography>{t('privacy.section4.para1')}</Typography>
        <Typography>{t('privacy.section4.para2')}</Typography>
      </Section>

      <Section title={t('privacy.section5.title')}>
        <Typography>{t('privacy.section5.para1')}</Typography>
      </Section>

      <Section title={t('privacy.section6.title')}>
        <Typography>{t('privacy.section6.para1')}</Typography>
      </Section>

      <Section title={t('privacy.section7.title')}>
        <Typography>
          <Trans i18nKey="privacy.section7.para1">
            You may revoke Demo Café access to your Google account data at any time through your{' '}
            <Link href="https://myaccount.google.com/permissions" target="_blank" rel="noopener">
              Google Account security settings
            </Link>
            . You may also request to access, correct, or delete the personal information we hold about you
            by contacting us below.
          </Trans>
        </Typography>
      </Section>

      <Section title={t('privacy.section8.title')}>
        <Typography>{t('privacy.section8.para1')}</Typography>
      </Section>

      <Section title={t('privacy.section9.title')}>
        <Box sx={{ bgcolor: '#F5F1EC', borderRadius: 2, p: 3 }}>
          <Typography>{t('privacy.section9.intro')}</Typography>
          <Typography sx={{ mt: 2 }} fontWeight={700}>
            Demo Café
          </Typography>
          <Typography>
            {t('privacy.section9.email')} <Link href="mailto:admin@example.com">admin@example.com</Link>
          </Typography>
          <Typography>
            {t('privacy.section9.website')}{' '}
            <Link href="https://demo.example.com/" target="_blank" rel="noopener">
              demo.example.com
            </Link>
          </Typography>
        </Box>
      </Section>
    </Container>
  )
}
