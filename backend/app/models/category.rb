class Category < ApplicationRecord
  include TouchesMenuCache

  belongs_to :restaurant

  has_many :menu_items, -> { order(:position) }, dependent: :destroy

  validates :name, presence: true

  scope :visible, -> { where(visible: true) }
end
