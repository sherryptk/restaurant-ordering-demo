module Admins
  class ComboDealsController < Admins::BaseController
    include Admins::RoleEnforcement

    before_action :set_combo_deal, only: [:update, :destroy, :toggle]

    def index
      combo_deals = ComboDeal.order(:position).includes(image_attachment: :blob, menu_items: [])
      render json: combo_deals.map { |combo_deal| combo_deal_json(combo_deal) }
    end

    def create
      combo_deal = ComboDeal.new(combo_deal_params)
      combo_deal.menu_item_ids = combo_menu_item_ids
      attach_resized(combo_deal.image, params[:image])

      if combo_deal.save
        render json: combo_deal_json(combo_deal), status: :created
      else
        render json: { errors: combo_deal.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def update
      @combo_deal.menu_item_ids = combo_menu_item_ids if params[:menu_item_ids].present?
      attach_resized(@combo_deal.image, params[:image])

      if @combo_deal.update(combo_deal_params)
        render json: combo_deal_json(@combo_deal)
      else
        render json: { errors: @combo_deal.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def destroy
      @combo_deal.destroy
      head :no_content
    end

    def toggle
      @combo_deal.update(active: !@combo_deal.active)
      render json: combo_deal_json(@combo_deal)
    end

    private

    def permitted_action
      :manage_combo_deals
    end

    def set_combo_deal
      @combo_deal = ComboDeal.find_by(id: params[:id])
      render json: { error: "Not found" }, status: :not_found if @combo_deal.nil?
    end

    def combo_menu_item_ids
      Array(params[:menu_item_ids]).map(&:to_i)
    end

    def combo_deal_params
      params.require(:combo_deal).permit(:name, :name_ar, :description, :description_ar, :discount_type, :discount_value, :active, :position)
    end

    def combo_deal_json(combo_deal)
      {
        id: combo_deal.id,
        name: combo_deal.name,
        name_ar: combo_deal.name_ar,
        description: combo_deal.description,
        description_ar: combo_deal.description_ar,
        discount_type: combo_deal.discount_type,
        discount_value: combo_deal.discount_value,
        active: combo_deal.active,
        position: combo_deal.position,
        original_price: combo_deal.original_price,
        discounted_price: combo_deal.discounted_price,
        discount_amount: combo_deal.discount_amount,
        image_url: public_url_for(combo_deal.image),
        items: combo_deal.menu_items.map { |item| { id: item.id, name: item.name, price: item.price } },
        usage_count: Order.where(combo_deal_id: combo_deal.id).count
      }
    end
  end
end
