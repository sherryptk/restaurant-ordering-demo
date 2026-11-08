class Employee < ApplicationRecord
  belongs_to :branch

  has_many :timesheets, dependent: :destroy
  has_many :timesheet_adjustments, dependent: :destroy

  validates :name, presence: true
  validates :hourly_rate, numericality: { greater_than_or_equal_to: 0 }

  scope :active, -> { where(active: true) }

  def payroll_summary(month)
    range = month.beginning_of_month..month.end_of_month

    total_hours = timesheets.where(date: range).sum(:hours_worked)
    gross_pay = total_hours * hourly_rate
    advances = timesheet_adjustments.where(date: range, adjustment_type: :advance).sum(:amount)
    deductions = timesheet_adjustments.where(date: range, adjustment_type: :deduction).sum(:amount)
    bonuses = timesheet_adjustments.where(date: range, adjustment_type: :bonus).sum(:amount)
    penalties = timesheet_adjustments.where(date: range, adjustment_type: :penalty).sum(:amount)

    {
      total_hours: total_hours,
      gross_pay: gross_pay,
      advances: advances,
      deductions: deductions,
      bonuses: bonuses,
      penalties: penalties,
      net_pay: gross_pay + bonuses - advances - deductions - penalties
    }
  end
end
