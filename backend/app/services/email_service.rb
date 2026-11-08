require 'resend'

class EmailService
  FROM = ENV['RESEND_FROM'] || 'orders@example.com'

  STATUS_CONTENT = {
    "confirmed" => {
      subject: "Your order is confirmed! — %{order_number}",
      heading: "Your order is confirmed! ✅",
      message: "We've received your order and it's been confirmed. We'll start preparing it shortly."
    },
    "preparing" => {
      subject: "We're preparing your order — %{order_number}",
      heading: "We're preparing your order 👨‍🍳",
      message: "Our kitchen is preparing your order right now."
    },
    "ready" => {
      subject: "Your order is ready! 🎉 — %{order_number}",
      heading: "Your order is ready! 🎉",
      message: "Your order is ready for pickup."
    },
    "out_for_delivery" => {
      subject: "Your order is on the way! 🛵 — %{order_number}",
      heading: "Your order is on the way! 🛵",
      message: "Your driver has picked up your order and is heading your way."
    },
    "delivered" => {
      subject: "Order delivered! Thank you 🧇 — %{order_number}",
      heading: "Order delivered! Thank you 🧇",
      message: "Your order has been delivered. We hope you enjoy it!"
    }
  }.freeze

  def self.send_email(to:, subject:, html:)
    if to.blank?
      Rails.logger.warn("EmailService skipped: no recipient email (subject=#{subject.inspect})")
      return false
    end

    Resend.api_key = ENV['RESEND_API_KEY']
    response = Resend::Emails.send({
      from: FROM,
      to: to,
      subject: subject,
      html: html
    })
    Rails.logger.info("EmailService sent: to=#{to} subject=#{subject.inspect} id=#{response[:id]}")
    true
  rescue => e
    Rails.logger.error("EmailService error: to=#{to} subject=#{subject.inspect} #{e.class}: #{e.message}")
    false
  end

  def self.order_confirmation(order)
    to = order.customer&.email.presence || order.guest_email
    subject = "Order Confirmed — #{order.order_number} | #{restaurant_name}"
    html = order_confirmation_html(order)
    send_email(to: to, subject: subject, html: html)
  end

  def self.order_status_update(order, status)
    content = STATUS_CONTENT[status.to_s]
    return false unless content

    to = order.customer&.email.presence || order.guest_email
    subject = content[:subject] % { order_number: order.order_number }
    html = status_update_html(order, content)
    send_email(to: to, subject: subject, html: html)
  end

  def self.order_confirmation_html(order)
    <<~HTML
      #{header}
      <div style="padding: 32px 24px; background: #ffffff;">
        <h2 style="color: #1A1A1A; font-size: 22px; margin: 0 0 16px;">Thank you for your order! 🧇</h2>
        <p style="color: #444; font-size: 15px; margin: 0 0 24px;">
          Order <strong>#{order.order_number}</strong> has been received.
        </p>
        #{order_meta_table(order)}
        #{items_table(order)}
        #{totals_table(order)}
        #{delivery_address_block(order)}
        #{estimated_ready_block(order)}
        #{instapay_upload_block(order)}
      </div>
      #{footer}
    HTML
  end

  def self.status_update_html(order, content)
    <<~HTML
      #{header}
      <div style="padding: 32px 24px; background: #ffffff;">
        <h2 style="color: #1A1A1A; font-size: 22px; margin: 0 0 16px;">#{content[:heading]}</h2>
        <p style="color: #444; font-size: 15px; margin: 0 0 24px;">#{content[:message]}</p>
        #{order_meta_table(order)}
        #{items_table(order)}
        #{totals_table(order)}
        #{delivery_address_block(order)}
        #{estimated_ready_block(order)}
      </div>
      #{footer}
    HTML
  end

  def self.restaurant_name
    Restaurant.first&.name || "Demo Café"
  end

  def self.header
    <<~HTML
      <div style="background: #1A1A1A; padding: 24px; text-align: center;">
        <span style="color: #F5A623; font-size: 28px; font-weight: bold; letter-spacing: 1px;">#{restaurant_name}</span>
      </div>
    HTML
  end

  def self.footer
    <<~HTML
      <div style="background: #1A1A1A; padding: 20px; text-align: center;">
        <p style="color: #999; font-size: 12px; margin: 0;">#{restaurant_name} | Alexandria, Egypt</p>
      </div>
    HTML
  end

  def self.order_meta_table(order)
    <<~HTML
      <table style="width: 100%; margin-bottom: 24px; font-size: 14px; color: #444;">
        <tr>
          <td style="padding: 4px 0;"><strong>Order Number:</strong></td>
          <td style="padding: 4px 0; text-align: right;">#{order.order_number}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0;"><strong>Order Type:</strong></td>
          <td style="padding: 4px 0; text-align: right;">#{order.order_type&.titleize}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0;"><strong>Branch:</strong></td>
          <td style="padding: 4px 0; text-align: right;">#{order.branch&.name || 'N/A'}</td>
        </tr>
      </table>
    HTML
  end

  def self.items_table(order)
    rows = order.order_items.map do |item|
      <<~ROW
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee;">#{item.item_name_snapshot}</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: center;">#{item.quantity}</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">EGP #{'%.2f' % item.line_total}</td>
        </tr>
      ROW
    end.join

    <<~HTML
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 14px;">
        <thead>
          <tr>
            <th style="text-align: left; padding: 8px 0; border-bottom: 2px solid #1A1A1A; color: #1A1A1A;">Item</th>
            <th style="text-align: center; padding: 8px 0; border-bottom: 2px solid #1A1A1A; color: #1A1A1A;">Qty</th>
            <th style="text-align: right; padding: 8px 0; border-bottom: 2px solid #1A1A1A; color: #1A1A1A;">Price</th>
          </tr>
        </thead>
        <tbody>
          #{rows}
        </tbody>
      </table>
    HTML
  end

  def self.totals_table(order)
    rows = ["<tr><td style=\"padding: 4px 0; color: #444;\">Subtotal</td><td style=\"padding: 4px 0; text-align: right; color: #444;\">EGP #{'%.2f' % order.subtotal}</td></tr>"]

    if order.discount_amount.to_f > 0
      rows << "<tr><td style=\"padding: 4px 0; color: #444;\">Discount</td><td style=\"padding: 4px 0; text-align: right; color: #444;\">- EGP #{'%.2f' % order.discount_amount}</td></tr>"
    end

    if order.delivery? && order.delivery_fee.to_f > 0
      rows << "<tr><td style=\"padding: 4px 0; color: #444;\">Delivery Fee</td><td style=\"padding: 4px 0; text-align: right; color: #444;\">EGP #{'%.2f' % order.delivery_fee}</td></tr>"
    end

    if order.tax_amount.to_f > 0
      restaurant = order.branch&.restaurant || Restaurant.first
      vat_rate = restaurant&.vat_rate.to_f
      vat_label = vat_rate % 1 == 0 ? vat_rate.to_i : vat_rate
      rows << "<tr><td style=\"padding: 4px 0; color: #444;\">VAT (#{vat_label}%)</td><td style=\"padding: 4px 0; text-align: right; color: #444;\">EGP #{'%.2f' % order.tax_amount}</td></tr>"
    end

    rows << "<tr><td style=\"padding: 8px 0; font-weight: bold; color: #1A1A1A; border-top: 2px solid #1A1A1A;\">Total</td><td style=\"padding: 8px 0; text-align: right; font-weight: bold; color: #1A1A1A; border-top: 2px solid #1A1A1A;\">EGP #{'%.2f' % order.total}</td></tr>"

    <<~HTML
      <table style="width: 100%; margin-bottom: 16px; font-size: 14px;">
        #{rows.join}
      </table>
    HTML
  end

  def self.delivery_address_block(order)
    return "" unless order.delivery?

    address = order.delivery_address || {}

    lines = []
    lines << address["street"] if address["street"].present?

    apt_line = [
      (address["building"].present? ? "Building #{address['building']}" : nil),
      (address["floor"].present? ? "Floor #{address['floor']}" : nil),
      (address["apartment"].present? ? "Apt #{address['apartment']}" : nil)
    ].compact.join(", ")
    lines << apt_line if apt_line.present?

    lines << address["city"] if address["city"].present?
    lines << "Notes: #{address['notes']}" if address["notes"].present?

    return "" if lines.empty?

    <<~HTML
      <div style="margin-bottom: 16px; font-size: 14px; color: #444;">
        <strong style="color: #1A1A1A;">Delivery Address:</strong><br>
        #{lines.join('<br>')}
      </div>
    HTML
  end

  def self.instapay_upload_block(order)
    return "" unless order.instapay? && order.guest_phone.present? && !order.payment_proof.attached?

    url = "#{ENV['FRONTEND_URL'] || 'http://localhost:5173'}/orders/#{order.id}?guest_phone=#{CGI.escape(order.guest_phone)}"

    <<~HTML
      <div style="margin-bottom: 24px; padding: 16px; background: #FFF8E7; border: 1px solid #F5A623; border-radius: 8px;">
        <p style="margin: 0 0 12px; font-size: 14px; color: #444;">
          You selected <strong>InstaPay</strong> as your payment method. Please send the total amount to our InstaPay account and upload a screenshot of the transfer so we can confirm your payment.
        </p>
        <a href="#{url}" style="display: inline-block; padding: 10px 20px; background: #F5A623; color: #1A1A1A; text-decoration: none; font-weight: bold; border-radius: 6px; font-size: 14px;">
          Upload Payment Screenshot
        </a>
      </div>
    HTML
  end

  def self.estimated_ready_block(order)
    return "" if order.estimated_ready_at.blank?

    <<~HTML
      <div style="margin-bottom: 8px; font-size: 14px; color: #444;">
        <strong style="color: #1A1A1A;">Estimated Ready Time:</strong>
        #{order.estimated_ready_at.strftime('%H:%M')}
      </div>
    HTML
  end
end
