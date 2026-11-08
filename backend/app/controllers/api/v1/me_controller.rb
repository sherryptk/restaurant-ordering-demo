module Api
  module V1
    class MeController < Api::V1::BaseController
      def show
        if current_customer
          render json: me_json(current_customer)
        else
          render json: { error: "Unauthorized" }, status: :unauthorized
        end
      end

      def update
        return render json: { error: "Unauthorized" }, status: :unauthorized unless current_customer

        if current_customer.update(me_params)
          render json: me_json(current_customer)
        else
          render json: { errors: current_customer.errors.full_messages }, status: :unprocessable_entity
        end
      end

      private

      def me_params
        params.require(:customer).permit(:preferred_language)
      end

      def me_json(customer)
        {
          id: customer.id,
          email: customer.email,
          name: customer.name,
          avatar_url: customer.avatar_url,
          preferred_language: customer.preferred_language
        }
      end
    end
  end
end
