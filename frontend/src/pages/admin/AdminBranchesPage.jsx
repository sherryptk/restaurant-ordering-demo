import { useEffect, useRef, useState } from 'react'
import {
  Box,
  Typography,
  Stack,
  Card,
  CardContent,
  Chip,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Divider,
  CircularProgress,
  Alert,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import TuneIcon from '@mui/icons-material/Tune'
import CloseIcon from '@mui/icons-material/Close'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { adminBranchApi } from '../../api'
import { formatCurrency } from '../../utils/format'

const ALEXANDRIA_CENTER = { lat: 31.2001, lng: 29.9187 }
const ZONE_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD']

function getDays(t) {
  return [
    { key: 'monday', label: t('adminBranches.monday') },
    { key: 'tuesday', label: t('adminBranches.tuesday') },
    { key: 'wednesday', label: t('adminBranches.wednesday') },
    { key: 'thursday', label: t('adminBranches.thursday') },
    { key: 'friday', label: t('adminBranches.friday') },
    { key: 'saturday', label: t('adminBranches.saturday') },
    { key: 'sunday', label: t('adminBranches.sunday') },
  ]
}

const DEFAULT_OPENING_HOURS = {
  monday: { open: true, from: '10:00', to: '23:00' },
  tuesday: { open: true, from: '10:00', to: '23:00' },
  wednesday: { open: true, from: '10:00', to: '23:00' },
  thursday: { open: true, from: '10:00', to: '23:00' },
  friday: { open: true, from: '12:00', to: '00:00' },
  saturday: { open: true, from: '10:00', to: '23:00' },
  sunday: { open: false, from: '10:00', to: '23:00' },
}

function zoneColor(index) {
  return ZONE_COLORS[index % ZONE_COLORS.length]
}

// Kept separate from the customer DeliveryMap's loader so each caches its
// own script-injection promise independently.
//
// Note: this used to request `&libraries=drawing` for google.maps.drawing.
// DrawingManager, but as of Maps JS API v3.65 that constructor throws
// ("DrawingManager functionality ... is no longer available") — Google
// removed it. Polygon drawing below is done manually (click-to-place-vertex)
// instead, so the drawing library isn't needed at all anymore.
let adminMapsLoadingPromise = null
function loadGoogleMaps() {
  if (window.google?.maps) return Promise.resolve(window.google.maps)
  if (adminMapsLoadingPromise) return adminMapsLoadingPromise

  adminMapsLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
    script.async = true
    script.onload = () => resolve(window.google.maps)
    script.onerror = () => reject(new Error('Failed to load Google Maps'))
    document.head.appendChild(script)
  })

  return adminMapsLoadingPromise
}

const EMPTY_BRANCH = {
  name: '',
  name_ar: '',
  slug: '',
  address: '',
  city: '',
  phone: '',
  delivery_fee: '',
  min_order_amount: '',
  estimated_pickup_minutes: '',
  estimated_delivery_minutes: '',
  accepts_pickup: true,
  accepts_delivery: true,
  is_open: true,
  lat: ALEXANDRIA_CENTER.lat,
  lng: ALEXANDRIA_CENTER.lng,
  delivery_zones: [],
  opening_hours: DEFAULT_OPENING_HOURS,
}

const EMPTY_ZONE = { id: '', name: '', delivery_fee: '', polygon: [] }

