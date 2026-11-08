module Admins
  class LedgerPaymentsController < Admins::BaseController
    include Admins::RoleEnforcement

    before_action :set_ledger_payment, only: [:update, :destroy]

    def index
      scope = LedgerPayment.includes(:branch, :admin).order(date: :desc)

      if current_admin.branch_id.present?
        scope = scope.where(branch_id: current_admin.branch_id)
      elsif params[:branch_id].present?
        scope = scope.where(branch_id: params[:branch_id])
      end

      render json: scope.map { |payment| ledger_payment_json(payment) }
    end

    def create
      attrs = ledger_payment_params.merge(admin_id: current_admin.id)
      attrs[:branch_id] = current_admin.branch_id if current_admin.branch_id.present?
      payment = LedgerPayment.new(attrs)

      if payment.save
        render json: ledger_payment_json(payment), status: :created
      else
        render json: { errors: payment.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def update
      if @ledger_payment.update(ledger_payment_params)
        render json: ledger_payment_json(@ledger_payment)
      else
        render json: { errors: @ledger_payment.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def destroy
      @ledger_payment.destroy
      head :no_content
    end

    private

    def permitted_action
      :manage_ledger
    end

    def set_ledger_payment
      @ledger_payment = LedgerPayment.find_by(id: params[:id])
      render json: { error: "Not found" }, status: :not_found if @ledger_payment.nil?
    end

    def ledger_payment_params
      params.require(:ledger_payment).permit(:branch_id, :date, :payee_name, :amount, :note)
    end

    def ledger_payment_json(payment)
      {
        id: payment.id,
        date: payment.date,
        payee_name: payment.payee_name,
        amount: payment.amount,
        note: payment.note,
        branch: payment.branch && { id: payment.branch.id, name: payment.branch.name }
      }
    end
  end
end
