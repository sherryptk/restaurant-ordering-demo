class CreateBranches < ActiveRecord::Migration[7.1]
  def change
    create_table :branches do |t|
      t.string :name, null: false
      t.string :slug, null: false
      t.string :address
      t.string :city
      t.decimal :lat, precision: 10, scale: 7
      t.decimal :lng, precision: 10, scale: 7
      t.string :phone
      t.decimal :delivery_fee, precision: 10, scale: 2, default: 0
      t.decimal :min_order_amount, precision: 10, scale: 2, default: 0
      t.integer :estimated_delivery_minutes, default: 45
      t.integer :estimated_pickup_minutes, default: 20
      t.boolean :accepts_delivery, default: true
      t.boolean :accepts_pickup, default: true
      t.boolean :is_open, default: true
      t.jsonb :delivery_zone, default: []
      t.references :restaurant, null: false, foreign_key: true

      t.timestamps
    end

    add_index :branches, :slug, unique: true
  end
end
