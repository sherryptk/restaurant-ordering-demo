module Payments
  class KashierAdapter < BaseAdapter
    BASE_URL = "https://checkout.kashier.io"

    def initiate(order:, return_url:)
      merchant_id = config[:merchant_id]
      amount = order.total.to_s
      currency = "EGP"

      signed_string = "#{merchant_id}.#{order.order_number}.#{amount}.#{currency}"
      hash = OpenSSL::HMAC.hexdigest("SHA256", config[:hash_secret].to_s, signed_string)

      redirect_url = "#{BASE_URL}/?merchantId=#{merchant_id}" \
                      "&orderId=#{order.order_number}" \
                      "&amount=#{amount}" \
                      "&currency=#{currency}" \
                      "&hash=#{hash}" \
                      "&redirectUrl=#{return_url}"

      {
        redirect_url: redirect_url,
        reference: order.order_number,
        gateway: "kashier"
      }
    end

    def verify(payload:)
      payload = payload.stringify_keys
      merchant_order_id = payload["merchantOrderId"]
      order_reference = payload["orderReference"]
      payment_status = payload["paymentStatus"]
      transaction_id = payload["transactionId"]
      signature = payload["signature"]

      concatenated = "#{merchant_order_id}#{order_reference}#{payment_status}#{transaction_id}"
      computed = OpenSSL::HMAC.hexdigest("SHA256", config[:hash_secret].to_s, concatenated)

      if computed.present? && ActiveSupport::SecurityUtils.secure_compare(computed, signature.to_s)
        {
          success: payment_status.to_s.upcase == "SUCCESS",
          reference: order_reference,
          transaction_id: transaction_id,
          error: nil
        }
      else
        {
          success: false,
          reference: order_reference,
          transaction_id: transaction_id,
          error: "Signature verification failed"
        }
      end
    end
  end
end
