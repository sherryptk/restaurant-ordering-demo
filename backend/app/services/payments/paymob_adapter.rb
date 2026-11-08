module Payments
  class PaymobAdapter < BaseAdapter
    BASE_URL = "https://accept.paymob.com/api"

    # Order of fields Paymob concatenates when computing the transaction
    # callback HMAC. Must match https://docs.paymob.com exactly.
    HMAC_FIELDS = %w[
      amount_cents created_at currency error_occured has_parent_transaction id
      integration_id is_3d_secure is_auth is_capture is_refunded
      is_standalone_payment is_voided order owner pending source_data.pan
      source_data.sub_type source_data.type success
    ].freeze

    def initiate(order:, return_url:)
      token = authenticate!
      pm_order = create_paymob_order!(token, order)
      pay_key = payment_key!(token, pm_order["id"], order)

      {
        redirect_url: iframe_url(pay_key),
        reference: pm_order["id"].to_s,
        gateway: "paymob"
      }
    end

    def verify(payload:)
      payload = payload.stringify_keys
      hmac = payload.delete("hmac")
      computed = compute_hmac(payload)

      if computed.present? && ActiveSupport::SecurityUtils.secure_compare(computed, hmac.to_s)
        {
          success: payload["success"].to_s == "true",
          reference: payload["order"],
          transaction_id: payload["id"],
          error: nil
        }
      else
        {
          success: false,
          reference: payload["order"],
          transaction_id: payload["id"],
          error: "HMAC verification failed"
        }
      end
    end

    private

    def authenticate!
      response = conn(BASE_URL).post("auth/tokens", { api_key: config[:api_key] })
      token = response.body["token"]
      raise "Paymob authentication failed" if token.blank?

      token
    end

    def create_paymob_order!(token, order)
      items = order.order_items.map do |item|
        {
          name: item.item_name_snapshot,
          amount_cents: (item.unit_price_snapshot * 100).to_i,
          quantity: item.quantity
        }
      end

      response = conn(BASE_URL).post("ecommerce/orders", {
        auth_token: token,
        amount_cents: (order.total * 100).to_i,
        currency: "EGP",
        merchant_order_id: order.order_number,
        items: items
      })

      response.body
    end

    def payment_key!(token, paymob_order_id, order)
      response = conn(BASE_URL).post("acceptance/payment_keys", {
        auth_token: token,
        amount_cents: (order.total * 100).to_i,
        expiration: 3600,
        order_id: paymob_order_id,
        billing_data: billing_data(order),
        currency: "EGP",
        integration_id: config[:integration_id]
      })

      response.body["token"]
    end

    def billing_data(order)
      {
        first_name: order.customer&.name.presence || order.guest_name.presence || "NA",
        last_name: "NA",
        email: order.customer&.email.presence || order.guest_email.presence || "NA@example.com",
        phone_number: order.guest_phone.presence || "NA",
        apartment: "NA",
        floor: "NA",
        street: "NA",
        building: "NA",
        city: "NA",
        country: "EG",
        state: "NA"
      }
    end

    def iframe_url(pay_key)
      "https://accept.paymob.com/api/acceptance/iframes/#{config[:iframe_id]}?payment_token=#{pay_key}"
    end

    def compute_hmac(payload)
      concatenated = HMAC_FIELDS.map { |field| payload[field].to_s }.join
      OpenSSL::HMAC.hexdigest("SHA512", config[:hmac_secret].to_s, concatenated)
    end
  end
end