function slugify(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function pathToCoords(polygon) {
  const path = polygon.getPath()
  const coords = []
  for (let i = 0; i < path.getLength(); i++) {
    const point = path.getAt(i)
    coords.push({ lat: point.lat(), lng: point.lng() })
  }
  return coords
}

// Read-only overview map: branch pin (click to relocate) plus every
// configured zone's polygon rendered in its own color, for reference only —
// polygon editing happens in ZoneEditorMap inside the per-zone sub-dialog.
function BranchDetailMap({ branch, zones, onLocationChange }) {
  const { t } = useTranslation()
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const polygonsRef = useRef([])
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !containerRef.current) return

        const center = { lat: branch.lat || ALEXANDRIA_CENTER.lat, lng: branch.lng || ALEXANDRIA_CENTER.lng }
        const map = new maps.Map(containerRef.current, { center, zoom: 13 })
        const marker = new maps.Marker({ position: center, map })

        map.addListener('click', (e) => {
          const lat = e.latLng.lat()
          const lng = e.latLng.lng()
          marker.setPosition({ lat, lng })
          onLocationChange(lat, lng)
        })

        mapRef.current = map
        setMapReady(true)
      })
      .catch(() => toast.error(t('deliveryMap.failedToLoadMaps')))

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Redraw zone polygons whenever the zones list changes (e.g. a zone was
  // just added or edited in the sub-dialog) instead of only at mount, and
  // without recreating the whole map so pan/zoom position is preserved.
  useEffect(() => {
    if (!mapReady || !mapRef.current) return

    polygonsRef.current.forEach((polygon) => polygon.setMap(null))
    polygonsRef.current = zones.reduce((polygons, zone, index) => {
      if (!Array.isArray(zone.polygon) || zone.polygon.length < 3) return polygons

      polygons.push(
        new window.google.maps.Polygon({
          paths: zone.polygon,
          map: mapRef.current,
          editable: false,
          draggable: false,
          fillColor: zoneColor(index),
          fillOpacity: 0.25,
          strokeColor: zoneColor(index),
        })
      )
      return polygons
    }, [])
  }, [zones, mapReady])

  return <Box ref={containerRef} sx={{ height: 320, width: '100%', borderRadius: 1, bgcolor: 'grey.100' }} />
}

