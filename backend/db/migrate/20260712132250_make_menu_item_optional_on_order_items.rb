class MakeMenuItemOptionalOnOrderItems < ActiveRecord::Migration[7.1]
  def change
    change_column_null :order_items, :menu_item_id, true

    remove_foreign_key :order_items, :menu_items
    add_foreign_key :order_items, :menu_items, on_delete: :nullify
  end
end
