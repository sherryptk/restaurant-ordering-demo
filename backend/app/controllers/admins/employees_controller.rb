module Admins
  class EmployeesController < Admins::BaseController
    include Admins::RoleEnforcement

    before_action :set_employee, only: [:update, :destroy, :payroll_summary]

    def index
      scope = Employee.includes(:branch).order(:name)
      scope = branch_scoped(scope)
      render json: scope.map { |employee| employee_json(employee) }
    end

    def create
      employee = Employee.new(employee_params)

      if employee.save
        render json: employee_json(employee), status: :created
      else
        render json: { errors: employee.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def update
      if @employee.update(employee_params)
        render json: employee_json(@employee)
      else
        render json: { errors: @employee.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def destroy
      @employee.destroy
      head :no_content
    end

    def payroll_summary
      month = params[:month].present? ? Date.strptime(params[:month], "%Y-%m") : Date.current
      render json: @employee.payroll_summary(month)
    end

    private

    def permitted_action
      case action_name
      when "index", "payroll_summary" then :view_employees
      else :manage_employees
      end
    end

    def branch_scoped(scope)
      if current_admin.branch_id.present?
        scope.where(branch_id: current_admin.branch_id)
      elsif params[:branch_id].present?
        scope.where(branch_id: params[:branch_id])
      else
        scope
      end
    end

    def set_employee
      @employee = Employee.find_by(id: params[:id])
      return render json: { error: "Not found" }, status: :not_found if @employee.nil?

      if current_admin.branch_id.present? && @employee.branch_id != current_admin.branch_id
        render json: { error: "Forbidden" }, status: :forbidden
      end
    end

    def employee_params
      params.require(:employee).permit(:name, :name_ar, :hourly_rate, :branch_id, :active)
    end

    def employee_json(employee)
      {
        id: employee.id,
        name: employee.name,
        name_ar: employee.name_ar,
        hourly_rate: employee.hourly_rate,
        active: employee.active,
        branch: employee.branch && { id: employee.branch.id, name: employee.branch.name }
      }
    end
  end
end
