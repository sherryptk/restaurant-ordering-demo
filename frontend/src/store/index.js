import { configureStore, createSlice, createSelector } from '@reduxjs/toolkit'

// ---------- auth ----------

// Mirrors OrderItem::MAX_QUANTITY on the server, which rejects larger quantities.
export const MAX_ITEM_QUANTITY = 99

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    customer: null,
    token: localStorage.getItem('customer_token') || null,
    avatar: null,
    isAdmin: false,
    admin: null,
    adminToken: localStorage.getItem('admin_token') || null,
    adminRole: localStorage.getItem('admin_role') || null,
    adminName: localStorage.getItem('admin_name') || null,
    adminPhone: localStorage.getItem('admin_phone') || null,
    adminBranchName: localStorage.getItem('admin_branch_name') || null,
  },
  reducers: {
    setCustomer(state, action) {
      state.customer = action.payload.customer
      state.token = action.payload.token
      state.avatar = action.payload.customer.avatar_url || null
      localStorage.setItem('customer_token', action.payload.token)
    },
    updateCustomer(state, action) {
      if (state.customer) {
        state.customer = { ...state.customer, ...action.payload }
      }
    },
    logoutCustomer(state) {
      state.customer = null
      state.token = null
      state.avatar = null
      localStorage.removeItem('customer_token')
    },
    setAdmin(state, action) {
      state.admin = action.payload.admin
      state.adminToken = action.payload.token
      state.isAdmin = true
      state.adminRole = action.payload.role
      state.adminName = action.payload.name
      state.adminPhone = action.payload.phone
      state.adminBranchName = action.payload.branchName
      localStorage.setItem('admin_token', action.payload.token)
      localStorage.setItem('admin_role', action.payload.role || '')
      localStorage.setItem('admin_name', action.payload.name || '')
      localStorage.setItem('admin_phone', action.payload.phone || '')
      localStorage.setItem('admin_branch_name', action.payload.branchName || '')
    },
    logoutAdmin(state) {
      state.admin = null
      state.adminToken = null
      state.isAdmin = false
      state.adminRole = null
      state.adminName = null
      state.adminPhone = null
      state.adminBranchName = null
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_role')
      localStorage.removeItem('admin_name')
      localStorage.removeItem('admin_phone')
      localStorage.removeItem('admin_branch_name')
    },
  },
})

// ---------- cart ----------

const loadCartFromStorage = () => {
  try {
    const saved = localStorage.getItem('cart')
    return saved ? JSON.parse(saved) : undefined
  } catch {
    return undefined
  }
}

const savedCart = loadCartFromStorage()

const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    items: savedCart?.items || [],
    orderType: savedCart?.orderType || 'delivery',
    deliveryAddress: null,
    notes: savedCart?.notes || '',
    paymentMethod: savedCart?.paymentMethod || 'cash',
    appliedCombo: null,
    selectedBranch: savedCart?.selectedBranch || null,
  },
  reducers: {
    addItem(state, action) {
      const newItem = action.payload
      const newChoicesKey = JSON.stringify(newItem.choices || [])

      const existing = state.items.find(
        (item) =>
          item.menu_item_id === newItem.menu_item_id &&
          JSON.stringify(item.choices || []) === newChoicesKey
      )

      if (existing) {
        existing.quantity = Math.min(MAX_ITEM_QUANTITY, existing.quantity + (newItem.quantity || 1))
      } else {
        state.items.push({ ...newItem, quantity: Math.min(MAX_ITEM_QUANTITY, newItem.quantity || 1) })
      }
    },
    removeItem(state, action) {
      state.items.splice(action.payload, 1)
    },
    updateQuantity(state, action) {
      const { index, quantity } = action.payload

      if (quantity <= 0) {
        state.items.splice(index, 1)
      } else if (state.items[index]) {
        state.items[index].quantity = Math.min(MAX_ITEM_QUANTITY, quantity)
      }
    },
    clearCart(state) {
      state.items = []
      state.notes = ''
      state.appliedCombo = null
      localStorage.removeItem('cart')
    },
    setAppliedCombo(state, action) {
      state.appliedCombo = action.payload
    },
    clearAppliedCombo(state) {
      state.appliedCombo = null
    },
    setOrderType(state, action) {
      state.orderType = action.payload
    },
    setDeliveryAddress(state, action) {
      state.deliveryAddress = action.payload
    },
    setNotes(state, action) {
      state.notes = action.payload
    },
    setPaymentMethod(state, action) {
      state.paymentMethod = action.payload
    },
    setSelectedBranch(state, action) {
      state.selectedBranch = action.payload
    },
  },
})

// ---------- restaurant ----------

const restaurantSlice = createSlice({
  name: 'restaurant',
  initialState: {
    info: null,
    categories: [],
    loading: false,
    error: null,
  },
  reducers: {
    setRestaurantData(state, action) {
      state.info = action.payload.restaurant
      state.categories = action.payload.categories
    },
    setLoading(state, action) {
      state.loading = action.payload
    },
    setError(state, action) {
      state.error = action.payload
    },
  },
})

export const { setCustomer, updateCustomer, logoutCustomer, setAdmin, logoutAdmin } = authSlice.actions

export const {
  addItem,
  removeItem,
  updateQuantity,
  clearCart,
  setOrderType,
  setDeliveryAddress,
  setNotes,
  setPaymentMethod,
  setAppliedCombo,
  clearAppliedCombo,
  setSelectedBranch,
} = cartSlice.actions

export const { setRestaurantData, setLoading, setError } = restaurantSlice.actions

// ---------- selectors ----------

export const selectAuth = (state) => state.auth
export const selectCustomerAvatar = (state) => state.auth.avatar
export const selectAdminRole = (state) => state.auth.adminRole
export const selectAdminPhone = (state) => state.auth.adminPhone
export const selectAdminBranchName = (state) => state.auth.adminBranchName
export const selectCart = (state) => state.cart
export const selectAppliedCombo = (state) => state.cart.appliedCombo
export const selectSelectedBranch = (state) => state.cart.selectedBranch
export const selectRestaurant = (state) => state.restaurant

export const selectCartTotal = createSelector(selectCart, (cart) =>
  cart.items.reduce((sum, item) => {
    const choicesTotal = (item.choices || []).reduce(
      (choiceSum, choice) => choiceSum + (Number(choice.price_delta) || 0),
      0
    )
    return sum + (Number(item.price) + choicesTotal) * item.quantity
  }, 0)
)

export const selectCartCount = createSelector(selectCart, (cart) =>
  cart.items.reduce((sum, item) => sum + item.quantity, 0)
)

const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    cart: cartSlice.reducer,
    restaurant: restaurantSlice.reducer,
  },
})

store.subscribe(() => {
  const state = store.getState()
  const cart = state.cart
  try {
    localStorage.setItem('cart', JSON.stringify({
      items: cart.items,
      orderType: cart.orderType,
      selectedBranch: cart.selectedBranch,
      paymentMethod: cart.paymentMethod,
      notes: cart.notes,
    }))
  } catch {}
})

export default store
