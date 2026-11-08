module Admins
  class TimesheetAdjustmentsController < Admins::BaseController
    include Admins::RoleEnforcement

    def create
      employee = Employee.find_by(id: params[:employee_id])
      return render json: { error: "Not found" }, status: :not_found if employee.nil?
      return render json: { error: "Forbidden" }, status: :forbidden unless employee_in_scope?(employee)

      adjustment = employee.timesheet_adjustments.new(adjustment_params)

      if adjustment.save
        render json: adjustment_json(adjustment), status: :created
      else
        render json: { errors: adjustment.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def destroy
      adjustment = TimesheetAdjustment.find_by(id: params[:id], employee_id: params[:employee_id])
      return render json: { error: "Not found" }, status: :not_found if adjustment.nil?
      return render json: { error: "Forbidden" }, status: :forbidden unless employee_in_scope?(adjustment.employee)

      adjustment.destroy
      head :no_content
    end

    private

    def permitted_action
      :manage_timesheets
    end

    def employee_in_scope?(employee)
      current_admin.branch_id.blank? || employee.branch_id == current_admin.branch_id
    end

    def adjustment_params
      params.require(:timesheet_adjustment).permit(:date, :amount, :adjustment_type, :note)
    end

    def adjustment_json(adjustment)
      {
        id: adjustment.id,
        employee_id: adjustment.employee_id,
        date: adjustment.date,
        amount: adjustment.amount,
        adjustment_type: adjustment.adjustment_type,
        note: adjustment.note
      }
    end
  end
end
