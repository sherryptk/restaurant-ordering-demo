class Phone < ApplicationRecord
  belongs_to :customer

  validates :number, presence: true

  before_save :unset_other_defaults, if: :is_default?

  private

  def unset_other_defaults
    customer.phones.where.not(id: id).update_all(is_default: false)
  end
end
