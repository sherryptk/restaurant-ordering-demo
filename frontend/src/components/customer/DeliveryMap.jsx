import { useCallback, useEffect, useRef, useState } from 'react'
import { Box, Stack, TextField, Button, Chip, CircularProgress, Typography } from '@mui/material'
import MyLocationIcon from '@mui/icons-material/MyLocation'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { branchApi } from '../../api'
import { formatCurrency } from '../../utils/format'
import i18n from '../../i18n'

const ALEXANDRIA_CENTER = { lat: 31.2001, lng: 29.9187 }
const DEFAULT_ZOOM = 13

// Shared across every DeliveryMap instance on the page so the Google Maps
// script tag is only ever injected once, no matter how many times this
// component mounts.
let mapsLoadingPromise = null

function loadGoogleMaps() {
  if (window.google?.maps) return Promise.resolve(window.google.maps)
  if (mapsLoadingPromise) return mapsLoadingPromise

  mapsLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&language=${i18n.language}`
    script.async = true
    script.onload = () => resolve(window.google.maps)
    script.onerror = () => reject(new Error('Failed to load Google Maps'))
    document.head.appendChild(script)
  })

  return mapsLoadingPromise
}

function DeliveryMap({ onLocationChange, onAddressChange, onBranchChange, initialLocation, initialAddress }) {
  const { t } = useTranslation()
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)

  const [mapReady, setMapReady] = useState(false)
  const [position, setPosition] = useState(initialLocation || ALEXANDRIA_CENTER)
  const [branch, setBranch] = useState(null)
  const [zone, setZone] = useState(null)
  const [checkingBranch, setCheckingBranch] = useState(false)
  // The initial default-center pin doesn't count as a real selection — only
  // an explicit drag, "Use my location", or a pre-selected saved address do.
  const [hasLocation, setHasLocation] = useState(Boolean(initialLocation))

  const [street, setStreet] = useState(initialAddress?.street || '')
  const [building, setBuilding] = useState(initialAddress?.building || '')
  const [floor, setFloor] = useState(initialAddress?.floor || '')
  const [apartment, setApartment] = useState(initialAddress?.apartment || '')
  const [notes, setNotes] = useState(initialAddress?.notes || '')

  const checkBranch = useCallback(
    async (lat, lng, hasLoc) => {
      setCheckingBranch(true)
      try {
        const res = await branchApi.findByLocation(lat, lng)
        setBranch(res.data.branch)
        setZone(res.data.zone)
        onBranchChange?.(res.data.branch)
        onLocationChange?.(lat, lng, res.data.zone, hasLoc)
      } catch {
        setBranch(null)
        setZone(null)
        onBranchChange?.(null)
        onLocationChange?.(lat, lng, null, hasLoc)
      } finally {
        setCheckingBranch(false)
      }
    },
    [onBranchChange, onLocationChange]
  )

  const handleLocationUpdate = useCallback(
    (lat, lng, hasLoc) => {
      setPosition({ lat, lng })
      setHasLocation(hasLoc)
      checkBranch(lat, lng, hasLoc)
    },
    [checkBranch]
  )

  useEffect(() => {
    let cancelled = false
    const startLocation = initialLocation || ALEXANDRIA_CENTER

    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !mapContainerRef.current) return

        const map = new maps.Map(mapContainerRef.current, {
          center: startLocation,
          zoom: DEFAULT_ZOOM,
        })

        const marker = new maps.Marker({
          position: startLocation,
          map,
          draggable: true,
        })

        marker.addListener('dragend', () => {
          const pos = marker.getPosition()
          handleLocationUpdate(pos.lat(), pos.lng(), true)
        })

        mapRef.current = map
        markerRef.current = marker
        setMapReady(true)

        // Report the starting location right away so the parent has coordinates
        // (and the zone chip resolves once actually selected) even before the
        // pin is dragged. Only counts as a real selection if it came from a
        // pre-selected saved address (initialLocation) — the bare default
        // center does not.
        handleLocationUpdate(startLocation.lat, startLocation.lng, Boolean(initialLocation))
      })
      .catch(() => toast.error(t('deliveryMap.failedToLoadMaps')))

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    onAddressChange?.({ lat: position.lat, lng: position.lng, street, building, floor, apartment, notes })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position, street, building, floor, apartment, notes])

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error(t('deliveryMap.geolocationNotSupported'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (geoPosition) => {
        const lat = geoPosition.coords.latitude
        const lng = geoPosition.coords.longitude
        markerRef.current?.setPosition({ lat, lng })
        mapRef.current?.panTo({ lat, lng })
        handleLocationUpdate(lat, lng, true)
      },
      () => toast.error(t('deliveryMap.failedToGetLocation')),
      { enableHighAccuracy: true }
    )
  }

  return (
    <Box>
      <Box sx={{ textAlign: 'center', mb: 1.5 }}>
        <Button
          variant={hasLocation ? 'outlined' : 'contained'}
          size={hasLocation ? 'medium' : 'large'}
          onClick={handleUseMyLocation}
          startIcon={
            hasLocation ? (
              <MyLocationIcon />
            ) : (
              <MyLocationIcon
                sx={{
                  '@keyframes pulse': {
                    '0%': { transform: 'scale(1)', opacity: 1 },
                    '50%': { transform: 'scale(1.25)', opacity: 0.6 },
                    '100%': { transform: 'scale(1)', opacity: 1 },
                  },
                  animation: 'pulse 1.6s ease-in-out infinite',
                }}
              />
            )
          }
          sx={{
            width: { xs: '100%', sm: 'auto' },
            fontWeight: 600,
            px: 3,
            py: hasLocation ? 1 : 1.25,
            ...(!hasLocation && {
              bgcolor: '#F5A623',
              color: '#fff',
              '&:hover': { bgcolor: '#C17D0E' },
            }),
          }}
        >
          {t('deliveryMap.useMyCurrentLocation')}
        </Button>
        <Box sx={{ mt: 0.75 }}>
          <Box component="span" sx={{ color: 'grey.600', fontSize: '0.8rem' }}>
            {t('deliveryMap.orDragThePin')}
          </Box>
        </Box>
      </Box>

      <Box
        ref={mapContainerRef}
        sx={{
          height: { xs: 300, md: 350 },
          width: '100%',
          borderRadius: 1,
          bgcolor: 'grey.100',
          border: '3px solid',
          borderColor: hasLocation ? 'success.main' : 'error.main',
          transition: 'border-color 0.3s ease',
          ...(!hasLocation && {
            '@keyframes deliveryLocationPulse': {
              '0%': { boxShadow: '0 0 0 0 rgba(211, 47, 47, 0.5)' },
              '70%': { boxShadow: '0 0 0 10px rgba(211, 47, 47, 0)' },
              '100%': { boxShadow: '0 0 0 0 rgba(211, 47, 47, 0)' },
            },
            animation: 'deliveryLocationPulse 1.8s ease-in-out infinite',
          }),
        }}
      />

      {!hasLocation ? (
        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.75 }}>
          {t('deliveryMap.selectLocationPrompt')}
        </Typography>
      ) : (
        <Box sx={{ mt: 1 }}>
          {checkingBranch ? (
            <Chip size="small" icon={<CircularProgress size={14} />} label={t('deliveryMap.checkingCoverage')} />
          ) : branch && zone ? (
            <Chip
              size="small"
              color="success"
              label={t('deliveryMap.deliveringFrom', { branch: branch.name, fee: formatCurrency(zone.delivery_fee) })}
            />
          ) : (
            mapReady && <Chip size="small" color="error" label={t('deliveryMap.noDeliveryToArea')} />
          )}
        </Box>
      )}

      <Stack spacing={2} sx={{ mt: 2 }}>
        <TextField label={t('deliveryMap.streetArea')} value={street} onChange={(e) => setStreet(e.target.value)} />
        <TextField label={t('deliveryMap.building')} value={building} onChange={(e) => setBuilding(e.target.value)} />
        <TextField label={t('deliveryMap.floor')} value={floor} onChange={(e) => setFloor(e.target.value)} />
        <TextField label={t('deliveryMap.apartment')} value={apartment} onChange={(e) => setApartment(e.target.value)} />
        <TextField
          label={t('deliveryMap.notesForDriver')}
          multiline
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Stack>
    </Box>
  )
}

export default DeliveryMap
