module Api
  module V1
    class CartController < Api::V1::BaseController
      skip_before_action :authenticate_customer_or_guest!

      def check_combos
        cart_item_ids = Array(params[:menu_item_ids])
        qualifying_deals = ComboDeal.active.includes(:menu_items).select { |combo_deal| combo_deal.applies_to_cart?(cart_item_ids) }
        best_combo = qualifying_deals.max_by(&:discount_amount)

        render json: {
          combo_deals: qualifying_deals.map { |combo_deal| combo_deal_json(combo_deal) },
          best_combo: best_combo && combo_deal_json(best_combo)
        }
      end

      private

      def combo_deal_json(combo_deal)
        {
          id: combo_deal.id,
          name: combo_deal.name,
          discount_type: combo_deal.discount_type,
          discount_value: combo_deal.discount_value,
          original_price: combo_deal.original_price,
          discounted_price: combo_deal.discounted_price,
          discount_amount: combo_deal.discount_amount
        }
      end
    end
  end
end
