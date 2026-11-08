class DenominationCount < ApplicationRecord
  DENOMINATIONS = [200, 100, 50, 20, 10, 5, 1, 0.5, 0.25].freeze

  belongs_to :branch
  belongs_to :admin

  has_many :denomination_lines, dependent: :destroy
  accepts_nested_attributes_for :denomination_lines

  validates :counted_at, presence: true

  scope :on_date, ->(date) { where(counted_at: date.beginning_of_day..date.end_of_day) }

  def total
    denomination_lines.sum { |line| line.value * line.quantity }
  end
end
