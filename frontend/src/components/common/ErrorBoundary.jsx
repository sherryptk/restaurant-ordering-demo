import { Component } from 'react'
import { Box, Typography, Button } from '@mui/material'
import { withTranslation } from 'react-i18next'

const CHUNK_LOAD_ERROR = /dynamically imported module|Importing a module script failed|Failed to fetch/i
const CHUNK_RELOAD_KEY = 'chunk-reload-attempted'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    if (CHUNK_LOAD_ERROR.test(error?.message || '') && !sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
      sessionStorage.setItem(CHUNK_RELOAD_KEY, '1')
      window.location.reload()
    }
  }

  componentDidMount() {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY)
  }

  render() {
    const { t } = this.props
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            gap: 2,
            p: 3,
            textAlign: 'center',
          }}
        >
          <Typography variant="h6">{t('errorBoundary.somethingWentWrong')}</Typography>
          <Button variant="contained" onClick={() => window.location.reload()}>
            {t('errorBoundary.reload')}
          </Button>
        </Box>
      )
    }

    return this.props.children
  }
}

export default withTranslation()(ErrorBoundary)
