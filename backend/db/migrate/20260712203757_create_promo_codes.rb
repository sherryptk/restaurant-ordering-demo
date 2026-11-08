class CreatePromoCodes < ActiveRecord::Migration[7.1]
  def change
    create_table :promo_codes do |t|
      t.string :code, null: false
      t.string :discount_type, null: false
      t.decimal :value, precision: 10, scale: 2, null: false
      t.string :description
      t.integer :max_uses
      t.integer :max_uses_per_customer
      t.boolean :one_time_use, default: false
      t.datetime :expires_at
      t.boolean :active, default: true

      t.timestamps
    end

    add_index :promo_codes, :code, unique: true
  end
end
