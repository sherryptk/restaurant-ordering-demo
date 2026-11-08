class AddItemNameArSnapshotToOrderItems < ActiveRecord::Migration[7.1]
  def change
    add_column :order_items, :item_name_ar_snapshot, :string
  end
end
