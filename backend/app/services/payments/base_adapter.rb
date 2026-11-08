module Payments
  class BaseAdapter
    attr_reader :config

    def initialize(config = {})
      @config = config.with_indifferent_access
    end

    def initiate(order:, return_url:)
      raise NotImplementedError
    end

    def verify(payload:)
      raise NotImplementedError
    end

    def refund(payment_reference:, amount:)
      raise NotImplementedError
    end

    protected

    def conn(base_url)
      Faraday.new(url: base_url) do |f|
        f.request :json
        f.response :json, content_type: /\bjson$/
        f.request :retry, max: 2, interval: 0.5, backoff_factor: 2
        f.adapter Faraday.default_adapter
      end
    end
  end
end
