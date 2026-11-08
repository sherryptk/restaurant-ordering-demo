class AddVatRateToRestaurants < ActiveRecord::Migration[7.1]
  def change
    add_column :restaurants, :vat_rate, :decimal, precision: 5, scale: 2, null: true, default: nil
  end
end
