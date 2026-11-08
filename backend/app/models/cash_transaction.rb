class CashTransaction < ApplicationRecord
  belongs_to :branch
  belongs_to :admin

  has_many :items, class_name: "CashTransactionItem", dependent: :destroy
  accepts_nested_attributes_for :items, allow_destroy: true

  enum :kind, {
    cash_sale: 0,
    visa_store_sale: 1,
    visa_orders_sale: 2,
    instapay_sale: 3,
    expense: 4,
    mobile_wallet_sale: 5
  }

  validates :amount, numericality: { greater_than: 0 }
  validates :category, presence: true, if: :expense?
  validates :occurred_at, presence: true

  before_validation :compute_amount_from_items, if: -> { items.any? { |item| !item.marked_for_destruction? } }

  scope :on_date, ->(date) { where(occurred_at: date.beginning_of_day..date.end_of_day) }
  scope :in_month, ->(month) { where(occurred_at: month.beginning_of_month..month.end_of_month) }

  def items_total
    items.reject(&:marked_for_destruction?).sum(&:line_total)
  end

  private

  # When items are attached, the amount is always derived from them — the whole
  # point of itemizing a sale is that the total can't drift from what was rung up.
  #
  # This runs in before_validation, ahead of the items' own snapshot callback
  # (which only fires once *their* validation runs), so unit_price_snapshot may
  # still be blank on a brand-new item — fall back to the menu item's price.
  def compute_amount_from_items
    self.amount = items.reject(&:marked_for_destruction?).sum do |item|
      price = item.unit_price_snapshot || item.menu_item&.price || 0
      price * item.quantity.to_i
    end
  end
end
