class TelegramService
  BOT_TOKEN = ENV['TELEGRAM_BOT_TOKEN']
  CHAT_ID = ENV['TELEGRAM_CHAT_ID']
  BASE_URL = "https://api.telegram.org/bot#{BOT_TOKEN}"

  def self.send_message(text)
    if BOT_TOKEN.blank? || CHAT_ID.blank?
      Rails.logger.warn("TelegramService skipped: BOT_TOKEN or CHAT_ID not configured")
      return false
    end

    uri = URI("#{BASE_URL}/sendMessage")
    response = Net::HTTP.post(
      uri,
      { chat_id: CHAT_ID, text: text, parse_mode: 'HTML' }.to_json,
      'Content-Type' => 'application/json'
    )
    body = JSON.parse(response.body)

    if body['ok']
      Rails.logger.info("TelegramService sent: message_id=#{body.dig('result', 'message_id')}")
      true
    else
      Rails.logger.error("TelegramService failed: http_status=#{response.code} response=#{body}")
      false
    end
  rescue => e
    Rails.logger.error("TelegramService error: #{e.message}")
    false
  end
end
