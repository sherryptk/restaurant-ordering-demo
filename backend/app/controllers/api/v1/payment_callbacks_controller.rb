module Api
  module V1
    class PaymentCallbacksController < ApplicationController
      skip_before_action :verify_authenticity_token, raise: false

      def paymob
        result = restaurant.payment_adapter.verify(payload: params.to_unsafe_h)
        process_payment_result(result)
        render json: { received: true }
      end

      def kashier
        result = restaurant.payment_adapter.verify(payload: params.to_unsafe_h)
        process_payment_result(result)
        render json: { received: true }
      end

      private

      def process_payment_result(result)
        return unless result[:success]

        order = Order.find_by(order_number: result[:reference])
        return unless order

        order.update(
          payment_status: :paid,
          payment_reference: result[:transaction_id],
          status: :confirmed
        )
      end
    end
  end
end
