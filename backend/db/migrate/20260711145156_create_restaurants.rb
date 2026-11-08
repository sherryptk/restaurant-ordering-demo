class CreateRestaurants < ActiveRecord::Migration[7.1]
  def change
    create_table :restaurants do |t|
      t.string :name, null: false
      t.string :slug, null: false
      t.text :description
      t.string :phone
      t.string :email
      t.string :address
      t.string :city
      t.decimal :delivery_fee, precision: 10, scale: 2, default: 0
      t.decimal :min_order_amount, precision: 10, scale: 2, default: 0
      t.integer :estimated_delivery_minutes, default: 45
      t.integer :estimated_pickup_minutes, default: 20
      t.boolean :accepts_delivery, default: true
      t.boolean :accepts_pickup, default: true
      t.boolean :is_open, default: true
      t.string :currency, default: "EGP"
      t.string :timezone, default: "Africa/Cairo"
      t.string :payment_gateway, default: "cash"
      t.jsonb :payment_config, default: {}

      t.timestamps
    end

    add_index :restaurants, :slug, unique: true
  end
end
