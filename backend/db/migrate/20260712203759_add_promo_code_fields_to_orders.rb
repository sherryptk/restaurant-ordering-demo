class AddPromoCodeFieldsToOrders < ActiveRecord::Migration[7.1]
  def change
    add_column :orders, :promo_code_id, :bigint
    add_column :orders, :discount_amount, :decimal, precision: 10, scale: 2, default: 0

    add_index :orders, :promo_code_id
    add_foreign_key :orders, :promo_codes
  end
end
