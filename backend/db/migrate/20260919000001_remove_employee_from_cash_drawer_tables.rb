class RemoveEmployeeFromCashDrawerTables < ActiveRecord::Migration[7.1]
  def change
    remove_reference :cash_transactions, :employee, foreign_key: true
    remove_reference :denomination_counts, :employee, foreign_key: true
  end
end
