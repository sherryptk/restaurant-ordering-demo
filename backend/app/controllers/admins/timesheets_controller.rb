module Admins
  class TimesheetsController < Admins::BaseController
    include Admins::RoleEnforcement

    def index
      scope = Timesheet.includes(employee: :branch)
      scope = branch_scoped(scope)
      scope = scope.where(employee_id: params[:employee_id]) if params[:employee_id].present?

      if params[:month].present?
        month = Date.strptime(params[:month], "%Y-%m")
        scope = scope.where(date: month.beginning_of_month..month.end_of_month)
      end

      render json: scope.order(:date).map { |timesheet| timesheet_json(timesheet) }
    end

    def create
      employee = Employee.find_by(id: timesheet_params[:employee_id])
      return render json: { error: "Not found" }, status: :not_found if employee.nil?
      return render json: { error: "Forbidden" }, status: :forbidden unless employee_in_scope?(employee)

      timesheet = Timesheet.find_or_initialize_by(employee_id: employee.id, date: timesheet_params[:date])
      timesheet.assign_attributes(timesheet_params.except(:employee_id, :date))

      if timesheet.save
        render json: timesheet_json(timesheet), status: :created
      else
        render json: { errors: timesheet.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def update
      timesheet = Timesheet.includes(:employee).find_by(id: params[:id])
      return render json: { error: "Not found" }, status: :not_found if timesheet.nil?
      return render json: { error: "Forbidden" }, status: :forbidden unless employee_in_scope?(timesheet.employee)

      if timesheet.update(timesheet_params.except(:employee_id, :date))
        render json: timesheet_json(timesheet)
      else
        render json: { errors: timesheet.errors.full_messages }, status: :unprocessable_entity
      end
    end

    private

    def permitted_action
      :manage_timesheets
    end

    def branch_scoped(scope)
      current_admin.branch_id.present? ? scope.where(employees: { branch_id: current_admin.branch_id }) : scope
    end

    def employee_in_scope?(employee)
      current_admin.branch_id.blank? || employee.branch_id == current_admin.branch_id
    end

    def timesheet_params
      params.require(:timesheet).permit(:employee_id, :date, :hours_worked, :day_off, :note)
    end

    def timesheet_json(timesheet)
      {
        id: timesheet.id,
        employee_id: timesheet.employee_id,
        date: timesheet.date,
        hours_worked: timesheet.hours_worked,
        day_off: timesheet.day_off,
        note: timesheet.note
      }
    end
  end
end
