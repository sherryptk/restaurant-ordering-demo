class AddBranchToOrders < ActiveRecord::Migration[7.1]
  def change
    add_column :orders, :branch_id, :bigint, null: true
    add_index :orders, :branch_id
    add_foreign_key :orders, :branches
  end
end
