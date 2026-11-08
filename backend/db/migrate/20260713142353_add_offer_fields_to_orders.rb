class AddOfferFieldsToOrders < ActiveRecord::Migration[7.1]
  def change
    add_reference :orders, :combo_deal, null: true, foreign_key: true, index: true
    add_column :orders, :combo_discount_amount, :decimal, precision: 10, scale: 2, default: 0
  end
end
