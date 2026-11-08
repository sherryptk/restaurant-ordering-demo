class AddPreferredLanguageToCustomers < ActiveRecord::Migration[7.1]
  def change
    add_column :customers, :preferred_language, :string, default: "ar", null: false
  end
end
