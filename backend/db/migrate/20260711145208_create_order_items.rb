class CreateOrderItems < ActiveRecord::Migration[7.1]
  def change
    create_table :order_items do |t|
      t.references :order, null: false, foreign_key: true
      t.references :menu_item, null: false, foreign_key: true
      t.string :item_name_snapshot, null: false
      t.decimal :unit_price_snapshot, precision: 10, scale: 2, null: false
      t.integer :quantity, null: false, default: 1
      t.jsonb :choices_snapshot, default: []
      t.decimal :line_total, precision: 10, scale: 2, null: false

      t.timestamps
    end
  end
end
