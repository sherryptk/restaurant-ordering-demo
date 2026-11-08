class Address < ApplicationRecord
  belongs_to :customer

  validates :street, presence: true
  validates :city, presence: true

  before_save :unset_other_defaults, if: :is_default?

  def to_delivery_hash
    {
      label: label,
      street: street,
      district: district,
      city: city,
      building: building,
      floor: floor,
      apartment: apartment,
      notes: notes,
      lat: lat,
      lng: lng,
      is_default: is_default
    }
  end

  private

  def unset_other_defaults
    customer.addresses.where.not(id: id).update_all(is_default: false)
  end
end
