class LedgerPayment < ApplicationRecord
  belongs_to :branch
  belongs_to :admin

  validates :date, presence: true
  validates :payee_name, presence: true
  validates :amount, numericality: { other_than: 0 }
end
