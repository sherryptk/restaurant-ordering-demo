class CreateMenuItems < ActiveRecord::Migration[7.1]
  def change
    create_table :menu_items do |t|
      t.references :category, null: false, foreign_key: true
      t.string :name, null: false
      t.text :description
      t.decimal :price, precision: 10, scale: 2, null: false
      t.boolean :available, default: true
      t.boolean :featured, default: false
      t.integer :position, default: 0
      t.string :tags, array: true, default: []

      t.timestamps
    end
  end
end
