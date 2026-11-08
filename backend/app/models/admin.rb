class Admin < ApplicationRecord
  include Devise::JWT::RevocationStrategies::JTIMatcher

  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable, :trackable and :omniauthable
  devise :database_authenticatable, :registerable,
         :recoverable, :validatable,
         :jwt_authenticatable, jwt_revocation_strategy: self

  belongs_to :restaurant, optional: true
  belongs_to :branch, optional: true
  has_many :assigned_orders, class_name: "Order", foreign_key: "driver_id"

  enum :role, { operator: 0, admin: 1, driver: 2 }

  validates :email, presence: true, uniqueness: true

  PERMISSIONS = {
    admin: [:all],
    operator: [
      :view_orders, :update_order_status, :update_payment_status, :assign_driver, :update_estimated_time,
      :view_menu, :toggle_item_availability, :bulk_update_menu_prices, :view_settings, :view_branches, :manage_cash_drawer,
      :view_employees, :manage_timesheets
    ],
    driver: [:view_assigned_orders, :mark_delivered, :update_estimated_time]
  }.freeze

  def can?(action)
    return true if role == "admin"

    PERMISSIONS[role.to_sym]&.include?(action) || false
  end
end
