class CreateCashTransactions < ActiveRecord::Migration[7.1]
  def change
    create_table :cash_transactions do |t|
      t.references :branch, null: false, foreign_key: true
      t.references :admin, null: false, foreign_key: true
      t.references :employee, foreign_key: true
      t.integer :kind, null: false
      t.decimal :amount, precision: 10, scale: 2, null: false
      t.string :category
      t.string :note
      t.datetime :occurred_at, null: false

      t.timestamps
    end

    add_index :cash_transactions, [:branch_id, :occurred_at]
  end
end
