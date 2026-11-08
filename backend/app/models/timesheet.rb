class Timesheet < ApplicationRecord
  belongs_to :employee

  validates :date, presence: true, uniqueness: { scope: :employee_id }
  validate :hours_worked_or_day_off

  private

  def hours_worked_or_day_off
    if day_off && hours_worked.present?
      errors.add(:hours_worked, "can't be set on a day off")
    elsif !day_off && hours_worked.blank?
      errors.add(:hours_worked, "must be present unless it's a day off")
    end
  end
end
