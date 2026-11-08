class PromoCode < ApplicationRecord
  has_many :promo_code_usages

  enum :discount_type, { percentage: "percentage", fixed: "fixed" }

  validates :code, presence: true, uniqueness: { case_sensitive: false }
  validates :value, numericality: { greater_than: 0 }
  validates :value, numericality: { less_than_or_equal_to: 100 }, if: :percentage?

  scope :active, -> { where(active: true) }

  def valid_for_use?(customer: nil, phone: nil)
    return { valid: false, error: "This promo code is inactive" } unless active?
    return { valid: false, error: "This promo code has expired" } if expires_at.present? && expires_at.past?

    if max_uses.present? && promo_code_usages.count >= max_uses
      return { valid: false, error: "This promo code has reached its usage limit" }
    end

    if one_time_use? || max_uses_per_customer.present?
      identifier_scope =
        if customer
          promo_code_usages.where(customer_id: customer.id)
        elsif phone
          promo_code_usages.where(guest_phone: phone)
        else
          promo_code_usages.none
        end

      limit = one_time_use? ? 1 : max_uses_per_customer
      if identifier_scope.count >= limit
        return { valid: false, error: "You've already used this promo code" }
      end
    end

    { valid: true }
  end

  def discount_amount(subtotal)
    subtotal = subtotal.to_d

    case discount_type
    when "percentage"
      (value / 100.0 * subtotal).round(2)
    when "fixed"
      [value, subtotal].min
    end
  end
end
