class MenuItemChoice < ApplicationRecord
  include TouchesMenuCache

  belongs_to :menu_item_option

  validates :label, presence: true
  validates :price_delta, numericality: { greater_than: -MenuItem::MAX_PRICE, less_than: MenuItem::MAX_PRICE }

  scope :available, -> { where(available: true) }
end
