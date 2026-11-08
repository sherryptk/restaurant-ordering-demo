class PromoCodeUsage < ApplicationRecord
  belongs_to :promo_code
  belongs_to :order, optional: true
end
