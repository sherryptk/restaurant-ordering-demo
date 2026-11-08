class CreateMenuItemChoices < ActiveRecord::Migration[7.1]
  def change
    create_table :menu_item_choices do |t|
      t.references :menu_item_option, null: false, foreign_key: true
      t.string :label, null: false
      t.decimal :price_delta, precision: 10, scale: 2, default: 0
      t.boolean :available, default: true
      t.integer :position, default: 0

      t.timestamps
    end
  end
end
