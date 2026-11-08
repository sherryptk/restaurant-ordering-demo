module Api
  module V1
    class RegistrationsController < Devise::RegistrationsController
      respond_to :json

      before_action :configure_sign_up_params, only: [:create]

      private

      def configure_sign_up_params
        devise_parameter_sanitizer.permit(:sign_up, keys: [:name, :preferred_language])
      end

      def respond_with(resource, _opts = {})
        if resource.persisted?
          render json: { customer: customer_json(resource) }, status: :created
        else
          render json: { errors: resource.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def customer_json(resource)
        {
          id: resource.id,
          email: resource.email,
          name: resource.name,
          preferred_language: resource.preferred_language
        }
      end
    end
  end
end
