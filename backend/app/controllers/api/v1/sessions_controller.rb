module Api
  module V1
    class SessionsController < Devise::SessionsController
      respond_to :json

      private

      def respond_with(resource, _opts = {})
        token = request.env["warden-jwt_auth.token"]
        response.headers["Authorization"] = "Bearer #{token}" if token

        render json: { customer: customer_json(resource) }, status: :ok
      end

      def respond_to_on_destroy
        render json: { message: "Logged out" }, status: :ok
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
