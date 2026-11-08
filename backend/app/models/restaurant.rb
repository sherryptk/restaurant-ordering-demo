class Restaurant < ApplicationRecord
  include TouchesMenuCache

  has_many :categories, -> { order(:position) }, dependent: :destroy
  has_many :menu_items, through: :categories
  has_many :branches, dependent: :destroy

  has_one_attached :logo
  has_one_attached :banner

  validates :name, presence: true
  validates :slug, presence: true, uniqueness: true
  validates :payment_gateway, inclusion: { in: %w[paymob kashier cash] }

  before_validation :set_slug, on: :create

  def payment_adapter
    Payments::Factory.for(payment_gateway, payment_config)
  end

  private

  def set_slug
    self.slug = name.parameterize if slug.blank? && name.present?
  end
end