// Single-zone polygon editor used inside the Add/Edit Zone sub-dialog.
//
// google.maps.drawing.DrawingManager was removed from the Maps JS API (see
// the loader comment above), so polygon drawing is done manually here:
// clicking the map in "drawing mode" appends a numbered point marker and
// redraws a dashed preview line; "Finish Shape" (enabled at 3+ points) locks
// it in as a normal editable/draggable google.maps.Polygon, same as the
// "already has a polygon" path. Drawing mode starts active automatically
// when there's no polygon yet, and "Clear polygon" drops back into it.
function ZoneEditorMap({ branch, polygon, color, onPolygonChange }) {
  const { t } = useTranslation()
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const polygonRef = useRef(null)
  const previewLineRef = useRef(null)
  const pointMarkersRef = useRef([])
  const drawingPointsRef = useRef([])
  const clickListenerRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [pointCount, setPointCount] = useState(0)

  // Vertex-handle drags reliably fire `set_at` on the path (covered below),
  // but dragging the whole polygon by its body moves every vertex at once
  // without necessarily firing per-point path events — so also listen on
  // the polygon itself for dragend/mouseup as a robust catch-all, per
  // Google's own recommended pattern for editable polygons.
  const attachPolygonListeners = (maps, poly) => {
    const emitChange = () => onPolygonChange(pathToCoords(poly))
    const path = poly.getPath()
    ;['set_at', 'insert_at', 'remove_at'].forEach((eventName) => {
      maps.event.addListener(path, eventName, emitChange)
    })
    maps.event.addListener(poly, 'dragend', emitChange)
    maps.event.addListener(poly, 'mouseup', emitChange)
  }

  const clearPointMarkers = () => {
    pointMarkersRef.current.forEach((marker) => marker.setMap(null))
    pointMarkersRef.current = []
  }

  const renderPreview = (maps) => {
    if (previewLineRef.current) previewLineRef.current.setMap(null)
    if (drawingPointsRef.current.length === 0) return

    // Dashed-line recipe: a repeating line-segment icon along an
    // otherwise-invisible stroke — Polyline has no direct "dashed" style.
    const dashedLine = { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 }

    previewLineRef.current = new maps.Polyline({
      path: drawingPointsRef.current,
      map: mapRef.current,
      strokeOpacity: 0,
      strokeColor: color,
      icons: [{ icon: dashedLine, offset: '0', repeat: '12px' }],
      clickable: false,
    })
  }

  const stopDrawingListener = () => {
    if (clickListenerRef.current) {
      window.google.maps.event.removeListener(clickListenerRef.current)
      clickListenerRef.current = null
    }
  }

  const addPoint = (maps, latLng) => {
    drawingPointsRef.current = [...drawingPointsRef.current, latLng]
    setPointCount(drawingPointsRef.current.length)

    pointMarkersRef.current.push(
      new maps.Marker({
        position: latLng,
        map: mapRef.current,
        label: { text: String(drawingPointsRef.current.length), color: '#fff', fontSize: '11px' },
        icon: {
          path: maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
        },
      })
    )

    renderPreview(maps)
  }

  const startDrawing = (maps) => {
    setIsDrawing(true)
    drawingPointsRef.current = []
    setPointCount(0)
    clearPointMarkers()
    if (previewLineRef.current) {
      previewLineRef.current.setMap(null)
      previewLineRef.current = null
    }

    clickListenerRef.current = maps.event.addListener(mapRef.current, 'click', (e) => {
      addPoint(maps, { lat: e.latLng.lat(), lng: e.latLng.lng() })
    })
  }

  const handleUndo = () => {
    if (drawingPointsRef.current.length === 0) return
    const maps = window.google.maps

    drawingPointsRef.current = drawingPointsRef.current.slice(0, -1)
    setPointCount(drawingPointsRef.current.length)

    const lastMarker = pointMarkersRef.current.pop()
    lastMarker?.setMap(null)

    renderPreview(maps)
  }

  const finishDrawing = () => {
    const maps = window.google.maps
    if (drawingPointsRef.current.length < 3) return

    stopDrawingListener()
    clearPointMarkers()
    if (previewLineRef.current) {
      previewLineRef.current.setMap(null)
      previewLineRef.current = null
    }

    const poly = new maps.Polygon({
      paths: drawingPointsRef.current,
      map: mapRef.current,
      editable: true,
      draggable: true,
      fillColor: color,
      fillOpacity: 0.35,
      strokeColor: color,
    })
    polygonRef.current = poly
    attachPolygonListeners(maps, poly)
    onPolygonChange(pathToCoords(poly))
    setIsDrawing(false)
    toast(t('adminBranches.dragToAdjustZone'), { icon: '💡' })
  }

  const handleClear = () => {
    stopDrawingListener()
    clearPointMarkers()
    if (polygonRef.current) {
      polygonRef.current.setMap(null)
      polygonRef.current = null
    }
    if (previewLineRef.current) {
      previewLineRef.current.setMap(null)
      previewLineRef.current = null
    }
    drawingPointsRef.current = []
    setPointCount(0)
    onPolygonChange([])
    if (mapRef.current) startDrawing(window.google.maps)
  }

  useEffect(() => {
    let cancelled = false

    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !containerRef.current) return

        const center = { lat: branch.lat || ALEXANDRIA_CENTER.lat, lng: branch.lng || ALEXANDRIA_CENTER.lng }
        const map = new maps.Map(containerRef.current, { center, zoom: 13 })
        mapRef.current = map
        new maps.Marker({ position: center, map })

        if (Array.isArray(polygon) && polygon.length >= 3) {
          const poly = new maps.Polygon({
            paths: polygon,
            map,
            editable: true,
            draggable: true,
            fillColor: color,
            fillOpacity: 0.35,
            strokeColor: color,
          })
          polygonRef.current = poly
          attachPolygonListeners(maps, poly)

          // The existing shape may be nowhere near the branch pin (the
          // default center), so fit the viewport to it — otherwise the
          // polygon is rendered off-screen and the map looks empty.
          const bounds = new maps.LatLngBounds()
          polygon.forEach((point) => bounds.extend(point))
          map.fitBounds(bounds)
        } else {
          startDrawing(maps)
        }
      })
      .catch(() => toast.error(t('deliveryMap.failedToLoadMaps')))

    return () => {
      cancelled = true
      stopDrawingListener()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Box>
      {isDrawing && (
        <Alert severity="info" sx={{ mb: 1 }}>
          {t('adminBranches.clickToAddPoints')}
        </Alert>
      )}
      {isDrawing && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          {t('adminBranches.pointsPlaced', { count: pointCount })}
          {pointCount < 3 ? t('adminBranches.needAtLeastThree') : ''}
        </Typography>
      )}
      <Box ref={containerRef} sx={{ height: 320, width: '100%', borderRadius: 1, bgcolor: 'grey.100' }} />
      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
        {isDrawing && (
          <>
            <Button size="small" onClick={handleUndo} disabled={pointCount === 0}>
              {t('adminBranches.undoLastPoint')}
            </Button>
            <Button size="small" variant="contained" disabled={pointCount < 3} onClick={finishDrawing}>
              {t('adminBranches.finishShape')}
            </Button>
          </>
        )}
        <Button size="small" onClick={handleClear}>
          {t('adminBranches.clearPolygon')}
        </Button>
      </Stack>
    </Box>
  )
}

