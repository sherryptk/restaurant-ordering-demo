class MenuItemOption < ApplicationRecord
  include TouchesMenuCache

  belongs_to :menu_item

  has_many :menu_item_choices, -> { order(:position) }, dependent: :destroy

  validates :name, presence: true
end
