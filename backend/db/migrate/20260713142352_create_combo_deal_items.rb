class CreateComboDealItems < ActiveRecord::Migration[7.1]
  def change
    create_table :combo_deal_items do |t|
      t.references :combo_deal, null: false, foreign_key: true
      t.references :menu_item, null: false, foreign_key: true

      t.timestamps
    end

    add_index :combo_deal_items, [:combo_deal_id, :menu_item_id], unique: true
  end
end
