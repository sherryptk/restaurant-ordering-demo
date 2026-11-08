module Admins
  class SettingsController < Admins::BaseController
    include Admins::RoleEnforcement

    def show
      render json: settings_json(restaurant)
    end

    def update
      merged_payment_config = restaurant.payment_config.merge(settings_params[:payment_config] || {})
      attributes = settings_params.except(:payment_config).merge(payment_config: merged_payment_config)

      if restaurant.update(attributes)
        render json: settings_json(restaurant)
      else
        render json: { errors: restaurant.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def upload_banner
      attach_resized(restaurant.banner, params[:banner], max_dimension: 2400)
      restaurant.touch
      render json: { banner_url: public_url_for(restaurant.banner) }
    end

    def upload_logo
      attach_resized(restaurant.logo, params[:logo])
      restaurant.touch
      render json: { logo_url: public_url_for(restaurant.logo) }
    end

    private

    def permitted_action
      action_name == "show" ? :view_settings : :manage_settings
    end

    def settings_params
      params.require(:restaurant).permit(
        :name, :name_ar, :slug, :description, :description_ar, :phone, :email, :address, :city,
        :delivery_fee, :min_order_amount, :estimated_delivery_minutes,
        :estimated_pickup_minutes, :accepts_delivery, :accepts_pickup,
        :is_open, :currency, :timezone, :payment_gateway, :vat_rate,
        payment_config: {}
      ).to_h.symbolize_keys
    end

    def settings_json(restaurant)
      {
        id: restaurant.id,
        name: restaurant.name,
        name_ar: restaurant.name_ar,
        slug: restaurant.slug,
        description: restaurant.description,
        description_ar: restaurant.description_ar,
        phone: restaurant.phone,
        email: restaurant.email,
        address: restaurant.address,
        city: restaurant.city,
        delivery_fee: restaurant.delivery_fee,
        min_order_amount: restaurant.min_order_amount,
        estimated_delivery_minutes: restaurant.estimated_delivery_minutes,
        estimated_pickup_minutes: restaurant.estimated_pickup_minutes,
        accepts_delivery: restaurant.accepts_delivery,
        accepts_pickup: restaurant.accepts_pickup,
        is_open: restaurant.is_open,
        currency: restaurant.currency,
        vat_rate: restaurant.vat_rate,
        timezone: restaurant.timezone,
        payment_gateway: restaurant.payment_gateway,
        payment_config_keys: restaurant.payment_config.keys,
        logo_url: public_url_for(restaurant.logo),
        banner_url: public_url_for(restaurant.banner)
      }
    end
  end
end
