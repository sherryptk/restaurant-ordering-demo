class CreateLedgerPayments < ActiveRecord::Migration[7.1]
  def change
    create_table :ledger_payments do |t|
      t.references :branch, null: false, foreign_key: true
      t.references :admin, null: false, foreign_key: true
      t.date :date, null: false
      t.string :payee_name, null: false
      t.decimal :amount, precision: 10, scale: 2, null: false
      t.string :note

      t.timestamps
    end
  end
end
