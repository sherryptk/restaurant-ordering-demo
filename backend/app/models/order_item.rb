class OrderItem < ApplicationRecord
  belongs_to :order
  belongs_to :menu_item, optional: true

  MAX_QUANTITY = 99

  validates :quantity, numericality: { only_integer: true, greater_than: 0, less_than_or_equal_to: MAX_QUANTITY }
  validates :unit_price_snapshot, numericality: { greater_than_or_equal_to: 0 }
  validates :line_total, numericality: { greater_than_or_equal_to: 0 }

  before_validation :snapshot_menu_item, on: :create
  before_validation :calculate_line_total

  private

  def snapshot_menu_item
    return unless menu_item

    self.item_name_snapshot ||= menu_item.name
    self.item_name_ar_snapshot ||= menu_item.name_ar
    self.unit_price_snapshot ||= menu_item.price
  end

  def calculate_line_total
    choices_total = Array(choices_snapshot).sum { |choice| (choice["price_delta"] || choice[:price_delta]).to_f }
    self.line_total = (unit_price_snapshot.to_d + choices_total.to_d) * quantity.to_i
  end
end
