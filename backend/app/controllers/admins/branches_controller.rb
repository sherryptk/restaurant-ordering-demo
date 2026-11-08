module Admins
  class BranchesController < Admins::BaseController
    include Admins::RoleEnforcement

    before_action :set_branch, only: [:update, :destroy, :menu_availability, :update_menu_availability]

    def index
      scope = current_admin.admin? ? restaurant.branches : restaurant.branches.where(id: current_admin.branch_id)
      render json: scope.map { |branch| branch_json(branch) }
    end

    def create
      branch = restaurant.branches.build(branch_params)

      if branch.save
        render json: branch_json(branch), status: :created
      else
        render json: { errors: branch.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def update
      if @branch.update(branch_params)
        render json: branch_json(@branch)
      else
        render json: { errors: @branch.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def destroy
      @branch.destroy
      head :no_content
    end

    def menu_availability
      records = @branch.menu_item_branches.index_by(&:menu_item_id)

      items = restaurant.menu_items.includes(:category).map do |item|
        mib = records[item.id]
        {
          id: item.id,
          name: item.name,
          category: item.category.name,
          default_price: item.price,
          available: mib ? mib.available : true,
          price_override: mib&.price_override
        }
      end

      render json: { items: items }
    end

    def update_menu_availability
      ActiveRecord::Base.transaction do
        Array(params[:items]).each do |item_params|
          mib = @branch.menu_item_branches.find_or_initialize_by(menu_item_id: item_params[:id])
          mib.available = item_params[:available]
          mib.price_override = item_params[:price_override].presence
          mib.save!
        end
      end

      render json: { success: true }
    rescue ActiveRecord::RecordInvalid => e
      render json: { errors: [e.message] }, status: :unprocessable_entity
    end

    private

    def permitted_action
      case action_name
      when "index", "menu_availability" then :view_branches
      else :manage_branches
      end
    end

    def set_branch
      @branch = restaurant.branches.find_by(id: params[:id])
      render json: { error: "Not found" }, status: :not_found if @branch.nil?
    end

    def branch_params
      params.require(:branch).permit(
        :name, :name_ar, :slug, :address, :city, :lat, :lng, :phone,
        :delivery_fee, :min_order_amount, :estimated_delivery_minutes, :estimated_pickup_minutes,
        :accepts_delivery, :accepts_pickup, :is_open,
        delivery_zone: [:lat, :lng],
        delivery_zones: [:id, :name, :delivery_fee, polygon: [:lat, :lng]],
        opening_hours: {},
        instapay_details: [:bank_name, :bank_name_ar, :account_number, :iban, :beneficiary_name, :currency]
      )
    end

    def branch_json(branch)
      {
        id: branch.id,
        name: branch.name,
        name_ar: branch.name_ar,
        slug: branch.slug,
        address: branch.address,
        city: branch.city,
        lat: branch.lat,
        lng: branch.lng,
        phone: branch.phone,
        delivery_fee: branch.delivery_fee,
        min_order_amount: branch.min_order_amount,
        estimated_delivery_minutes: branch.estimated_delivery_minutes,
        estimated_pickup_minutes: branch.estimated_pickup_minutes,
        accepts_delivery: branch.accepts_delivery,
        accepts_pickup: branch.accepts_pickup,
        is_open: branch.is_open,
        delivery_zone: branch.delivery_zone,
        delivery_zones: branch.delivery_zones,
        opening_hours: branch.opening_hours,
        instapay_details: branch.instapay_details,
        currently_open: branch.currently_open?
      }
    end
  end
end
