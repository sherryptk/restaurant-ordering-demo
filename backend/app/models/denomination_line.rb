class DenominationLine < ApplicationRecord
  belongs_to :denomination_count

  validates :value, inclusion: { in: DenominationCount::DENOMINATIONS }
  validates :quantity, numericality: { greater_than_or_equal_to: 0, only_integer: true }

  def subtotal
    value * quantity
  end
end
