module Admins
  class UsersController < Admins::BaseController
    include Admins::RoleEnforcement

    before_action :set_admin_user, only: [:update, :destroy, :reset_password]

    def index
      admins = Admin.includes(:branch).order(:created_at)
      render json: admins.map { |admin| admin_json(admin) }
    end

    def create
      admin = Admin.new(user_params)

      if admin.save
        render json: admin_json(admin), status: :created
      else
        render json: { errors: admin.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def update
      if @admin_user.update(user_params.except(:password))
        render json: admin_json(@admin_user)
      else
        render json: { errors: @admin_user.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def destroy
      if @admin_user.id == current_admin.id
        return render json: { error: "You can't delete your own account" }, status: :unprocessable_entity
      end

      @admin_user.destroy
      head :no_content
    end

    def reset_password
      temporary_password = SecureRandom.hex(6)

      if @admin_user.update(password: temporary_password, password_confirmation: temporary_password)
        render json: { temporary_password: temporary_password }
      else
        render json: { errors: @admin_user.errors.full_messages }, status: :unprocessable_entity
      end
    end

    private

    def permitted_action
      :manage_users
    end

    def set_admin_user
      @admin_user = Admin.find_by(id: params[:id])
      render json: { error: "Not found" }, status: :not_found if @admin_user.nil?
    end

    def user_params
      params.require(:admin).permit(:name, :email, :phone, :password, :role, :branch_id)
    end

    def admin_json(admin)
      {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        role: admin.role,
        branch_id: admin.branch_id,
        branch_name: admin.branch&.name,
        created_at: admin.created_at,
        assigned_order_count: admin.driver? ? admin.assigned_orders.count : nil
      }
    end
  end
end
