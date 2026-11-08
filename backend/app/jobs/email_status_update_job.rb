class EmailStatusUpdateJob < ApplicationJob
  queue_as :default

  def perform(order_id, status)
    order = Order.includes(:order_items, :branch, :customer).find_by(id: order_id)
    unless order
      Rails.logger.warn("EmailStatusUpdateJob skipped: order #{order_id} not found")
      return
    end

    email = order.customer&.email.presence || order.guest_email
    if email.blank?
      Rails.logger.warn("EmailStatusUpdateJob skipped: order #{order_id} has no customer or guest email")
      return
    end

    EmailService.order_status_update(order, status)
  end
end
