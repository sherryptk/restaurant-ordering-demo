module Admins
  class DenominationCountsController < Admins::BaseController
    include Admins::RoleEnforcement

    def index
      scope = DenominationCount.includes(:branch, :admin, :denomination_lines).order(counted_at: :desc)
      scope = branch_scoped(scope)
      scope = scope.on_date(Date.parse(params[:date])) if params[:date].present?

      render json: scope.map { |count| denomination_count_json(count) }
    end

    def create
      attrs = denomination_count_params.merge(admin_id: current_admin.id)
      attrs[:branch_id] = current_admin.branch_id if current_admin.branch_id.present?
      count = DenominationCount.new(attrs)

      if count.save
        render json: denomination_count_json(count), status: :created
      else
        render json: { errors: count.errors.full_messages }, status: :unprocessable_entity
      end
    end

    private

    def permitted_action
      :manage_cash_drawer
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

    def denomination_count_params
      params.require(:denomination_count).permit(
        :branch_id, :counted_at,
        denomination_lines_attributes: [:value, :quantity]
      )
    end

    def denomination_count_json(count)
      {
        id: count.id,
        counted_at: count.counted_at,
        total: count.total,
        branch: count.branch && { id: count.branch.id, name: count.branch.name },
        submitted_by: count.admin && { id: count.admin.id, name: count.admin.name },
        denomination_lines: count.denomination_lines.map { |l| { value: l.value, quantity: l.quantity } }
      }
    end
  end
end
