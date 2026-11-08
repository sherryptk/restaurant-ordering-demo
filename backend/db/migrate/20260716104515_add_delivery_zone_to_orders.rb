class AddDeliveryZoneToOrders < ActiveRecord::Migration[7.1]
  def change
    add_column :orders, :delivery_zone_id, :string, null: true
    add_column :orders, :delivery_zone_name, :string, null: true
    add_column :orders, :delivery_zone_fee, :decimal, precision: 10, scale: 2, null: true
  end
end
