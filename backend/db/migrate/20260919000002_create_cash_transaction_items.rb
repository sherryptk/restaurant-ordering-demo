class CreateCashTransactionItems < ActiveRecord::Migration[7.1]
  def change
    create_table :cash_transaction_items do |t|
      t.references :cash_transaction, null: false, foreign_key: true
      t.references :menu_item, foreign_key: true
      t.string :item_name_snapshot, null: false
      t.decimal :unit_price_snapshot, precision: 10, scale: 2, null: false
      t.integer :quantity, null: false

      t.timestamps
    end
  end
end
