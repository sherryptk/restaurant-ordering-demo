class AddNameToAdmins < ActiveRecord::Migration[7.1]
  def change
    add_column :admins, :name, :string
  end
end
