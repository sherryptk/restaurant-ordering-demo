module Api
  module V1
    class ComboDealsController < Api::V1::BaseController
      skip_before_action :authenticate_customer_or_guest!

      def index
        combo_deals = ComboDeal.active.includes(:menu_items).order(:position)
        render json: combo_deals.map { |combo_deal| combo_deal_json(combo_deal) }
      end

      private

      def combo_deal_json(combo_deal)
        {
          id: combo_deal.id,
          name: localized(combo_deal, :name),
          description: localized(combo_deal, :description),
          discount_type: combo_deal.discount_type,
          discount_value: combo_deal.discount_value,
          original_price: combo_deal.original_price,
          discounted_price: combo_deal.discounted_price,
          discount_amount: combo_deal.discount_amount,
          image_url: public_url_for(combo_deal.image),
          items: combo_deal.menu_items.map { |item| item_json(item) }
        }
      end

      def item_json(item)
        {
          id: item.id,
          name: localized(item, :name),
          price: item.price,
          image_url: public_url_for(item.image)
        }
      end
    end
  end
end
