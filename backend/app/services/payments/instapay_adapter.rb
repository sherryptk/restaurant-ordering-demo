module Payments
  class InstapayAdapter < BaseAdapter
    def initiate(order:, return_url:)
      {
        redirect_url: nil,
        reference: "INSTAPAY-#{order.order_number}",
        gateway: "instapay",
        instapay_details: order.branch&.instapay_details.presence
      }
    end

    def verify(payload:)
      {
        success: true,
        reference: payload["reference"],
        transaction_id: nil
      }
    end
  end
end
