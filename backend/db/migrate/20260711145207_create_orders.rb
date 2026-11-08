class CreateOrders < ActiveRecord::Migration[7.1]
  def change
    create_table :orders do |t|
      t.string :order_number, null: false
      t.references :customer, null: true, foreign_key: true
      t.string :order_type, null: false, default: "pickup"
      t.string :status, null: false, default: "pending"
      t.string :payment_method, default: "cash"
      t.string :payment_status, default: "unpaid"
      t.string :payment_reference
      t.decimal :subtotal, precision: 10, scale: 2, null: false
      t.decimal :delivery_fee, precision: 10, scale: 2, default: 0
      t.decimal :total, precision: 10, scale: 2, null: false
      t.string :guest_name
      t.string :guest_email
      t.string :guest_phone
      t.jsonb :delivery_address, default: {}
      t.text :notes
      t.datetime :scheduled_at

      t.timestamps
    end

    add_index :orders, :order_number, unique: true
  end
end
