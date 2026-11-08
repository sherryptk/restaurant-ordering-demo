class CreateComboDeal < ActiveRecord::Migration[7.1]
  def change
    create_table :combo_deals do |t|
      t.string :name, null: false
      t.string :description
      t.string :discount_type, null: false
      t.decimal :discount_value, precision: 10, scale: 2, null: false
      t.boolean :active, default: true
      t.integer :position, default: 0

      t.timestamps
    end
  end
end
