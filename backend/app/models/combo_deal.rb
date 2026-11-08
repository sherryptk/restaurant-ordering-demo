class ComboDeal < ApplicationRecord
  include TouchesMenuCache

  has_many :combo_deal_items, dependent: :destroy
  has_many :menu_items, through: :combo_deal_items
  has_one_attached :image

  enum :discount_type, { percentage: "percentage", fixed: "fixed" }

  validates :name, presence: true
  validates :discount_value, numericality: { greater_than: 0 }
  validates :discount_value, numericality: { less_than_or_equal_to: 100 }, if: :percentage?

  scope :active, -> { where(active: true) }

  def original_price
    menu_items.sum(:price)
  end

  def discounted_price
    case discount_type
    when "percentage"
      original_price - (discount_value / 100.0 * original_price).round(2)
    when "fixed"
      [original_price - discount_value, 0].max
    end
  end

  def discount_amount
    case discount_type
    when "percentage"
      (discount_value / 100.0 * original_price).round(2)
    when "fixed"
      [discount_value, original_price].min
    end
  end

  def applies_to_cart?(cart_item_ids)
    return false if menu_item_ids.empty?

    normalized_cart_ids = Array(cart_item_ids).map(&:to_i)
    menu_item_ids.all? { |id| normalized_cart_ids.include?(id) }
  end
end
