class CashTransactionItem < ApplicationRecord
  belongs_to :cash_transaction
  belongs_to :menu_item, optional: true

  validates :item_name_snapshot, presence: true
  validates :unit_price_snapshot, numericality: { greater_than_or_equal_to: 0 }
  validates :quantity, numericality: { greater_than: 0, only_integer: true }

  before_validation :snapshot_menu_item, on: :create

  def line_total
    unit_price_snapshot * quantity
  end

  private

  def snapshot_menu_item
    return unless menu_item

    self.item_name_snapshot ||= menu_item.name
    self.unit_price_snapshot ||= menu_item.price
  end
end
