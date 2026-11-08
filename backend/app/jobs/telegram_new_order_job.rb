class TelegramNewOrderJob < ApplicationJob
  queue_as :default

  def perform(order_id)
    order = Order.includes(:order_items, :customer, :promo_code).find_by(id: order_id)
    unless order
      Rails.logger.warn("TelegramNewOrderJob skipped: order #{order_id} not found")
      return
    end

    TelegramService.send_message(build_message(order))
  end

  private

  def build_message(order)
    type_emoji = order.delivery? ? "🛵" : "🥡"
    phone = order.guest_phone.presence || (order.customer.phone if order.customer&.respond_to?(:phone))

    lines = []
    lines << "🆕 <b>New Order — #{order.order_number}</b>"
    lines << "👤 #{order.display_name} · #{phone}"
    lines << "#{type_emoji} #{order.order_type} · #{order.payment_method}"
    lines << "━━━━━━━━━━━━━━"
    order.order_items.each do |item|
      lines << "#{item.quantity}× #{item.item_name_snapshot} — EGP #{item.line_total}"
    end
    lines << "━━━━━━━━━━━━━━"
    lines << "💰 Total: EGP #{order.total}"
    lines << "⏱ Ready at #{order.estimated_ready_at.strftime('%H:%M')}" if order.estimated_ready_at.present?

    if order.delivery?
      address = order.delivery_address || {}
      formatted = [address["street"], address["building"], address["floor"], address["apartment"], address["city"]]
        .reject(&:blank?)
        .join(", ")
      lines << "📍 #{formatted}" if formatted.present?

      if order.delivery_zone_name.present?
        lines << "📍 Zone: #{order.delivery_zone_name} · EGP #{order.delivery_zone_fee}"
      end
    end

    if order.promo_code
      lines << "🎟 Promo: #{order.promo_code.code} (- EGP #{order.discount_amount})"
    end

    lines << "📝 #{order.notes}" if order.notes.present?

    lines.join("\n")
  end
end
