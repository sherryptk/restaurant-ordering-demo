class MenuItem < ApplicationRecord
  include TouchesMenuCache

  belongs_to :category

  has_many :menu_item_options, -> { order(:position) }, dependent: :destroy
  has_many :favorites, dependent: :destroy

  has_one_attached :image

  validates :name, presence: true
  # Columns are decimal(10,2); anything at or above this overflows Postgres and 500s.
  MAX_PRICE = 100_000_000

  validates :price, presence: true, numericality: { greater_than_or_equal_to: 0, less_than: MAX_PRICE }
  validates :compare_at_price, numericality: { greater_than_or_equal_to: 0, less_than: MAX_PRICE }, allow_nil: true

  scope :available, -> { where(available: true) }
  scope :featured, -> { where(featured: true) }
  scope :on_offer, -> { where("compare_at_price IS NOT NULL AND compare_at_price > price") }

  delegate :restaurant, to: :category

  def discount_percentage
    return unless compare_at_price

    ((compare_at_price - price) / compare_at_price * 100).round
  end
end
