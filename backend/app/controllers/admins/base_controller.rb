module Admins
  class BaseController < ApplicationController
    before_action :authenticate_admin!

    private

    def authenticate_admin!
      token = request.headers["Authorization"]&.split(" ")&.last

      if token.blank?
        render json: { error: "Unauthorized" }, status: :unauthorized
        return
      end

      begin
        payload = JWT.decode(token, Rails.application.credentials.secret_key_base, true, algorithm: "HS256").first
        @current_admin = Admin.find_by(id: payload["sub"])
        render json: { error: "Unauthorized" }, status: :unauthorized if @current_admin.nil?
      rescue JWT::DecodeError, JWT::ExpiredSignature
        render json: { error: "Unauthorized" }, status: :unauthorized
      end
    end
  end
end
