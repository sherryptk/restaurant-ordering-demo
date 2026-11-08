module Admins
  class OrdersController < Admins::BaseController
    include Admins::RoleEnforcement

    before_action :set_order, only: [:show, :update_status, :update_payment_status, :assign_driver, :update_estimated_time]

    def index
      scope = Order.includes(:customer, :order_items, :driver, :branch).order(created_at: :desc)
      scope = scope.where(driver_id: current_admin.id) if current_admin.driver?
      scope = scope.where(status: params[:status]) if params[:status].present?
      scope = scope.where(driver_id: params[:driver_id]) if params[:driver_id].present?

      if params[:driver_name].present?
        scope = scope.joins(:driver).where("admins.name ILIKE ?", "%#{params[:driver_name]}%")
      end

      if params[:date].present?
        date = Date.parse(params[:date])
        scope = scope.where(created_at: date.beginning_of_day..date.end_of_day)
      end

      if current_admin.branch_id.present?
        scope = scope.where(branch_id: current_admin.branch_id)
      elsif params[:branch_id].present?
        scope = scope.where(branch_id: params[:branch_id])
      end

      pagy, orders = pagy(scope)

      render json: {
        orders: orders.map { |order| order_json(order) },
        meta: { total_count: pagy.count, total_pages: pagy.pages }
      }
    end

    def show
      if current_admin.driver? && @order.driver_id != current_admin.id
        return render json: { error: "Forbidden" }, status: :forbidden
      end

      render json: order_json(@order)
    end

    def update_status
      if current_admin.driver?
        valid_transition = @order.driver_id == current_admin.id &&
                            @order.status == "out_for_delivery" &&
                            params[:status] == "delivered"

        return render json: { error: "Forbidden" }, status: :forbidden unless valid_transition
      end

      if @order.update(status: params[:status])
        render json: order_json(@order)
      else
        render json: { errors: @order.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def update_payment_status
      unless Order.payment_statuses.key?(params[:payment_status].to_s)
        return render json: { errors: ["Invalid payment status"] }, status: :unprocessable_entity
      end

      if @order.update(payment_status: params[:payment_status])
        render json: order_json(@order)
      else
        render json: { errors: @order.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def assign_driver
      driver = Admin.driver.find_by(id: params[:driver_id])
      return render json: { error: "Driver not found" }, status: :unprocessable_entity if driver.nil?

      if @order.update(driver_id: driver.id, driver_notes: params[:driver_notes])
        # TelegramService.send_message("🛵 Order #{@order.order_number} assigned to #{driver.name}")  # disabled for now — re-enable when ready
        render json: order_json(@order)
      else
        render json: { errors: @order.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def update_estimated_time
      if current_admin.driver? && @order.driver_id != current_admin.id
        return render json: { error: "Forbidden" }, status: :forbidden
      end

      minutes = params[:minutes].to_i

      if @order.update(estimated_ready_at: Time.current + minutes.minutes)
        render json: order_json(@order)
      else
        render json: { errors: @order.errors.full_messages }, status: :unprocessable_entity
      end
    end

    private

    def permitted_action
      case action_name
      when "index", "show" then current_admin&.driver? ? :view_assigned_orders : :view_orders
      when "update_status" then current_admin&.driver? ? :mark_delivered : :update_order_status
      when "update_payment_status" then :update_payment_status
      when "assign_driver" then :assign_driver
      when "update_estimated_time" then :update_estimated_time
      end
    end

    def set_order
      @order = Order.find_by(id: params[:id])
      render json: { error: "Not found" }, status: :not_found if @order.nil?
    end

    def order_json(order)
      {
        id: order.id,
        order_number: order.order_number,
        customer: order.customer && {
          id: order.customer.id,
          name: order.customer.name,
          email: order.customer.email
        },
        order_type: order.order_type,
        status: order.status,
        payment_method: order.payment_method,
        payment_status: order.payment_status,
        payment_reference: order.payment_reference,
        payment_proof_url: public_url_for(order.payment_proof),
        subtotal: order.subtotal,
        tax_amount: order.tax_amount,
        delivery_fee: order.delivery_fee,
        delivery_zone_id: order.delivery_zone_id,
        delivery_zone_name: order.delivery_zone_name,
        delivery_zone_fee: order.delivery_zone_fee,
        discount_amount: order.discount_amount,
        total: order.total,
        guest_name: order.guest_name,
        guest_email: order.guest_email,
        guest_phone: order.guest_phone,
        delivery_address: order.delivery_address,
        notes: order.notes,
        scheduled_at: order.scheduled_at,
        created_at: order.created_at,
        driver_id: order.driver_id,
        driver_notes: order.driver_notes,
        driver: order.driver && {
          id: order.driver.id,
          name: order.driver.name,
          role: order.driver.role
        },
        branch: order.branch && {
          id: order.branch.id,
          name: order.branch.name,
          estimated_pickup_minutes: order.branch.estimated_pickup_minutes,
          estimated_delivery_minutes: order.branch.estimated_delivery_minutes
        },
        instapay_details: order.instapay? ? order.branch&.instapay_details.presence : nil,
        estimated_ready_at: order.estimated_ready_at,
        estimated_minutes_remaining: estimated_minutes_remaining(order),
        items: order.order_items.map { |item| order_item_json(item) }
      }
    end

    def estimated_minutes_remaining(order)
      return nil if order.estimated_ready_at.blank?

      remaining = ((order.estimated_ready_at - Time.current) / 60).round
      remaining.positive? ? remaining : nil
    end

    def order_item_json(item)
      {
        id: item.id,
        menu_item_id: item.menu_item_id,
        item_name_snapshot: item.item_name_snapshot,
        item_name_ar_snapshot: item.item_name_ar_snapshot,
        unit_price_snapshot: item.unit_price_snapshot,
        quantity: item.quantity,
        choices_snapshot: item.choices_snapshot,
        line_total: item.line_total
      }
    end
  end
end
