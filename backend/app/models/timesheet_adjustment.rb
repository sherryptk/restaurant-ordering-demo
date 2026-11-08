class TimesheetAdjustment < ApplicationRecord
  belongs_to :employee

  enum :adjustment_type, { advance: 0, deduction: 1, bonus: 2, penalty: 3 }

  validates :date, presence: true
  validates :amount, numericality: { greater_than: 0 }
end
