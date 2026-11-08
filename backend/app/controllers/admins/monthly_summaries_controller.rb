module Admins
  class MonthlySummariesController < Admins::BaseController
    include Admins::RoleEnforcement

    def show
      branch_id = current_admin.branch_id.presence || params[:branch_id]
      return render json: { error: "branch_id is required" }, status: :unprocessable_entity if branch_id.blank?

      month = params[:month].present? ? Date.strptime(params[:month], "%Y-%m") : Date.current

      sums = CashTransaction.where(branch_id: branch_id).in_month(month).group(:kind).sum(:amount)
      cash_sales = sums["cash_sale"] || 0
      visa_store_sales = sums["visa_store_sale"] || 0
      visa_orders_sales = sums["visa_orders_sale"] || 0
      instapay_sales = sums["instapay_sale"] || 0
      mobile_wallet_sales = sums["mobile_wallet_sale"] || 0
      total_expenses = sums["expense"] || 0
      total_revenue = cash_sales + visa_store_sales + visa_orders_sales + instapay_sales + mobile_wallet_sales

      active_employees = Employee.active.where(branch_id: branch_id).order(:name)
      employee_summaries = active_employees.map { |employee| employee.payroll_summary(month).merge(id: employee.id, name: employee.name, hourly_rate: employee.hourly_rate) }

      payroll = employee_summaries.each_with_object(
        { total_hours: 0, gross_pay: 0, advances: 0, deductions: 0, bonuses: 0, penalties: 0, net_pay: 0 }
      ) do |summary, totals|
        totals[:total_hours] += summary[:total_hours]
        totals[:gross_pay] += summary[:gross_pay]
        totals[:advances] += summary[:advances]
        totals[:deductions] += summary[:deductions]
        totals[:bonuses] += summary[:bonuses]
        totals[:penalties] += summary[:penalties]
        totals[:net_pay] += summary[:net_pay]
      end

      ledger_payments = LedgerPayment.where(branch_id: branch_id).where(date: month.beginning_of_month..month.end_of_month)

      render json: {
        month: month.strftime("%Y-%m"),
        cash: {
          cash_sales: cash_sales,
          visa_store_sales: visa_store_sales,
          visa_orders_sales: visa_orders_sales,
          instapay_sales: instapay_sales,
          mobile_wallet_sales: mobile_wallet_sales,
          total_revenue: total_revenue,
          total_expenses: total_expenses,
          net_cash_flow: total_revenue - total_expenses
        },
        payroll: payroll,
        employees: employee_summaries,
        ledger: {
          total_payments: ledger_payments.sum(:amount),
          count: ledger_payments.count
        },
        grand_total_in: total_revenue,
        grand_total_out: total_expenses + payroll[:net_pay] + ledger_payments.sum(:amount)
      }
    end

    private

    def permitted_action
      :view_monthly_summary
    end
  end
end
