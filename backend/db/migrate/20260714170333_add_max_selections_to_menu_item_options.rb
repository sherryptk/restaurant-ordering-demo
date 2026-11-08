class AddMaxSelectionsToMenuItemOptions < ActiveRecord::Migration[7.1]
  def change
    add_column :menu_item_options, :max_selections, :integer
  end
end
