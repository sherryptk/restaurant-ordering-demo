class CreateMenuItemBranches < ActiveRecord::Migration[7.1]
  def change
    create_table :menu_item_branches do |t|
      t.references :menu_item, null: false, foreign_key: true
      t.references :branch, null: false, foreign_key: true
      t.boolean :available, default: true
      t.decimal :price_override, precision: 10, scale: 2, null: true

      t.timestamps
    end

    add_index :menu_item_branches, [:menu_item_id, :branch_id], unique: true
  end
end
