module Api
  module V1
    class PromoCodesController < Api::V1::BaseController
      def validate
        promo_code = PromoCode.find_by("LOWER(code) = ?", params[:code].to_s.downcase)

        if promo_code.nil?
          return render json: {
            valid: false,
            error: "Invalid promo code",
            discount_type: nil,
            value: nil,
            discount_amount: nil,
            description: nil
          }
        end

        result = promo_code.valid_for_use?(customer: current_customer, phone: params[:phone])

        if result[:valid]
          discount = promo_code.discount_amount(params[:subtotal].to_f)

          render json: {
            valid: true,
            error: nil,
            discount_type: promo_code.discount_type,
            value: promo_code.value,
            discount_amount: discount,
            description: promo_code.description
          }
        else
          render json: {
            valid: false,
            error: result[:error],
            discount_type: nil,
            value: nil,
            discount_amount: nil,
            description: nil
          }
        end
      end
    end
  end
end
