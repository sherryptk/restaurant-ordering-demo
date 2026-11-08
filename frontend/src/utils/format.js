import i18n from '../i18n'

// `date.toISOString()` always renders the UTC date, which rolls over to the
// previous day for any timezone ahead of UTC (e.g. Egypt, UTC+2/+3) during
// the first couple of hours after local midnight — this reads the date from
// local calendar fields instead so "today" always means the viewer's today.
export function localDateString(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function localMonthString(date = new Date()) {
  return localDateString(date).slice(0, 7)
}

// Backend and translation strings carry decorative emoji ("🔥 Offers"); the UI draws its own icons.
export function stripEmoji(label) {
  return (label || '').replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '').trim()
}

export function formatCurrency(amount, currency = 'EGP') {
  return new Intl.NumberFormat(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
    style: 'currency',
    currency,
    numberingSystem: 'latn',
  }).format(Number(amount) || 0)
}

export function formatDeliveryAddress(address) {
  if (!address) return []

  const lines = []
  if (address.street) lines.push(address.street)

  const aptLine = [
    address.building && i18n.t('address.building', { value: address.building }),
    address.floor && i18n.t('address.floor', { value: address.floor }),
    address.apartment && i18n.t('address.apartment', { value: address.apartment }),
  ]
    .filter(Boolean)
    .join(' · ')
  if (aptLine) lines.push(aptLine)

  if (address.city) lines.push(address.city)
  if (address.notes) lines.push(`📝 ${address.notes}`)

  return lines
}

export function formatOrderStatus(status) {
  if (!status) return ''

  const key = `orderStatus.${status}`
  const translated = i18n.t(key)
  if (translated !== key) return translated

  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
