class CreateMenuItemOptions < ActiveRecord::Migration[7.1]
  def change
    create_table :menu_item_options do |t|
      t.references :menu_item, null: false, foreign_key: true
      t.string :name, null: false
      t.boolean :required, default: false
      t.boolean :multi_select, default: false
      t.integer :position, default: 0

      t.timestamps
    end
  end
end
