class AddDeliveryZonesToBranches < ActiveRecord::Migration[7.1]
  def change
    add_column :branches, :delivery_zones, :jsonb, default: []
  end
end
