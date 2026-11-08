class AddDiscountFieldsToMenuItems < ActiveRecord::Migration[7.1]
  def change
    add_column :menu_items, :compare_at_price, :decimal, precision: 10, scale: 2, null: true
    add_column :menu_items, :offer_badge, :string
  end
end
