class AddBranchToAdmins < ActiveRecord::Migration[7.1]
  def change
    add_column :admins, :branch_id, :bigint, null: true
    add_index :admins, :branch_id
    add_foreign_key :admins, :branches
  end
end
