class AddOmniauthToCustomers < ActiveRecord::Migration[7.1]
  def change
    add_column :customers, :provider, :string, null: true
    add_column :customers, :uid, :string, null: true
    add_column :customers, :avatar_url, :string, null: true
    add_index :customers, [:provider, :uid]

    change_column_null :customers, :encrypted_password, true
  end
end
