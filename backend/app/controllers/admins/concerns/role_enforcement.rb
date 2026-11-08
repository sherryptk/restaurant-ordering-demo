module Admins::RoleEnforcement
  extend ActiveSupport::Concern
  included do
    before_action :enforce_role!
  end

  private

  def enforce_role!(action = nil)
    action ||= permitted_action
    unless current_admin&.can?(action)
      render json: { error: "Forbidden", required_role: action }, status: :forbidden
    end
  end

  def permitted_action
    raise NotImplementedError, "Each controller must define permitted_action"
  end
end
