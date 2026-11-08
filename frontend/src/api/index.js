import axios from 'axios'
import toast from 'react-hot-toast'
import i18n from '../i18n'
import store, { logoutAdmin } from '../store'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export const apiClient = axios.create({ baseURL })
export const adminApiClient = axios.create({ baseURL })

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('customer_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  config.headers['X-Locale'] = i18n.language
  return config
})

adminApiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  config.headers['X-Locale'] = i18n.language
  return config
})

// A 401 here means an expired/invalid JWT, not a bad login attempt (the
// sign_in request itself is excluded) — surface it as a session expiry
// instead of letting pages fail silently with generic "failed to load" toasts.
let sessionExpiredHandled = false

adminApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const isSignInRequest = error.config?.url?.includes('/admins/auth/sign_in')

    if (!isSignInRequest && error.response?.status === 401 && !sessionExpiredHandled) {
      sessionExpiredHandled = true
      store.dispatch(logoutAdmin())
      toast.error(i18n.t('adminLogin.sessionExpired'))
      // Delay the hard navigation so the toast has a chance to paint —
      // an immediate location change unloads the page before React renders it.
      setTimeout(() => {
        window.location.href = '/admin/login'
      }, 1500)
    }

    return Promise.reject(error)
  }
)

export const authApi = {
  login: (credentials) => apiClient.post('/api/v1/auth/sign_in', { customer: credentials }),
  register: (data) => apiClient.post('/api/v1/auth', { customer: data }),
  logout: () => apiClient.delete('/api/v1/auth/sign_out'),
  me: () => apiClient.get('/api/v1/me'),
  updateMe: (data) => apiClient.patch('/api/v1/me', { customer: data }),
}

export const adminAuthApi = {
  // Resets the expiry flag so a session that expires *after* this login can
  // still trigger the toast+redirect (the flag latches true once per expiry).
  login: (credentials) =>
    adminApiClient.post('/admins/auth/sign_in', { admin: credentials }).then((res) => {
      sessionExpiredHandled = false
      return res
    }),
  logout: () => adminApiClient.delete('/admins/auth/sign_out'),
}

export const menuApi = {
  getMenu: (branchId) => apiClient.get('/api/v1/menu', { params: branchId ? { branch_id: branchId } : {} }),
  getItem: (id) => apiClient.get(`/api/v1/menu/${id}`),
}

export const branchApi = {
  list: () => apiClient.get('/api/v1/branches'),
  findByLocation: (lat, lng) => apiClient.post('/api/v1/branches/find_by_location', { lat, lng }),
}

export const comboApi = {
  list: () => apiClient.get('/api/v1/combo_deals'),
  checkCombos: (menu_item_ids) => apiClient.post('/api/v1/cart/check_combos', { menu_item_ids }),
}

export const ordersApi = {
  create: (data) => apiClient.post('/api/v1/orders', data),
  getOrder: (id, guestPhone) =>
    apiClient.get(`/api/v1/orders/${id}`, guestPhone ? { params: { guest_phone: guestPhone } } : undefined),
  getMyOrders: () => apiClient.get('/api/v1/orders'),
  uploadPaymentProof: (id, file, guestPhone) => {
    const formData = new FormData()
    formData.append('payment_proof', file)
    if (guestPhone) formData.append('guest_phone', guestPhone)
    return apiClient.post(`/api/v1/orders/${id}/payment_proof`, formData)
  },
}

export const addressesApi = {
  list: () => apiClient.get('/api/v1/addresses'),
  create: (data) => apiClient.post('/api/v1/addresses', { address: data }),
  update: (id, data) => apiClient.patch(`/api/v1/addresses/${id}`, { address: data }),
  destroy: (id) => apiClient.delete(`/api/v1/addresses/${id}`),
}

export const phonesApi = {
  list: () => apiClient.get('/api/v1/phones'),
  create: (data) => apiClient.post('/api/v1/phones', { phone: data }),
  destroy: (id) => apiClient.delete(`/api/v1/phones/${id}`),
}

export const favoritesApi = {
  list: () => apiClient.get('/api/v1/favorites'),
  create: (menuItemId) => apiClient.post('/api/v1/favorites', { menu_item_id: menuItemId }),
  destroy: (menuItemId) => apiClient.delete(`/api/v1/favorites/${menuItemId}`),
}

