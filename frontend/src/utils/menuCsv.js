// Bulk menu price/name sheet: export every item to CSV, edit in a spreadsheet,
// then diff the edited file against the live menu before applying it.
export const MENU_CSV_COLUMNS = ['id', 'category', 'name', 'name_ar', 'price']

// Only these are written back; `id` is the key and `category` is reference-only.
const EDITABLE = ['name', 'name_ar', 'price']

function escapeCell(value) {
  const s = value === null || value === undefined ? '' : String(value)
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function buildMenuCsv(categories) {
  const rows = [MENU_CSV_COLUMNS]
  categories.forEach((category) => {
    ;(category.items || []).forEach((item) => {
      rows.push([item.id, category.name, item.name, item.name_ar || '', item.price])
    })
  })
  // BOM so Excel opens the Arabic names as UTF-8 instead of mojibake.
  return `﻿${rows.map((row) => row.map(escapeCell).join(',')).join('\r\n')}\r\n`
}

export function downloadTextFile(text, filename) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

// Excel in many locales (German, French, ...) saves CSV with ';' — and some tools use tabs.
// Pick whichever appears most often in the header line, ignoring quoted text.
export function detectDelimiter(text) {
  const header = text.replace(/^\uFEFF/, '').split(/\r?\n/, 1)[0].replace(/"[^"]*"/g, '')
  const counts = [',', ';', '\t'].map((d) => [d, header.split(d).length - 1]).sort((a, b) => b[1] - a[1])
  return counts[0][1] > 0 ? counts[0][0] : ','
}

// RFC 4180 parser: quoted fields, escaped quotes, embedded delimiters/newlines.
// `rows.unterminated` is true when a quote was opened and never closed.
export function parseCsv(text, delimiter = detectDelimiter(text)) {
  const src = text.replace(/^\uFEFF/, '')
  const rows = []
  let row = []
  let cell = ''
  let quoted = false

  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') {
        quoted = false
      } else {
        cell += ch
      }
    } else if (ch === '"') {
      quoted = true
    } else if (ch === delimiter) {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(cell)
      cell = ''
      rows.push(row)
      row = []
    } else {
      cell += ch
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }
  const result = rows.filter((r) => r.some((c) => c.trim() !== ''))
  result.unterminated = quoted
  return result
}

// Prices fit decimal(10,2): at most 2 decimals and under 100,000,000 (above that the DB overflows).
const MAX_PRICE = 100_000_000

// Accepts "55", "55.5", "1,300.50" (comma = thousands) — but NOT "20,5": a lone comma
// followed by 1–2 digits is a European decimal comma, and reading it as thousands would
// silently turn 20.5 into 205.
const ARABIC_DIGITS = /[\u0660-\u0669\u06F0-\u06F9]/g
const toAsciiNumber = (text) =>
  text
    .replace(ARABIC_DIGITS, (d) => String(d.charCodeAt(0) & 0xf)) // ٠-٩ and ۰-۹ share the low nibble
    .replace(/\u066B/g, '.') // Arabic decimal separator
    .replace(/\u066C/g, ',') // Arabic thousands separator

const normalizePrice = (value) => {
  const text = toAsciiNumber(String(value ?? '').trim())
  const cleaned = /^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(text) ? text.replace(/,/g, '') : text
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  const number = Number(cleaned)
  return number < MAX_PRICE ? number : null
}

// Compares an edited CSV to the live menu. Returns:
//   changes: [{ id, category, label, fields: { name: {from,to}, price: {from,to} } }]
//   errors:  human-readable strings tagged with the spreadsheet row number
//   unchanged: count of rows that already match
export function diffMenuCsv(text, categories) {
  const table = parseCsv(text)
  const result = { changes: [], errors: [], unchanged: 0 }
  if (table.unterminated) {
    result.errors.push('A quoted value is never closed (look for a stray " character). Everything after it was read as one cell, so nothing can be imported.')
    return result
  }
  if (table.length === 0) {
    result.errors.push('The file is empty.')
    return result
  }

  const header = table[0].map((h) => h.trim().toLowerCase())
  const col = Object.fromEntries(header.map((h, i) => [h, i]))
  const missing = ['id', 'name', 'price'].filter((c) => !(c in col))
  if (missing.length > 0) {
    result.errors.push(`Missing column(s): ${missing.join(', ')}. Use the exported file as your starting point.`)
    return result
  }

  const itemsById = new Map()
  categories.forEach((category) => {
    ;(category.items || []).forEach((item) => itemsById.set(String(item.id), { item, category }))
  })

  const seen = new Set()
  table.slice(1).forEach((cells, index) => {
    const rowNo = index + 2
    if (cells.length < header.length) {
      result.errors.push(`Row ${rowNo}: has ${cells.length} column(s) but the header has ${header.length}.`)
      return
    }
    const get = (name) => (name in col ? (cells[col[name]] ?? '').trim() : undefined)
    const id = get('id')
    const found = itemsById.get(id)
    if (!found) {
      result.errors.push(`Row ${rowNo}: no menu item with id "${id}" (new items can't be added by CSV).`)
      return
    }
    if (seen.has(id)) {
      result.errors.push(`Row ${rowNo}: id ${id} appears more than once.`)
      return
    }
    seen.add(id)

    const { item, category } = found
    const next = { name: get('name'), name_ar: get('name_ar'), price: get('price') }
    const fields = {}
    let invalid = false

    if (!next.name) {
      result.errors.push(`Row ${rowNo}: name can't be blank.`)
      invalid = true
    }
    const price = normalizePrice(next.price)
    if (price === null) {
      result.errors.push(`Row ${rowNo}: "${next.price}" is not a valid price.`)
      invalid = true
    }
    if (invalid) return

    if (next.name !== item.name) fields.name = { from: item.name, to: next.name }
    if (next.name_ar !== undefined && next.name_ar !== (item.name_ar || '')) {
      fields.name_ar = { from: item.name_ar || '', to: next.name_ar }
    }
    if (price !== Number(item.price)) fields.price = { from: Number(item.price), to: price }

    if (Object.keys(fields).length === 0) {
      result.unchanged++
    } else {
      result.changes.push({ id: item.id, category: category.name, label: item.name, fields })
    }
  })

  return result
}

export const toPayload = (fields) =>
  Object.fromEntries(EDITABLE.filter((k) => k in fields).map((k) => [k, fields[k].to]))
