module Api
  module V1
    class PhonesController < Api::V1::BaseController
      before_action :require_customer!
      before_action :set_phone, only: [:destroy]

      def index
        render json: current_customer.phones.map { |phone| phone_json(phone) }
      end

      def create
        phone = current_customer.phones.build(phone_params)

        if phone.save
          render json: phone_json(phone), status: :created
        else
          render json: { errors: phone.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        @phone.destroy
        head :no_content
      end

      private

      def set_phone
        @phone = current_customer.phones.find_by(id: params[:id])
        render json: { error: "Not found" }, status: :not_found if @phone.nil?
      end

      def phone_params
        params.require(:phone).permit(:number, :is_default)
      end

      def phone_json(phone)
        {
          id: phone.id,
          number: phone.number,
          is_default: phone.is_default
        }
      end
    end
  end
end
