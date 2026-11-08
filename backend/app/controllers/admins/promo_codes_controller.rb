module Admins
  class PromoCodesController < Admins::BaseController
    include Admins::RoleEnforcement

    before_action :set_promo_code, only: [:update, :destroy, :toggle]

    def index
      promo_codes = PromoCode.order(created_at: :desc)
      render json: promo_codes.map { |promo_code| promo_code_json(promo_code) }
    end

    def create
      promo_code = PromoCode.new(promo_code_params)

      if promo_code.save
        render json: promo_code_json(promo_code), status: :created
      else
        render json: { errors: promo_code.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def update
      if @promo_code.update(promo_code_params)
        render json: promo_code_json(@promo_code)
      else
        render json: { errors: @promo_code.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def destroy
      @promo_code.destroy
      head :no_content
    end

    def toggle
      @promo_code.update(active: !@promo_code.active)
      render json: promo_code_json(@promo_code)
    end

    private

    def permitted_action
      :manage_promo_codes
    end

    def set_promo_code
      @promo_code = PromoCode.find_by(id: params[:id])
      render json: { error: "Not found" }, status: :not_found if @promo_code.nil?
    end

    def promo_code_params
      params.require(:promo_code).permit(
        :code, :discount_type, :value, :description, :max_uses,
        :max_uses_per_customer, :one_time_use, :expires_at, :active
      )
    end

    def promo_code_json(promo_code)
      {
        id: promo_code.id,
        code: promo_code.code,
        discount_type: promo_code.discount_type,
        value: promo_code.value,
        description: promo_code.description,
        max_uses: promo_code.max_uses,
        max_uses_per_customer: promo_code.max_uses_per_customer,
        one_time_use: promo_code.one_time_use,
        expires_at: promo_code.expires_at,
        active: promo_code.active,
        usage_count: promo_code.promo_code_usages.count,
        created_at: promo_code.created_at
      }
    end
  end
end
