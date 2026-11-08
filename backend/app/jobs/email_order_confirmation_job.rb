class EmailOrderConfirmationJob < ApplicationJob
  queue_as :default

  def perform(order_id)
    order = Order.includes(:order_items, :branch, :customer).find_by(id: order_id)
    unless order
      Rails.logger.warn("EmailOrderConfirmationJob skipped: order #{order_id} not found")
      return
    end

    email = order.customer&.email.presence || order.guest_email
    if email.blank?
      Rails.logger.warn("EmailOrderConfirmationJob skipped: order #{order_id} has no customer or guest email")
      return
    end

    EmailService.order_confirmation(order)
  end
end
