module Admins
  class SessionsController < Devise::SessionsController
    respond_to :json

    private

    def respond_with(resource, _opts = {})
      token = request.env["warden-jwt_auth.token"]
      response.headers["Authorization"] = "Bearer #{token}" if token

      render json: { admin: admin_json(resource) }, status: :ok
    end

    def respond_to_on_destroy
      render json: { message: "Logged out" }, status: :ok
    end

    def admin_json(resource)
      {
        id: resource.id,
        email: resource.email,
        name: resource.name,
        phone: resource.phone,
        role: resource.role,
        branch_id: resource.branch_id,
        branch_name: resource.branch&.name
      }
    end
  end
end
