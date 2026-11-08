class AddDriverToOrders < ActiveRecord::Migration[7.1]
  def change
    add_reference :orders, :driver, null: true, foreign_key: { to_table: :admins }, index: true
    add_column :orders, :driver_notes, :string
  end
end
