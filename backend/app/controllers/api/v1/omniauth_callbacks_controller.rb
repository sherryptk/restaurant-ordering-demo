class Api::V1::OmniauthCallbacksController < ApplicationController
  skip_before_action :set_restaurant, raise: false

  def google_oauth2
    auth = request.env['omniauth.auth']
    customer = Customer.from_omniauth(auth)
    token = customer.generate_jwt
    frontend_url = ENV['FRONTEND_URL'] || 'http://localhost:5174'
    redirect_to "#{frontend_url}?oauth_token=#{token}&oauth_name=#{CGI.escape(customer.name.to_s)}&oauth_email=#{CGI.escape(customer.email.to_s)}&oauth_avatar=#{CGI.escape(customer.avatar_url.to_s)}&oauth_lang=#{customer.preferred_language}", allow_other_host: true
  rescue => e
    Rails.logger.error "OmniAuth error: #{e.message}"
    redirect_to "#{ENV['FRONTEND_URL'] || 'http://localhost:5174'}?oauth_error=#{CGI.escape(e.message)}", allow_other_host: true
  end

  def failure
    redirect_to "#{ENV['FRONTEND_URL'] || 'http://localhost:5174'}?oauth_error=true", allow_other_host: true
  end
end
