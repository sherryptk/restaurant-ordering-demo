class Customer < ApplicationRecord
  include Devise::JWT::RevocationStrategies::JTIMatcher

  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable, :trackable and :omniauthable
  devise :database_authenticatable, :registerable,
         :recoverable, :validatable,
         :jwt_authenticatable, jwt_revocation_strategy: self

  has_many :addresses, dependent: :destroy
  has_many :phones, dependent: :destroy
  has_many :orders, dependent: :nullify
  has_many :favorites, dependent: :destroy
  has_many :favorite_menu_items, through: :favorites, source: :menu_item

  validates :name, presence: true
  validates :preferred_language, inclusion: { in: %w[ar en] }

  def password_required?
    provider.blank? ? super : false
  end

  def self.from_omniauth(auth)
    customer = where(provider: auth.provider, uid: auth.uid).first_or_initialize
    customer.email = auth.info.email
    customer.name = auth.info.name
    customer.avatar_url = auth.info.image
    if customer.new_record?
      customer.password = Devise.friendly_token[0, 20]
      customer.jti = SecureRandom.uuid
    end
    customer.save!
    customer
  end

  def generate_jwt
    JWT.encode(
      { sub: id, jti: jti, scp: 'customer', iat: Time.current.to_i },
      Rails.application.credentials.secret_key_base || ENV['JWT_SECRET'],
      'HS256'
    )
  end
end
