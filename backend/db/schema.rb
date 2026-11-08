# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[7.1].define(version: 2026_09_19_000002) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"

  create_table "active_storage_attachments", force: :cascade do |t|
    t.string "name", null: false
    t.string "record_type", null: false
    t.bigint "record_id", null: false
    t.bigint "blob_id", null: false
    t.datetime "created_at", null: false
    t.index ["blob_id"], name: "index_active_storage_attachments_on_blob_id"
    t.index ["record_type", "record_id", "name", "blob_id"], name: "index_active_storage_attachments_uniqueness", unique: true
  end

  create_table "active_storage_blobs", force: :cascade do |t|
    t.string "key", null: false
    t.string "filename", null: false
    t.string "content_type"
    t.text "metadata"
    t.string "service_name", null: false
    t.bigint "byte_size", null: false
    t.string "checksum"
    t.datetime "created_at", null: false
    t.index ["key"], name: "index_active_storage_blobs_on_key", unique: true
  end

  create_table "active_storage_variant_records", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.string "variation_digest", null: false
    t.index ["blob_id", "variation_digest"], name: "index_active_storage_variant_records_uniqueness", unique: true
  end

  create_table "addresses", force: :cascade do |t|
    t.bigint "customer_id", null: false
    t.string "label"
    t.string "street", null: false
    t.string "district"
    t.string "city"
    t.string "building"
    t.string "floor"
    t.string "apartment"
    t.string "notes"
    t.decimal "lat", precision: 10, scale: 7
    t.decimal "lng", precision: 10, scale: 7
    t.boolean "is_default", default: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["customer_id"], name: "index_addresses_on_customer_id"
  end

  create_table "admins", force: :cascade do |t|
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.string "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.string "jti", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "role", default: 0, null: false
    t.string "name"
    t.string "phone"
    t.bigint "branch_id"
    t.index ["branch_id"], name: "index_admins_on_branch_id"
    t.index ["email"], name: "index_admins_on_email", unique: true
    t.index ["jti"], name: "index_admins_on_jti", unique: true
    t.index ["reset_password_token"], name: "index_admins_on_reset_password_token", unique: true
  end

  create_table "branches", force: :cascade do |t|
    t.string "name", null: false
    t.string "slug", null: false
    t.string "address"
    t.string "city"
    t.decimal "lat", precision: 10, scale: 7
    t.decimal "lng", precision: 10, scale: 7
    t.string "phone"
    t.decimal "delivery_fee", precision: 10, scale: 2, default: "0.0"
    t.decimal "min_order_amount", precision: 10, scale: 2, default: "0.0"
    t.integer "estimated_delivery_minutes", default: 45
    t.integer "estimated_pickup_minutes", default: 20
    t.boolean "accepts_delivery", default: true
    t.boolean "accepts_pickup", default: true
    t.boolean "is_open", default: true
    t.jsonb "delivery_zone", default: []
    t.bigint "restaurant_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.jsonb "delivery_zones", default: []
    t.jsonb "opening_hours", default: {}
    t.string "name_ar"
    t.jsonb "instapay_details", default: {}, null: false
    t.index ["restaurant_id"], name: "index_branches_on_restaurant_id"
    t.index ["slug"], name: "index_branches_on_slug", unique: true
  end

  create_table "cash_transaction_items", force: :cascade do |t|
    t.bigint "cash_transaction_id", null: false
    t.bigint "menu_item_id"
    t.string "item_name_snapshot", null: false
    t.decimal "unit_price_snapshot", precision: 10, scale: 2, null: false
    t.integer "quantity", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["cash_transaction_id"], name: "index_cash_transaction_items_on_cash_transaction_id"
    t.index ["menu_item_id"], name: "index_cash_transaction_items_on_menu_item_id"
  end

  create_table "cash_transactions", force: :cascade do |t|
    t.bigint "branch_id", null: false
    t.bigint "admin_id", null: false
    t.integer "kind", null: false
    t.decimal "amount", precision: 10, scale: 2, null: false
    t.string "category"
    t.string "note"
    t.datetime "occurred_at", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["admin_id"], name: "index_cash_transactions_on_admin_id"
    t.index ["branch_id", "occurred_at"], name: "index_cash_transactions_on_branch_id_and_occurred_at"
    t.index ["branch_id"], name: "index_cash_transactions_on_branch_id"
  end

  create_table "categories", force: :cascade do |t|
    t.bigint "restaurant_id", null: false
    t.string "name", null: false
    t.text "description"
    t.integer "position", default: 0
    t.boolean "visible", default: true
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "name_ar"
    t.text "description_ar"
    t.index ["restaurant_id"], name: "index_categories_on_restaurant_id"
  end

  create_table "combo_deal_items", force: :cascade do |t|
    t.bigint "combo_deal_id", null: false
    t.bigint "menu_item_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["combo_deal_id", "menu_item_id"], name: "index_combo_deal_items_on_combo_deal_id_and_menu_item_id", unique: true
    t.index ["combo_deal_id"], name: "index_combo_deal_items_on_combo_deal_id"
    t.index ["menu_item_id"], name: "index_combo_deal_items_on_menu_item_id"
  end

  create_table "combo_deals", force: :cascade do |t|
    t.string "name", null: false
    t.string "description"
    t.string "discount_type", null: false
    t.decimal "discount_value", precision: 10, scale: 2, null: false
    t.boolean "active", default: true
    t.integer "position", default: 0
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "name_ar"
    t.string "description_ar"
  end

  create_table "customers", force: :cascade do |t|
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: ""
    t.string "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.string "jti", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "name"
    t.string "provider"
    t.string "uid"
    t.string "avatar_url"
    t.string "preferred_language", default: "ar", null: false
    t.index ["email"], name: "index_customers_on_email", unique: true
    t.index ["jti"], name: "index_customers_on_jti", unique: true
    t.index ["provider", "uid"], name: "index_customers_on_provider_and_uid"
    t.index ["reset_password_token"], name: "index_customers_on_reset_password_token", unique: true
  end

  create_table "denomination_counts", force: :cascade do |t|
    t.bigint "branch_id", null: false
    t.bigint "admin_id", null: false
    t.datetime "counted_at", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["admin_id"], name: "index_denomination_counts_on_admin_id"
    t.index ["branch_id", "counted_at"], name: "index_denomination_counts_on_branch_id_and_counted_at"
    t.index ["branch_id"], name: "index_denomination_counts_on_branch_id"
  end

  create_table "denomination_lines", force: :cascade do |t|
    t.bigint "denomination_count_id", null: false
    t.decimal "value", precision: 10, scale: 2, null: false
    t.integer "quantity", default: 0, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["denomination_count_id"], name: "index_denomination_lines_on_denomination_count_id"
  end

  create_table "employees", force: :cascade do |t|
    t.bigint "branch_id", null: false
    t.string "name", null: false
    t.string "name_ar"
    t.decimal "hourly_rate", precision: 10, scale: 2, default: "0.0", null: false
    t.boolean "active", default: true, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["branch_id"], name: "index_employees_on_branch_id"
  end

  create_table "favorites", force: :cascade do |t|
    t.bigint "customer_id", null: false
    t.bigint "menu_item_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["customer_id", "menu_item_id"], name: "index_favorites_on_customer_id_and_menu_item_id", unique: true
    t.index ["customer_id"], name: "index_favorites_on_customer_id"
    t.index ["menu_item_id"], name: "index_favorites_on_menu_item_id"
  end

  create_table "ledger_payments", force: :cascade do |t|
    t.bigint "branch_id", null: false
    t.bigint "admin_id", null: false
    t.date "date", null: false
    t.string "payee_name", null: false
    t.decimal "amount", precision: 10, scale: 2, null: false
    t.string "note"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["admin_id"], name: "index_ledger_payments_on_admin_id"
    t.index ["branch_id"], name: "index_ledger_payments_on_branch_id"
  end

  create_table "menu_item_branches", force: :cascade do |t|
    t.bigint "menu_item_id", null: false
    t.bigint "branch_id", null: false
    t.boolean "available", default: true
    t.decimal "price_override", precision: 10, scale: 2
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["branch_id"], name: "index_menu_item_branches_on_branch_id"
    t.index ["menu_item_id", "branch_id"], name: "index_menu_item_branches_on_menu_item_id_and_branch_id", unique: true
    t.index ["menu_item_id"], name: "index_menu_item_branches_on_menu_item_id"
  end

  create_table "menu_item_choices", force: :cascade do |t|
    t.bigint "menu_item_option_id", null: false
    t.string "label", null: false
    t.decimal "price_delta", precision: 10, scale: 2, default: "0.0"
    t.boolean "available", default: true
    t.integer "position", default: 0
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "label_ar"
    t.index ["menu_item_option_id"], name: "index_menu_item_choices_on_menu_item_option_id"
  end

  create_table "menu_item_options", force: :cascade do |t|
    t.bigint "menu_item_id", null: false
    t.string "name", null: false
    t.boolean "required", default: false
    t.boolean "multi_select", default: false
    t.integer "position", default: 0
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "max_selections"
    t.string "name_ar"
    t.index ["menu_item_id"], name: "index_menu_item_options_on_menu_item_id"
  end

  create_table "menu_items", force: :cascade do |t|
    t.bigint "category_id", null: false
    t.string "name", null: false
    t.text "description"
    t.decimal "price", precision: 10, scale: 2, null: false
    t.boolean "available", default: true
    t.boolean "featured", default: false
    t.integer "position", default: 0
    t.string "tags", default: [], array: true
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.decimal "compare_at_price", precision: 10, scale: 2
    t.string "offer_badge"
    t.string "name_ar"
    t.text "description_ar"
    t.index ["category_id"], name: "index_menu_items_on_category_id"
  end

  create_table "order_items", force: :cascade do |t|
    t.bigint "order_id", null: false
    t.bigint "menu_item_id"
    t.string "item_name_snapshot", null: false
    t.decimal "unit_price_snapshot", precision: 10, scale: 2, null: false
    t.integer "quantity", default: 1, null: false
    t.jsonb "choices_snapshot", default: []
    t.decimal "line_total", precision: 10, scale: 2, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "item_name_ar_snapshot"
    t.index ["menu_item_id"], name: "index_order_items_on_menu_item_id"
    t.index ["order_id"], name: "index_order_items_on_order_id"
  end

  create_table "orders", force: :cascade do |t|
    t.string "order_number", null: false
    t.bigint "customer_id"
    t.string "order_type", default: "pickup", null: false
    t.string "status", default: "pending", null: false
    t.string "payment_method", default: "cash"
    t.string "payment_status", default: "unpaid"
    t.string "payment_reference"
    t.decimal "subtotal", precision: 10, scale: 2, null: false
    t.decimal "delivery_fee", precision: 10, scale: 2, default: "0.0"
    t.decimal "total", precision: 10, scale: 2, null: false
    t.string "guest_name"
    t.string "guest_email"
    t.string "guest_phone"
    t.jsonb "delivery_address", default: {}
    t.text "notes"
    t.datetime "scheduled_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "promo_code_id"
    t.decimal "discount_amount", precision: 10, scale: 2, default: "0.0"
    t.bigint "driver_id"
    t.string "driver_notes"
    t.bigint "combo_deal_id"
    t.decimal "combo_discount_amount", precision: 10, scale: 2, default: "0.0"
    t.bigint "branch_id"
    t.string "delivery_zone_id"
    t.string "delivery_zone_name"
    t.decimal "delivery_zone_fee", precision: 10, scale: 2
    t.datetime "estimated_ready_at"
    t.decimal "tax_amount", precision: 10, scale: 2, default: "0.0"
    t.index ["branch_id"], name: "index_orders_on_branch_id"
    t.index ["combo_deal_id"], name: "index_orders_on_combo_deal_id"
    t.index ["customer_id"], name: "index_orders_on_customer_id"
    t.index ["driver_id"], name: "index_orders_on_driver_id"
    t.index ["order_number"], name: "index_orders_on_order_number", unique: true
    t.index ["promo_code_id"], name: "index_orders_on_promo_code_id"
  end

  create_table "phones", force: :cascade do |t|
    t.bigint "customer_id", null: false
    t.string "number", null: false
    t.boolean "is_default", default: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["customer_id"], name: "index_phones_on_customer_id"
  end

  create_table "promo_code_usages", force: :cascade do |t|
    t.bigint "promo_code_id", null: false
    t.integer "customer_id"
    t.string "guest_phone"
    t.integer "order_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["promo_code_id"], name: "index_promo_code_usages_on_promo_code_id"
  end

  create_table "promo_codes", force: :cascade do |t|
    t.string "code", null: false
    t.string "discount_type", null: false
    t.decimal "value", precision: 10, scale: 2, null: false
    t.string "description"
    t.integer "max_uses"
    t.integer "max_uses_per_customer"
    t.boolean "one_time_use", default: false
    t.datetime "expires_at"
    t.boolean "active", default: true
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["code"], name: "index_promo_codes_on_code", unique: true
  end

  create_table "restaurants", force: :cascade do |t|
    t.string "name", null: false
    t.string "slug", null: false
    t.text "description"
    t.string "phone"
    t.string "email"
    t.string "address"
    t.string "city"
    t.decimal "delivery_fee", precision: 10, scale: 2, default: "0.0"
    t.decimal "min_order_amount", precision: 10, scale: 2, default: "0.0"
    t.integer "estimated_delivery_minutes", default: 45
    t.integer "estimated_pickup_minutes", default: 20
    t.boolean "accepts_delivery", default: true
    t.boolean "accepts_pickup", default: true
    t.boolean "is_open", default: true
    t.string "currency", default: "EGP"
    t.string "timezone", default: "Africa/Cairo"
    t.string "payment_gateway", default: "cash"
    t.jsonb "payment_config", default: {}
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.decimal "vat_rate", precision: 5, scale: 2
    t.string "name_ar"
    t.text "description_ar"
    t.index ["slug"], name: "index_restaurants_on_slug", unique: true
  end

  create_table "timesheet_adjustments", force: :cascade do |t|
    t.bigint "employee_id", null: false
    t.date "date", null: false
    t.decimal "amount", precision: 10, scale: 2, null: false
    t.integer "adjustment_type", default: 0, null: false
    t.string "note"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["employee_id"], name: "index_timesheet_adjustments_on_employee_id"
  end

  create_table "timesheets", force: :cascade do |t|
    t.bigint "employee_id", null: false
    t.date "date", null: false
    t.decimal "hours_worked", precision: 5, scale: 2
    t.boolean "day_off", default: false, null: false
    t.string "note"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["employee_id", "date"], name: "index_timesheets_on_employee_id_and_date", unique: true
    t.index ["employee_id"], name: "index_timesheets_on_employee_id"
  end

  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "addresses", "customers"
  add_foreign_key "admins", "branches"
  add_foreign_key "branches", "restaurants"
  add_foreign_key "cash_transaction_items", "cash_transactions"
  add_foreign_key "cash_transaction_items", "menu_items"
  add_foreign_key "cash_transactions", "admins"
  add_foreign_key "cash_transactions", "branches"
  add_foreign_key "categories", "restaurants"
  add_foreign_key "combo_deal_items", "combo_deals"
  add_foreign_key "combo_deal_items", "menu_items"
  add_foreign_key "denomination_counts", "admins"
  add_foreign_key "denomination_counts", "branches"
  add_foreign_key "denomination_lines", "denomination_counts"
  add_foreign_key "employees", "branches"
  add_foreign_key "favorites", "customers"
  add_foreign_key "favorites", "menu_items"
  add_foreign_key "ledger_payments", "admins"
  add_foreign_key "ledger_payments", "branches"
  add_foreign_key "menu_item_branches", "branches"
  add_foreign_key "menu_item_branches", "menu_items"
  add_foreign_key "menu_item_choices", "menu_item_options"
  add_foreign_key "menu_item_options", "menu_items"
  add_foreign_key "menu_items", "categories"
  add_foreign_key "order_items", "menu_items", on_delete: :nullify
  add_foreign_key "order_items", "orders"
  add_foreign_key "orders", "admins", column: "driver_id"
  add_foreign_key "orders", "branches"
  add_foreign_key "orders", "combo_deals"
  add_foreign_key "orders", "customers"
  add_foreign_key "orders", "promo_codes"
  add_foreign_key "phones", "customers"
  add_foreign_key "promo_code_usages", "promo_codes"
  add_foreign_key "timesheet_adjustments", "employees"
  add_foreign_key "timesheets", "employees"
end
