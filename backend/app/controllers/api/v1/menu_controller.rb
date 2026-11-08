module Api
  module V1
    class MenuController < Api::V1::BaseController
      skip_before_action :authenticate_customer_or_guest!
      before_action :authenticate_customer_optional!

      def index
        payload = Rails.cache.fetch(menu_cache_key, expires_in: 1.hour) do
          categories = restaurant.categories.visible
                                  .includes(menu_items: [{ image_attachment: :blob }, { menu_item_options: :menu_item_choices }])

          {
            restaurant: restaurant_json,
            categories: categories.map { |category| category_json(category) },
            combo_deals: ComboDeal.active
                                   .includes(image_attachment: :blob, menu_items: { image_attachment: :blob })
                                   .order(:position).map { |combo_deal| combo_deal_json(combo_deal) }
          }
        end

        render json: decorate_for_current_customer(payload)
      end

      def show
        item = restaurant.menu_items.available
                          .includes(:image_attachment, menu_item_options: :menu_item_choices)
                          .find_by(id: params[:id])

        return render json: { error: "Not found" }, status: :not_found if item.nil?
        return render json: { error: "Not found" }, status: :not_found unless branch_availability(item)[:available]

        render json: item_detail_json(item)
      end

      private

      # The cached payload is shared across every visitor, so per-customer data
      # (favorites, "order again") is merged in fresh on each request instead
      # of living inside the cached blob.
      def decorate_for_current_customer(payload)
        return payload unless current_customer

        favorite_ids = current_customer.favorites.pluck(:menu_item_id).to_set

        categories = payload[:categories].map do |category|
          category.merge(menu_items: category[:menu_items].map { |item| item.merge(favorited: favorite_ids.include?(item[:id])) })
        end

        reorder = reorder_category(favorite_ids)
        categories = [reorder, *categories] if reorder

        payload.merge(categories: categories)
      end

      def reorder_category(favorite_ids)
        recent_item_ids = OrderItem.joins(:order)
                                    .where(orders: { customer_id: current_customer.id })
                                    .where.not(orders: { status: "cancelled" })
                                    .where.not(menu_item_id: nil)
                                    .order(Arel.sql("orders.created_at DESC"))
                                    .limit(50)
                                    .pluck(:menu_item_id)
                                    .uniq
                                    .first(10)

        return nil if recent_item_ids.empty?

        items_by_id = restaurant.menu_items.available
                                 .includes(:image_attachment)
                                 .where(id: recent_item_ids)
                                 .index_by(&:id)

        items = recent_item_ids.filter_map do |id|
          item = items_by_id[id]
          next unless item

          avail = branch_availability(item)
          next unless avail[:available]

          item_list_json(item, avail[:price]).merge(favorited: favorite_ids.include?(item.id))
        end

        return nil if items.empty?

        {
          id: "reorder",
          name: @current_locale == "en" ? "Order Again" : "اطلب مرة أخرى",
          description: nil,
          position: -1,
          menu_items: items
        }
      end

      def menu_cache_key
        version = Rails.cache.fetch(TouchesMenuCache::CACHE_VERSION_KEY) { Time.current.to_f }
        ["menu_index", "v1", restaurant.id, @current_locale, branch&.id, version].join("/")
      end

      def branch
        return @branch if defined?(@branch)

        @branch = params[:branch_id].present? ? restaurant.branches.find_by(id: params[:branch_id]) : nil
      end

      # Memoized per-request so branch-scoped requests don't issue one
      # MenuItemBranch query per item while building the menu listing.
      def branch_item_map
        return @branch_item_map if defined?(@branch_item_map)

        @branch_item_map = branch ? branch.menu_item_branches.index_by(&:menu_item_id) : {}
      end

      def branch_availability(item)
        return { available: true, price: item.price } unless branch

        mib = branch_item_map[item.id]
        return { available: true, price: item.price } if mib.nil?

        { available: mib.available, price: mib.price_override || item.price }
      end

      def restaurant_json
        {
          id: restaurant.id,
          name: localized(restaurant, :name),
          slug: restaurant.slug,
          description: localized(restaurant, :description),
          phone: restaurant.phone,
          address: restaurant.address,
          city: restaurant.city,
          delivery_fee: restaurant.delivery_fee,
          min_order_amount: restaurant.min_order_amount,
          estimated_delivery_minutes: restaurant.estimated_delivery_minutes,
          estimated_pickup_minutes: restaurant.estimated_pickup_minutes,
          accepts_delivery: restaurant.accepts_delivery,
          accepts_pickup: restaurant.accepts_pickup,
          is_open: restaurant.is_open,
          currency: restaurant.currency,
          vat_rate: restaurant.vat_rate,
          logo_url: public_url_for(restaurant.logo),
          banner_url: public_url_for(restaurant.banner)
        }
      end

      def category_json(category)
        items = category.menu_items.select(&:available).filter_map do |item|
          avail = branch_availability(item)
          next unless avail[:available]

          item_list_json(item, avail[:price])
        end

        {
          id: category.id,
          name: localized(category, :name),
          description: localized(category, :description),
          position: category.position,
          menu_items: items
        }
      end

      def item_list_json(item, price_override = nil)
        {
          id: item.id,
          name: localized(item, :name),
          description: localized(item, :description),
          price: price_override || item.price,
          compare_at_price: item.compare_at_price,
          offer_badge: item.offer_badge,
          available: item.available,
          featured: item.featured,
          tags: item.tags,
          image_url: public_url_for(item.image),
          favorited: false
        }
      end

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
          items: combo_deal.menu_items.map { |item| item_list_json(item) }
        }
      end

      def item_detail_json(item)
        favorited = current_customer && current_customer.favorites.exists?(menu_item_id: item.id)

        item_list_json(item, branch_availability(item)[:price]).merge(
          options: item.menu_item_options.map { |option| option_json(option) },
          favorited: !!favorited
        )
      end

      def option_json(option)
        {
          id: option.id,
          name: localized(option, :name),
          required: option.required,
          multi_select: option.multi_select,
          max_selections: option.max_selections,
          choices: option.menu_item_choices.select(&:available).map { |choice| choice_json(choice) }
        }
      end

      def choice_json(choice)
        {
          id: choice.id,
          label: localized(choice, :label),
          price_delta: choice.price_delta,
          available: choice.available
        }
      end
    end
  end
end
