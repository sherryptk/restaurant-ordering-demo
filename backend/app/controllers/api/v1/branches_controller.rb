module Api
  module V1
    class BranchesController < Api::V1::BaseController
      skip_before_action :authenticate_customer_or_guest!

      def index
        render json: restaurant.branches.open.map { |branch| branch_json(branch) }
      end

      def find_by_location
        branch = restaurant.branches.open.find { |b| b.contains_point?(params[:lat], params[:lng]) }

        if branch
          zone = branch.zone_for_point(params[:lat], params[:lng])
          render json: {
            branch: branch_json(branch),
            zone: {
              id: zone["id"],
              name: zone["name"],
              delivery_fee: zone["delivery_fee"]
            }
          }
        else
          render json: { branch: nil, zone: nil, error: "No delivery coverage for this location" }
        end
      end

      private

      def branch_json(branch)
        {
          id: branch.id,
          name: localized(branch, :name),
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
          currently_open: branch.currently_open?,
          opening_hours: branch.opening_hours
        }
      end
    end
  end
end
