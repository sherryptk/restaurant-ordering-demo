module Payments
  class Factory
    ADAPTERS = {
      "paymob" => PaymobAdapter,
      "kashier" => KashierAdapter,
      "cash" => CashAdapter,
      "instapay" => InstapayAdapter
    }.freeze

    def self.for(gateway, config = {})
      adapter_class = ADAPTERS[gateway.to_s]
      raise ArgumentError, "Unknown payment gateway: #{gateway}" unless adapter_class

      adapter_class.new(config)
    end
  end
end
