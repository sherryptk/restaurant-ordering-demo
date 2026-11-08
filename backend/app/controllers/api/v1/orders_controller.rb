module Api
  module V1
    class OrdersController < Api::V1::BaseController
      before_action :require_customer!, only: [:index]

      def index
        pagy, orders = pagy(current_customer.orders.order(created_at: :desc))
        render json: { orders: orders.map { |order| order_json(order) }, meta: pagy_metadata(pagy) }
      end

      def show
        order = find_customer_order(params[:id])
        return render json: { error: "Not found" }, status: :not_found if order.nil?

        render json: order_json(order)
      end

      def payment_proof
        order = find_customer_order(params[:id])
        return render json: { error: "Not found" }, status: :not_found if order.nil?
        return render json: { errors: ["Only InstaPay orders accept a payment proof"] }, status: :unprocessable_entity unless order.instapay?
        return render json: { errors: ["Payment proof file is required"] }, status: :unprocessable_entity if params[:payment_proof].blank?

        attach_resized(order.payment_proof, params[:payment_proof])
        order.broadcast_payment_proof_uploaded
        render json: order_json(order)
      end

      def create
        order = Order.new(order_params)
        order.customer = current_customer if current_customer

        if order.branch_id.present?
          if order.branch.nil?
            return render json: { errors: ["Branch not found"] }, status: :unprocessable_entity
          elsif !order.branch.is_open
            return render json: { errors: ["Selected branch is currently closed"] }, status: :unprocessable_entity
          elsif !order.branch.currently_open?
            return render json: { error: "This branch is currently closed. Please try again during opening hours." }, status: :unprocessable_entity
          end
        end

        item_errors = build_order_items(order)
        return render json: { errors: item_errors }, status: :unprocessable_entity if item_errors.any?

        apply_promo_code(order)
        apply_combo_deal(order)

        if order.save
          record_promo_code_usage(order)
          payment_result = handle_payment(order)
          render json: { order: order_json(order), payment: payment_result }, status: :created
        else
          render json: { errors: order.errors.full_messages }, status: :unprocessable_entity
        end
      end

      private

      def find_customer_order(id)
        if current_customer
          current_customer.orders.find_by(id: id)
        else
          return nil if params[:guest_phone].blank?

          Order.find_by(id: id, guest_phone: params[:guest_phone])
        end
      end

      def apply_promo_code(order)
        return if params[:promo_code].blank?

        promo_code = PromoCode.find_by("LOWER(code) = ?", params[:promo_code].to_s.downcase)
        return unless promo_code

        result = promo_code.valid_for_use?(customer: current_customer, phone: order.guest_phone)
        return unless result[:valid]

        # Force order_items through their own before_validation now (same trick
        # calculate_totals uses) so line_total is populated and the discount is
        # computed against the real subtotal, not nil.
        order.order_items.each { |item| item.valid? if item.new_record? }
        subtotal = order.order_items.to_a.sum { |item| item.line_total || 0 }

        order.promo_code = promo_code
        order.discount_amount = promo_code.discount_amount(subtotal)
      end

      def apply_combo_deal(order)
        return if params[:combo_deal_id].blank?

        combo_deal = ComboDeal.active.find_by(id: params[:combo_deal_id])
        return unless combo_deal

        cart_item_ids = Array(params[:items]).map { |item_params| item_params[:menu_item_id] }
        return unless combo_deal.applies_to_cart?(cart_item_ids)

        order.combo_deal = combo_deal
        order.combo_discount_amount = combo_deal.discount_amount
      end

      def record_promo_code_usage(order)
        return unless order.promo_code

        PromoCodeUsage.create!(
          promo_code: order.promo_code,
          customer_id: current_customer&.id,
          guest_phone: order.guest_phone,
          order_id: order.id
        )
      end

      # Builds the order lines and returns any validation errors. The client's choice ids are never
      # trusted: each must belong to this item's own options (otherwise a cheap/negative price_delta
      # from another item could be smuggled in), be available, and satisfy required / max-selection rules.
      def build_order_items(order)
        errors = []

        Array(params[:items]).each do |item_params|
          menu_item = MenuItem.find_by(id: item_params[:menu_item_id])
          next unless menu_item

          choices, item_errors = resolve_choices(menu_item, Array(item_params[:choices]))
          errors.concat(item_errors)

          order.order_items.build(
            menu_item: menu_item,
            quantity: item_params[:quantity] || 1,
            choices_snapshot: choices
          )
        end

        errors
      end

      def resolve_choices(menu_item, choice_ids)
        options = menu_item.menu_item_options.includes(:menu_item_choices).to_a
        wanted = choice_ids.map(&:to_s).uniq
        errors = []
        snapshot = []

        options.each do |option|
          picked = option.menu_item_choices.select { |choice| wanted.include?(choice.id.to_s) }
          unavailable = picked.reject(&:available)
          errors << "#{menu_item.name}: \"#{unavailable.first.label}\" is no longer available" if unavailable.any?

          if option.required && option.menu_item_choices.none?(&:available)
            errors << "#{menu_item.name}: \"#{option.name}\" has no available choices right now"
          elsif option.required && picked.empty?
            errors << "#{menu_item.name}: please choose \"#{option.name}\""
          end
          errors << "#{menu_item.name}: choose only one for \"#{option.name}\"" if !option.multi_select && picked.size > 1
          if option.multi_select && option.max_selections && picked.size > option.max_selections
            errors << "#{menu_item.name}: choose at most #{option.max_selections} for \"#{option.name}\""
          end

          picked.each do |choice|
            snapshot << { "label" => choice.label, "label_ar" => choice.label_ar, "price_delta" => choice.price_delta.to_f }
          end
        end

        known = options.flat_map { |option| option.menu_item_choices.map { |choice| choice.id.to_s } }
        errors << "#{menu_item.name}: invalid choice selected" if (wanted - known).any?

        [snapshot, errors]
      end

      def handle_payment(order)
        return_url = "#{request.base_url}/orders/#{order.id}"

        if order.instapay?
          Payments::InstapayAdapter.new.initiate(order: order, return_url: return_url)
        else
          restaurant.payment_adapter.initiate(order: order, return_url: return_url)
        end
      end

      def order_params
        params.require(:order).permit(
          :order_type, :payment_method, :notes, :scheduled_at, :branch_id,
          :delivery_zone_id, :delivery_zone_name, :delivery_zone_fee,
          :guest_name, :guest_email, :guest_phone,
          delivery_address: {}
        )
      end

      def order_json(order)
        {
          id: order.id,
          order_number: order.order_number,
          order_type: order.order_type,
          status: order.status,
          payment_method: order.payment_method,
          payment_status: order.payment_status,
          payment_reference: order.payment_reference,
          payment_proof_url: public_url_for(order.payment_proof),
          subtotal: order.subtotal,
          tax_amount: order.tax_amount,
          delivery_fee: order.delivery_fee,
          discount_amount: order.discount_amount,
          promo_code: order.promo_code && {
            code: order.promo_code.code,
            discount_type: order.promo_code.discount_type,
            value: order.promo_code.value
          },
          combo_discount_amount: order.combo_discount_amount,
          combo_deal: order.combo_deal && {
            id: order.combo_deal.id,
            name: order.combo_deal.name,
            discount_type: order.combo_deal.discount_type,
            discount_value: order.combo_deal.discount_value
          },
          total: order.total,
          guest_name: order.guest_name,
          guest_email: order.guest_email,
          guest_phone: order.guest_phone,
          delivery_address: order.delivery_address,
          notes: order.notes,
          scheduled_at: order.scheduled_at,
          created_at: order.created_at,
          estimated_ready_at: order.estimated_ready_at,
          branch: order.branch && { id: order.branch.id, name: order.branch.name },
          instapay_details: order.instapay? ? order.branch&.instapay_details.presence : nil,
          items: order.order_items.map { |item| order_item_json(item) }
        }
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
end
