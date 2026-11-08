class TelegramStatusUpdateJob < ApplicationJob
  queue_as :default

  STATUS_EMOJI = {
    "pending" => "⏳",
    "confirmed" => "✅",
    "preparing" => "👨‍🍳",
    "ready" => "🎉",
    "out_for_delivery" => "🛵",
    "delivered" => "📦",
    "completed" => "✓",
    "cancelled" => "❌"
  }.freeze

  def perform(order_id, status)
    order = Order.find_by(id: order_id)
    return unless order

    phone = order.guest_phone.presence || (order.customer.phone if order.customer&.respond_to?(:phone))
    emoji = STATUS_EMOJI[status.to_s] || ""

    lines = [
      "#{emoji} Order <b>#{order.order_number}</b> is now <b>#{status}</b>",
      "👤 #{order.display_name} · #{phone}",
      "💰 EGP #{order.total}"
    ]
    lines << "⏱ Ready at #{order.estimated_ready_at.strftime('%H:%M')}" if order.estimated_ready_at.present?

    TelegramService.send_message(lines.join("\n"))
  end
end
