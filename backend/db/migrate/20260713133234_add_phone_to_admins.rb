class AddPhoneToAdmins < ActiveRecord::Migration[7.1]
  def change
    add_column :admins, :phone, :string, null: true
  end
end
