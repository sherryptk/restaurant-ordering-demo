module Admins
  class CashTransactionsController < Admins::BaseController
    include Admins::RoleEnforcement

    before_action :set_cash_transaction, only: [:update, :destroy]

    def index
      scope = CashTransaction.includes(:branch, :admin, :items).order(occurred_at: :desc)
      scope = branch_scoped(scope)
      scope = scope.on_date(Date.parse(params[:date])) if params[:date].present?

      render json: scope.map { |transaction| cash_transaction_json(transaction) }
    end

    def daily_summary
      date = params[:date].present? ? Date.parse(params[:date]) : Date.current
      branch_id = resolved_branch_id
      return render json: { error: "branch_id is required" }, status: :unprocessable_entity if branch_id.blank?

      transactions = CashTransaction.where(branch_id: branch_id).on_date(date)
      sums = transactions.group(:kind).sum(:amount)

      # There's only ever an end-of-day count now — today's opening balance is
      # just whatever the drawer held at yesterday's (or the last recorded) close.
      closing_count = DenominationCount.where(branch_id: branch_id).on_date(date).order(:counted_at).last
      previous_closing_count = DenominationCount.where(branch_id: branch_id)
        .where("counted_at < ?", date.beginning_of_day)
        .order(:counted_at).last

      cash_sales = sums["cash_sale"] || 0
      total_expenses = sums["expense"] || 0
      expected_cash = previous_closing_count.present? ? previous_closing_count.total + cash_sales - total_expenses : nil
      discrepancy = (expected_cash.present? && closing_count.present?) ? closing_count.total - expected_cash : nil

      render json: {
        date: date,
        cash_sales: cash_sales,
        visa_store_sales: sums["visa_store_sale"] || 0,
        visa_orders_sales: sums["visa_orders_sale"] || 0,
        instapay_sales: sums["instapay_sale"] || 0,
        mobile_wallet_sales: sums["mobile_wallet_sale"] || 0,
        total_expenses: total_expenses,
        previous_closing_count: previous_closing_count && denomination_count_json(previous_closing_count),
        closing_count: closing_count && denomination_count_json(closing_count),
        expected_cash: expected_cash,
        discrepancy: discrepancy
      }
    end

    def create
      attrs = cash_transaction_params.merge(admin_id: current_admin.id)
      attrs[:branch_id] = current_admin.branch_id if current_admin.branch_id.present?
      transaction = CashTransaction.new(attrs)

      if transaction.save
        render json: cash_transaction_json(transaction), status: :created
      else
        render json: { errors: transaction.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def update
      attrs = cash_transaction_params
      attrs = attrs.except(:branch_id) if current_admin.branch_id.present?

      if @cash_transaction.update(attrs)
        render json: cash_transaction_json(@cash_transaction)
      else
        render json: { errors: @cash_transaction.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def destroy
      @cash_transaction.destroy
      head :no_content
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

    def resolved_branch_id
      current_admin.branch_id.presence || params[:branch_id]
    end

    def set_cash_transaction
      @cash_transaction = CashTransaction.find_by(id: params[:id])
      return render json: { error: "Not found" }, status: :not_found if @cash_transaction.nil?

      if current_admin.branch_id.present? && @cash_transaction.branch_id != current_admin.branch_id
        render json: { error: "Forbidden" }, status: :forbidden
      end
    end

    def cash_transaction_params
      params.require(:cash_transaction).permit(
        :branch_id, :kind, :amount, :category, :note, :occurred_at,
        items_attributes: [:id, :menu_item_id, :item_name_snapshot, :unit_price_snapshot, :quantity, :_destroy]
      )
    end

    def cash_transaction_json(transaction)
      {
        id: transaction.id,
        kind: transaction.kind,
        amount: transaction.amount,
        category: transaction.category,
        note: transaction.note,
        occurred_at: transaction.occurred_at,
        branch: transaction.branch && { id: transaction.branch.id, name: transaction.branch.name },
        submitted_by: transaction.admin && { id: transaction.admin.id, name: transaction.admin.name },
        items: transaction.items.map { |item| cash_transaction_item_json(item) }
      }
    end

    def cash_transaction_item_json(item)
      {
        id: item.id,
        menu_item_id: item.menu_item_id,
        item_name_snapshot: item.item_name_snapshot,
        unit_price_snapshot: item.unit_price_snapshot,
        quantity: item.quantity,
        line_total: item.line_total
      }
    end

    def denomination_count_json(count)
      {
        id: count.id,
        counted_at: count.counted_at,
        total: count.total
      }
    end
  end
end
