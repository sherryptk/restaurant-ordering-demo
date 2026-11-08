module Payments
  class CashAdapter < BaseAdapter
    def initiate(order:, return_url:)
      {
        redirect_url: nil,
        reference: "CASH-#{order.order_number}",
        gateway: "cash"
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
