class AddEstimatedReadyAtToOrders < ActiveRecord::Migration[7.1]
  def change
    add_column :orders, :estimated_ready_at, :datetime
  end
end
