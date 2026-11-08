module Api
  module V1
    class FavoritesController < Api::V1::BaseController
      before_action :require_customer!

      def index
        items = current_customer.favorite_menu_items
                                 .includes(:image_attachment)
                                 .merge(MenuItem.order(:name))

        render json: items.map { |item| item_json(item) }
      end

      def create
        menu_item = restaurant.menu_items.find_by(id: params[:menu_item_id])
        return render json: { error: "Not found" }, status: :not_found if menu_item.nil?

        current_customer.favorites.find_or_create_by!(menu_item: menu_item)
        render json: { favorited: true }
      end

      def destroy
        current_customer.favorites.where(menu_item_id: params[:menu_item_id]).destroy_all
        render json: { favorited: false }
      end

      private

      def item_json(item)
        {
          id: item.id,
          name: localized(item, :name),
          description: localized(item, :description),
          price: item.price,
          compare_at_price: item.compare_at_price,
          offer_badge: item.offer_badge,
          available: item.available,
          featured: item.featured,
          tags: item.tags,
          image_url: public_url_for(item.image),
          favorited: true
        }
      end
    end
  end
end
