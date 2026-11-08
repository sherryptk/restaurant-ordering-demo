module Api
  module V1
    class AddressesController < Api::V1::BaseController
      before_action :require_customer!
      before_action :set_address, only: [:update, :destroy]

      def index
        render json: current_customer.addresses.map { |address| address_json(address) }
      end

      def create
        address = current_customer.addresses.build(address_params)

        if address.save
          render json: address_json(address), status: :created
        else
          render json: { errors: address.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        if @address.update(address_params)
          render json: address_json(@address)
        else
          render json: { errors: @address.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        @address.destroy
        head :no_content
      end

      private

      def set_address
        @address = current_customer.addresses.find_by(id: params[:id])
        render json: { error: "Not found" }, status: :not_found if @address.nil?
      end

      def address_params
        params.require(:address).permit(
          :label, :street, :district, :city, :building, :floor,
          :apartment, :notes, :lat, :lng, :is_default
        )
      end

      def address_json(address)
        {
          id: address.id,
          label: address.label,
          street: address.street,
          district: address.district,
          city: address.city,
          building: address.building,
          floor: address.floor,
          apartment: address.apartment,
          notes: address.notes,
          lat: address.lat,
          lng: address.lng,
          is_default: address.is_default
        }
      end
    end
  end
end
