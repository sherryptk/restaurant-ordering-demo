module Api
  module V1
    class BaseController < ApplicationController
      before_action :authenticate_customer_or_guest!

      private

      def authenticate_customer_or_guest!
        token = extract_token
        return if token.blank?

        begin
          payload = JWT.decode(token, Rails.application.credentials.secret_key_base, true, algorithm: "HS256").first
          @current_customer = Customer.find_by(id: payload["sub"])
          render json: { error: "Unauthorized" }, status: :unauthorized if @current_customer.nil?
        rescue JWT::DecodeError, JWT::ExpiredSignature
          render json: { error: "Unauthorized" }, status: :unauthorized
        end
      end

      def extract_token
        request.headers["Authorization"]&.split(" ")&.last
      end

      # Identifies the customer when the token is valid, but — unlike
      # authenticate_customer_or_guest! — never 401s on a missing/stale/
      # expired token. Used by endpoints that must stay open to guests
      # (e.g. the public menu) while still personalizing for signed-in ones.
      def authenticate_customer_optional!
        token = extract_token
        return if token.blank?

        payload = JWT.decode(token, Rails.application.credentials.secret_key_base, true, algorithm: "HS256").first
        @current_customer = Customer.find_by(id: payload["sub"])
      rescue JWT::DecodeError, JWT::ExpiredSignature
        nil
      end

      def require_customer!
        render json: { error: "Unauthorized" }, status: :unauthorized if current_customer.nil?
      end
    end
  end
end