export const adminOrdersApi = {
  list: (params) => adminApiClient.get('/admins/orders', { params }),
  get: (id) => adminApiClient.get(`/admins/orders/${id}`),
  updateStatus: (id, status) => adminApiClient.patch(`/admins/orders/${id}/status`, { status }),
  updatePaymentStatus: (id, payment_status) =>
    adminApiClient.patch(`/admins/orders/${id}/payment_status`, { payment_status }),
  assignDriver: (id, driver_id, driver_notes) =>
    adminApiClient.patch(`/admins/orders/${id}/assign_driver`, { driver_id, driver_notes }),
  updateEstimatedTime: (id, minutes) => adminApiClient.patch(`/admins/orders/${id}/estimated_time`, { minutes }),
}

export const adminUsersApi = {
  list: () => adminApiClient.get('/admins/users'),
  create: (data) => adminApiClient.post('/admins/users', { admin: data }),
  update: (id, data) => adminApiClient.patch(`/admins/users/${id}`, { admin: data }),
  destroy: (id) => adminApiClient.delete(`/admins/users/${id}`),
  resetPassword: (id) => adminApiClient.patch(`/admins/users/${id}/reset_password`),
}

// menu_item update/create needs a top-level `image` file field plus nested
// `menu_item[...]` fields for the controller's params.require(:menu_item) —
// only worth the multipart request when an actual image File is present.
// compare_at_price/offer_badge are sent as empty strings (rather than
// omitted) even when null so clearing an offer works through this path too —
// FormData can't carry a real null, and Rails casts "" to nil/blank on save.
const CLEARABLE_FIELDS = ['compare_at_price', 'offer_badge']

function buildMenuItemPayload(data) {
  const { image, tags, ...rest } = data

  if (!(image instanceof File)) {
    return { menu_item: data }
  }

  const formData = new FormData()
  formData.append('image', image)
  Object.entries(rest).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(`menu_item[${key}]`, value)
    } else if (CLEARABLE_FIELDS.includes(key)) {
      formData.append(`menu_item[${key}]`, '')
    }
  })
  ;(tags || []).forEach((tag) => formData.append('menu_item[tags][]', tag))

  return formData
}

export const adminMenuApi = {
  getCategories: () => adminApiClient.get('/admins/menu/categories'),
  createCategory: (data) => adminApiClient.post('/admins/menu/categories', { category: data }),
  updateCategory: (id, data) =>
    adminApiClient.patch(`/admins/menu/categories/${id}`, { category: data }),
  deleteCategory: (id) => adminApiClient.delete(`/admins/menu/categories/${id}`),
  reorderCategories: (ordered_ids) =>
    adminApiClient.patch('/admins/menu/categories/reorder', { ordered_ids }),
  createItem: (categoryId, data) =>
    adminApiClient.post(`/admins/menu/categories/${categoryId}/items`, buildMenuItemPayload(data)),
  updateItem: (id, data) =>
    adminApiClient.patch(`/admins/menu/items/${id}`, buildMenuItemPayload(data)),
  deleteItem: (id) => adminApiClient.delete(`/admins/menu/items/${id}`),
  bulkUpdateItems: (items) => adminApiClient.post('/admins/menu/items/bulk_update', { items }),
  toggleAvailability: (id) => adminApiClient.patch(`/admins/menu/items/${id}/toggle`),
  getItemOptions: (id) =>
    // Dev only: fixture items have negative ids and no backend row.
    import.meta.env.DEV && id < 0
      ? import('../dev/menuFixtures').then((m) => ({ data: m.fixtureOptions(id) }))
      : adminApiClient.get(`/admins/menu/items/${id}/options`),
  saveItemOptions: (id, options) => adminApiClient.post(`/admins/menu/items/${id}/options`, { options }),
  importOptionsCSV: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return adminApiClient.post('/admins/menu/options/import_csv', formData)
  },
}

export const adminSettingsApi = {
  get: () => adminApiClient.get('/admins/settings'),
  update: (data) => adminApiClient.patch('/admins/settings', { restaurant: data }),
  uploadBanner: (file) => {
    const formData = new FormData()
    formData.append('banner', file)
    return adminApiClient.post('/admins/settings/banner', formData)
  },
  uploadLogo: (file) => {
    const formData = new FormData()
    formData.append('logo', file)
    return adminApiClient.post('/admins/settings/logo', formData)
  },
}

export const promoApi = {
  validate: (code, subtotal, phone) =>
    apiClient.post('/api/v1/promo_codes/validate', { code, subtotal, phone }),
}

export const adminPromoApi = {
  list: () => adminApiClient.get('/admins/promo_codes'),
  create: (data) => adminApiClient.post('/admins/promo_codes', { promo_code: data }),
  update: (id, data) => adminApiClient.patch(`/admins/promo_codes/${id}`, { promo_code: data }),
  destroy: (id) => adminApiClient.delete(`/admins/promo_codes/${id}`),
  toggle: (id) => adminApiClient.patch(`/admins/promo_codes/${id}/toggle`),
}