const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

function todayKey() {
  return DAY_KEYS[(new Date().getDay() + 6) % 7]
}

function todaysHoursLabel(openingHours, t) {
  const hours = openingHours?.[todayKey()]
  if (!hours?.open) return t('adminBranches.closedToday')
  return t('adminBranches.todayHours', { from: hours.from, to: hours.to })
}

function AdminBranchesPage() {
  const { t } = useTranslation()
  const DAYS = getDays(t)
  const adminRole = localStorage.getItem('admin_role')
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBranch, setEditingBranch] = useState(null)
  const [form, setForm] = useState(EMPTY_BRANCH)
  const [slugEdited, setSlugEdited] = useState(false)

  const [zoneDialogOpen, setZoneDialogOpen] = useState(false)
  const [editingZoneIndex, setEditingZoneIndex] = useState(null)
  const [zoneForm, setZoneForm] = useState(EMPTY_ZONE)

  const [availabilityDialogOpen, setAvailabilityDialogOpen] = useState(false)
  const [availabilityBranch, setAvailabilityBranch] = useState(null)
  const [availabilityItems, setAvailabilityItems] = useState([])
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [availabilitySaving, setAvailabilitySaving] = useState(false)

  const load = () => {
    setLoading(true)
    adminBranchApi
      .list()
      .then((res) => setBranches(res.data))
      .catch(() => toast.error(t('menu.failedToLoadBranches')))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const openAddDialog = () => {
    setEditingBranch(null)
    setForm(EMPTY_BRANCH)
    setSlugEdited(false)
    setDialogOpen(true)
  }

  const openEditDialog = (branch) => {
    setEditingBranch(branch)
    setForm({
      name: branch.name,
      name_ar: branch.name_ar || '',
      slug: branch.slug,
      address: branch.address || '',
      city: branch.city || '',
      phone: branch.phone || '',
      delivery_fee: branch.delivery_fee ?? '',
      min_order_amount: branch.min_order_amount ?? '',
      estimated_pickup_minutes: branch.estimated_pickup_minutes ?? '',
      estimated_delivery_minutes: branch.estimated_delivery_minutes ?? '',
      accepts_pickup: branch.accepts_pickup,
      accepts_delivery: branch.accepts_delivery,
      is_open: branch.is_open,
      lat: branch.lat != null ? Number(branch.lat) : ALEXANDRIA_CENTER.lat,
      lng: branch.lng != null ? Number(branch.lng) : ALEXANDRIA_CENTER.lng,
      delivery_zones: branch.delivery_zones || [],
      opening_hours:
        branch.opening_hours && Object.keys(branch.opening_hours).length > 0
          ? branch.opening_hours
          : DEFAULT_OPENING_HOURS,
    })
    setSlugEdited(true)
    setDialogOpen(true)
  }

  const handleNameChange = (name) => {
    setForm((prev) => ({ ...prev, name, slug: slugEdited ? prev.slug : slugify(name) }))
  }

  const updateDayHours = (day, patch) => {
    setForm((prev) => ({
      ...prev,
      opening_hours: { ...prev.opening_hours, [day]: { ...prev.opening_hours[day], ...patch } },
    }))
  }

  const handleSave = async () => {
    try {
      if (editingBranch) {
        await adminBranchApi.update(editingBranch.id, form)
        toast.success(t('adminBranches.branchUpdated'))
      } else {
        await adminBranchApi.create(form)
        toast.success(t('adminBranches.branchCreated'))
      }
      setDialogOpen(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.errors?.join(', ') || t('adminBranches.failedToSaveBranch'))
    }
  }

  const handleDelete = async (branch) => {
    try {
      await adminBranchApi.destroy(branch.id)
      toast.success(t('adminBranches.branchDeleted'))
      load()
    } catch {
      toast.error(t('adminBranches.failedToDeleteBranch'))
    }
  }

  const openAddZoneDialog = () => {
    setEditingZoneIndex(null)
    setZoneForm({ id: `zone_${Date.now()}`, name: '', delivery_fee: '', polygon: [] })
    setZoneDialogOpen(true)
  }

  const openEditZoneDialog = (index) => {
    const zone = form.delivery_zones[index]
    setEditingZoneIndex(index)
    setZoneForm({ id: zone.id, name: zone.name, delivery_fee: zone.delivery_fee ?? '', polygon: zone.polygon || [] })
    setZoneDialogOpen(true)
  }

  const handleSaveZone = () => {
    const newZone = {
      id: zoneForm.id,
      name: zoneForm.name.trim(),
      delivery_fee: zoneForm.delivery_fee === '' ? 0 : Number(zoneForm.delivery_fee),
      polygon: zoneForm.polygon,
    }

    setForm((prev) => {
      const zones = [...prev.delivery_zones]
      if (editingZoneIndex === null) {
        zones.push(newZone)
      } else {
        zones[editingZoneIndex] = newZone
      }
      return { ...prev, delivery_zones: zones }
    })

    setZoneDialogOpen(false)
  }

  const handleDeleteZone = (index) => {
    setForm((prev) => ({ ...prev, delivery_zones: prev.delivery_zones.filter((_, i) => i !== index) }))
  }

  const openAvailabilityDialog = async (branch) => {
    setAvailabilityBranch(branch)
    setAvailabilityDialogOpen(true)
    setAvailabilityLoading(true)
    try {
      const res = await adminBranchApi.getMenuAvailability(branch.id)
      setAvailabilityItems(res.data.items)
    } catch {
      toast.error(t('adminBranches.failedToLoadMenuAvailability'))
    } finally {
      setAvailabilityLoading(false)
    }
  }

  const updateAvailabilityItem = (id, patch) => {
    setAvailabilityItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  const handleSaveAvailability = async () => {
    setAvailabilitySaving(true)
    try {
      await adminBranchApi.updateMenuAvailability(
        availabilityBranch.id,
        availabilityItems.map((item) => ({
          id: item.id,
          available: item.available,
          price_override: item.price_override === '' ? null : item.price_override,
        }))
      )
      toast.success(t('adminBranches.menuAvailabilitySaved'))
      setAvailabilityDialogOpen(false)
    } catch (err) {
      toast.error(err.response?.data?.errors?.join(', ') || t('adminBranches.failedToSave'))
    } finally {
      setAvailabilitySaving(false)
    }
  }

  const groupedAvailabilityItems = availabilityItems.reduce((acc, item) => {
    ;(acc[item.category] ||= []).push(item)
    return acc
  }, {})

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>
          {t('admin.nav.branches')}
        </Typography>
        <Button variant="contained" onClick={openAddDialog}>
          {t('adminBranches.addBranch')}
        </Button>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 2 }}>
        {branches.map((branch) => (
          <Card key={branch.id}>
            <CardContent>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Typography fontWeight={600}>{branch.name}</Typography>
                <Chip
                  label={branch.currently_open ? t('adminBranches.openNow') : t('menu.closed')}
                  size="small"
                  color={branch.currently_open ? 'success' : 'error'}
                />
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                {todaysHoursLabel(branch.opening_hours, t)}
              </Typography>
              {branch.address && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {branch.address}
                  {branch.city ? `, ${branch.city}` : ''}
                </Typography>
              )}
              <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={
                    branch.delivery_zones?.length > 0
                      ? t('adminBranches.deliveryZoneCount', { count: branch.delivery_zones.length })
                      : t('adminBranches.noDeliveryZones')
                  }
                  size="small"
                  color={branch.delivery_zones?.length > 0 ? 'primary' : 'default'}
                  variant="outlined"
                />
              </Stack>
              <Stack direction="row" spacing={0.5} sx={{ mt: 1.5 }}>
                <IconButton size="small" onClick={() => openEditDialog(branch)} title={t('adminBranches.edit')}>
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => openAvailabilityDialog(branch)} title={t('adminBranches.menuAvailability')}>
                  <TuneIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => handleDelete(branch)} title={t('adminBranches.delete')}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingBranch ? t('adminBranches.editBranch') : t('adminBranches.addBranch')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label={t('adminMenu.name')} required value={form.name} onChange={(e) => handleNameChange(e.target.value)} />
            <TextField
              label={t('adminMenu.nameArabic')}
              value={form.name_ar}
              onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
              slotProps={{ htmlInput: { dir: 'rtl' } }}
            />
            <TextField
              label={t('adminBranches.slug')}
              required
              value={form.slug}
              onChange={(e) => {
                setSlugEdited(true)
                setForm({ ...form, slug: e.target.value })
              }}
            />
            <TextField label={t('adminSettings.address')} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <TextField label={t('checkout.city')} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <TextField label={t('auth.phone')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />

            <Stack direction="row" spacing={2}>
              <TextField
                label={t('cart.deliveryFee')}
                type="number"
                fullWidth
                value={form.delivery_fee}
                onChange={(e) => setForm({ ...form, delivery_fee: e.target.value })}
              />
              <TextField
                label={t('adminSettings.minOrderAmount')}
                type="number"
                fullWidth
                value={form.min_order_amount}
                onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })}
              />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField
                label={t('adminBranches.estPickupMinutes')}
                type="number"
                fullWidth
                value={form.estimated_pickup_minutes}
                onChange={(e) => setForm({ ...form, estimated_pickup_minutes: e.target.value })}
              />
              <TextField
                label={t('adminBranches.estDeliveryMinutes')}
                type="number"
                fullWidth
                value={form.estimated_delivery_minutes}
                onChange={(e) => setForm({ ...form, estimated_delivery_minutes: e.target.value })}
              />
            </Stack>

            <Stack direction="row" spacing={3} sx={{ flexWrap: 'wrap' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.accepts_pickup}
                    onChange={(e) => setForm({ ...form, accepts_pickup: e.target.checked })}
                  />
                }
                label={t('adminSettings.acceptsPickup')}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={form.accepts_delivery}
                    onChange={(e) => setForm({ ...form, accepts_delivery: e.target.checked })}
                  />
                }
                label={t('adminSettings.acceptsDelivery')}
              />
              <FormControlLabel
                control={<Switch checked={form.is_open} onChange={(e) => setForm({ ...form, is_open: e.target.checked })} />}
                label={t('adminBranches.isOpen')}
              />
            </Stack>

            {adminRole === 'admin' && (
              <>
                <Divider />
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                      {t('adminBranches.openingHours')}
                    </Typography>
                    <Stack spacing={1.5}>
                      {DAYS.map(({ key, label }) => {
                        const dayHours = form.opening_hours?.[key] || DEFAULT_OPENING_HOURS[key]
                        return (
                          <Stack
                            key={key}
                            direction="row"
                            spacing={2}
                            sx={{ alignItems: 'center' }}
                          >
                            <Typography fontWeight={600} sx={{ width: 100, flexShrink: 0 }}>
                              {label}
                            </Typography>
                            <Switch
                              checked={dayHours.open}
                              onChange={(e) => updateDayHours(key, { open: e.target.checked })}
                            />
                            {dayHours.open ? (
                              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                <TextField
                                  size="small"
                                  label={t('adminBranches.from')}
                                  type="time"
                                  value={dayHours.from}
                                  onChange={(e) => updateDayHours(key, { from: e.target.value })}
                                  InputLabelProps={{ shrink: true }}
                                />
                                <TextField
                                  size="small"
                                  label={t('adminBranches.to')}
                                  type="time"
                                  value={dayHours.to}
                                  onChange={(e) => updateDayHours(key, { to: e.target.value })}
                                  InputLabelProps={{ shrink: true }}
                                />
                              </Stack>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                {t('menu.closed')}
                              </Typography>
                            )}
                          </Stack>
                        )
                      })}
                    </Stack>
                  </CardContent>
                </Card>
              </>
            )}

            <Divider />

            <Typography variant="subtitle2">{t('adminBranches.branchLocation')}</Typography>
            <Typography variant="caption" color="text.secondary">
              {t('adminBranches.branchLocationHint')}
            </Typography>
            {dialogOpen && (
              <BranchDetailMap
                branch={form}
                zones={form.delivery_zones}
                onLocationChange={(lat, lng) => setForm((prev) => ({ ...prev, lat, lng }))}
              />
            )}
            {form.delivery_zones.length > 0 && (
              <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
                {form.delivery_zones.map((zone, index) => (
                  <Stack key={zone.id} direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: zoneColor(index) }} />
                    <Typography variant="caption">{zone.name || t('adminBranches.unnamedZone')}</Typography>
                  </Stack>
                ))}
              </Stack>
            )}
            <Stack direction="row" spacing={2}>
              <TextField label={t('adminBranches.latitude')} value={form.lat} disabled fullWidth />
              <TextField label={t('adminBranches.longitude')} value={form.lng} disabled fullWidth />
            </Stack>

            <Divider />

            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle2">{t('adminBranches.deliveryZones')}</Typography>
              <Button size="small" onClick={openAddZoneDialog}>
                {t('adminBranches.addZone')}
              </Button>
            </Stack>
            {form.delivery_zones.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {t('adminBranches.noZonesConfigured')}
              </Typography>
            ) : (
              <Stack spacing={1}>
                {form.delivery_zones.map((zone, index) => (
                  <Card key={zone.id} variant="outlined">
                    <CardContent
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        py: 1.5,
                        '&:last-child': { pb: 1.5 },
                      }}
                    >
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: zoneColor(index) }} />
                        <Box>
                          <Typography fontWeight={600}>{zone.name || t('adminBranches.unnamedZone')}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {t('adminBranches.zonePoints', { fee: formatCurrency(zone.delivery_fee), count: (zone.polygon || []).length })}
                          </Typography>
                        </Box>
                      </Stack>
                      <Stack direction="row" spacing={0.5}>
                        <IconButton size="small" onClick={() => openEditZoneDialog(index)} title={t('adminBranches.editZone')}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDeleteZone(index)} title={t('adminBranches.deleteZone')}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{t('account.cancel')}</Button>
          <Button variant="contained" onClick={handleSave}>
            {t('account.save')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={zoneDialogOpen} onClose={() => setZoneDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingZoneIndex === null ? t('adminBranches.addZone') : t('adminBranches.editZoneTitle')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label={t('adminBranches.zoneName')}
              placeholder={t('adminBranches.zoneNamePlaceholder')}
              required
              value={zoneForm.name}
              onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
            />
            <TextField
              label={t('adminBranches.deliveryFeeEgp')}
              type="number"
              required
              value={zoneForm.delivery_fee}
              onChange={(e) => setZoneForm({ ...zoneForm, delivery_fee: e.target.value })}
            />
            <Typography variant="caption" color="text.secondary">
              {t('adminBranches.drawZoneHint')}
            </Typography>
            {zoneDialogOpen && (
              <ZoneEditorMap
                branch={form}
                polygon={zoneForm.polygon}
                color={zoneColor(editingZoneIndex ?? form.delivery_zones.length)}
                onPolygonChange={(polygon) => setZoneForm((prev) => ({ ...prev, polygon }))}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setZoneDialogOpen(false)}>{t('account.cancel')}</Button>
          <Button variant="contained" onClick={handleSaveZone} disabled={!zoneForm.name.trim()}>
            {t('adminBranches.saveZone')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={availabilityDialogOpen} onClose={() => setAvailabilityDialogOpen(false)} fullScreen>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {t('adminBranches.menuAvailabilityFor', { name: availabilityBranch?.name })}
          <IconButton onClick={() => setAvailabilityDialogOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {availabilityLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Stack spacing={3} sx={{ mt: 1 }}>
              {Object.entries(groupedAvailabilityItems).map(([category, items]) => (
                <Box key={category}>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    {category}
                  </Typography>
                  <Stack spacing={1}>
                    {items.map((item) => (
                      <Stack
                        key={item.id}
                        direction="row"
                        spacing={2}
                        sx={{ alignItems: 'center', p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
                      >
                        <Typography sx={{ flex: 1 }}>{item.name}</Typography>
                        <TextField
                          size="small"
                          label={t('adminBranches.priceOverride')}
                          type="number"
                          placeholder={String(item.default_price)}
                          value={item.price_override ?? ''}
                          onChange={(e) => updateAvailabilityItem(item.id, { price_override: e.target.value })}
                          sx={{ width: 160 }}
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={item.available}
                              onChange={(e) => updateAvailabilityItem(item.id, { available: e.target.checked })}
                            />
                          }
                          label={t('adminMenu.available')}
                        />
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAvailabilityDialogOpen(false)}>{t('account.cancel')}</Button>
          <Button variant="contained" onClick={handleSaveAvailability} disabled={availabilitySaving}>
            {t('itemOptions.saveAll')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default AdminBranchesPage
