class MenuItemBranch < ApplicationRecord
  include TouchesMenuCache

  belongs_to :menu_item
  belongs_to :branch

  validates :menu_item_id, uniqueness: { scope: :branch_id }
end