// combo_deal create/update needs a top-level `image` file field plus nested
// `combo_deal[...]` fields, same pattern as buildMenuItemPayload — only worth
// the multipart request when an actual image File is present.
function buildComboDealPayload(data) {
  const { image, menu_item_ids, ...rest } = data

  if (!(image instanceof File)) {
    return { combo_deal: rest, menu_item_ids: menu_item_ids || [] }
  }

  const formData = new FormData()
  formData.append('image', image)
  Object.entries(rest).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(`combo_deal[${key}]`, value)
    }
  })
  ;(menu_item_ids || []).forEach((id) => formData.append('menu_item_ids[]', id))

  return formData
}

export const adminComboApi = {
  list: () => adminApiClient.get('/admins/combo_deals'),
  create: (data) => adminApiClient.post('/admins/combo_deals', buildComboDealPayload(data)),
  update: (id, data) => adminApiClient.patch(`/admins/combo_deals/${id}`, buildComboDealPayload(data)),
  destroy: (id) => adminApiClient.delete(`/admins/combo_deals/${id}`),
  toggle: (id) => adminApiClient.patch(`/admins/combo_deals/${id}/toggle`),
}

export const adminCashTransactionsApi = {
  list: (params) => adminApiClient.get('/admins/cash_transactions', { params }),
  dailySummary: (params) => adminApiClient.get('/admins/cash_transactions/daily_summary', { params }),
  create: (data) => adminApiClient.post('/admins/cash_transactions', { cash_transaction: data }),
  update: (id, data) => adminApiClient.patch(`/admins/cash_transactions/${id}`, { cash_transaction: data }),
  destroy: (id) => adminApiClient.delete(`/admins/cash_transactions/${id}`),
}

export const adminDenominationCountsApi = {
  list: (params) => adminApiClient.get('/admins/denomination_counts', { params }),
  create: (data) => adminApiClient.post('/admins/denomination_counts', { denomination_count: data }),
}

export const adminMonthlySummaryApi = {
  get: (params) => adminApiClient.get('/admins/monthly_summary', { params }),
}

export const adminEmployeesApi = {
  list: (branchId) => adminApiClient.get('/admins/employees', { params: branchId ? { branch_id: branchId } : {} }),
  create: (data) => adminApiClient.post('/admins/employees', { employee: data }),
  update: (id, data) => adminApiClient.patch(`/admins/employees/${id}`, { employee: data }),
  destroy: (id) => adminApiClient.delete(`/admins/employees/${id}`),
  payrollSummary: (id, month) => adminApiClient.get(`/admins/employees/${id}/payroll_summary`, { params: { month } }),
  addAdjustment: (employeeId, data) =>
    adminApiClient.post(`/admins/employees/${employeeId}/timesheet_adjustments`, { timesheet_adjustment: data }),
  destroyAdjustment: (employeeId, id) =>
    adminApiClient.delete(`/admins/employees/${employeeId}/timesheet_adjustments/${id}`),
}

export const adminTimesheetsApi = {
  list: (params) => adminApiClient.get('/admins/timesheets', { params }),
  create: (data) => adminApiClient.post('/admins/timesheets', { timesheet: data }),
  update: (id, data) => adminApiClient.patch(`/admins/timesheets/${id}`, { timesheet: data }),
}

export const adminLedgerApi = {
  list: (params) => adminApiClient.get('/admins/ledger_payments', { params }),
  create: (data) => adminApiClient.post('/admins/ledger_payments', { ledger_payment: data }),
  update: (id, data) => adminApiClient.patch(`/admins/ledger_payments/${id}`, { ledger_payment: data }),
  destroy: (id) => adminApiClient.delete(`/admins/ledger_payments/${id}`),
}

export const adminBranchApi = {
  list: () => adminApiClient.get('/admins/branches'),
  create: (data) => adminApiClient.post('/admins/branches', { branch: data }),
  update: (id, data) => adminApiClient.patch(`/admins/branches/${id}`, { branch: data }),
  destroy: (id) => adminApiClient.delete(`/admins/branches/${id}`),
  getMenuAvailability: (id) => adminApiClient.get(`/admins/branches/${id}/menu_availability`),
  updateMenuAvailability: (id, items) =>
    adminApiClient.post(`/admins/branches/${id}/update_menu_availability`, { items }),
}
