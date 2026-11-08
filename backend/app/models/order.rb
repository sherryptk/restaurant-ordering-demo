class Order < ApplicationRecord
  has_one_attached :payment_proof

  belongs_to :customer, optional: true
  belongs_to :promo_code, optional: true
  belongs_to :combo_deal, optional: true
  belongs_to :driver, class_name: "Admin", foreign_key: "driver_id", optional: true
  belongs_to :branch, optional: true
  has_many :order_items, dependent: :destroy

  enum :status, {
    pending: "pending",
    confirmed: "confirmed",
    preparing: "preparing",
    ready: "ready",
    out_for_delivery: "out_for_delivery",
    delivered: "delivered",
    completed: "completed",
    cancelled: "cancelled"
  }

  enum :order_type, { pickup: "pickup", delivery: "delivery" }

  enum :payment_method, { cash: "cash", paymob: "paymob", kashier: "kashier", instapay: "instapay" }

  enum :payment_status, { unpaid: "unpaid", paid: "paid", refunded: "refunded" }

  validates :order_number, presence: true, uniqueness: true
  validates :subtotal, numericality: { greater_than_or_equal_to: 0 }
  validates :total, numericality: { greater_than_or_equal_to: 0 }

  validate :guest_info_or_customer_present
  validate :delivery_requires_address

  before_validation :generate_order_number, on: :create
  before_validation :calculate_totals

  after_create_commit :notify_telegram_new_order
  after_create_commit :notify_email_confirmation
  after_create_commit :broadcast_new_order
  after_save_commit :broadcast_status_change, if: :saved_change_to_status?
  after_save_commit :broadcast_estimated_ready_at_change, if: :saved_change_to_estimated_ready_at?
  after_save_commit :broadcast_payment_status_change, if: :saved_change_to_payment_status?

  def display_name
    customer&.name.presence || guest_name
  end

  def display_contact
    customer&.email.presence || guest_email || guest_phone
  end

  def broadcast_payment_proof_uploaded
    ActionCable.server.broadcast("admin_orders", {
      type: "payment_proof_uploaded",
      order_id: id,
      order_number: order_number
    })
  end

  private

  def notify_telegram_new_order
    TelegramNewOrderJob.perform_later(id)
  end

  def notify_email_confirmation
    EmailOrderConfirmationJob.perform_later(id)
  end

  def notify_telegram_status_update
    TelegramStatusUpdateJob.perform_later(id, status)
  end

  def generate_order_number
    self.order_number ||= "ORD-#{Date.current.strftime('%Y%m%d')}-#{SecureRandom.hex(3).upcase}"
  end

  def calculate_totals
    # Force each new order_item through its own before_validation now (which
    # computes its line_total) — otherwise this runs before Rails validates
    # the association and every line_total is still nil at this point.
    order_items.each { |item| item.valid? if item.new_record? }

    self.subtotal = order_items.to_a.sum { |item| item.line_total || 0 }
    self.delivery_fee = delivery? ? (delivery_zone_fee || branch&.delivery_fee || Restaurant.first&.delivery_fee || 0) : 0

    discounted_subtotal = subtotal.to_d - discount_amount.to_f - combo_discount_amount.to_f
    vat_base = discounted_subtotal + delivery_fee.to_d

    vat_rate = Restaurant.first&.vat_rate
    self.tax_amount = vat_rate.present? ? (vat_base * (vat_rate.to_d / 100)).round(2) : 0

    self.total = vat_base + tax_amount.to_d
  end

  def guest_info_or_customer_present
    return if customer_id.present?

    errors.add(:guest_name, "can't be blank") if guest_name.blank?
    errors.add(:guest_phone, "can't be blank") if guest_phone.blank?
  end

  def delivery_requires_address
    return unless delivery?

    errors.add(:delivery_address, "can't be blank") if delivery_address.blank?
  end

  def broadcast_new_order
    ActionCable.server.broadcast("admin_orders", {
      type: "new_order",
      order_id: id,
      status: status,
      order_number: order_number
    })
  end

  def broadcast_status_change
    payload = { status: status, order_number: order_number }

    OrderStatusChannel.broadcast_to(self, payload)
    ActionCable.server.broadcast("admin_orders", {
      type: "status_change",
      order_id: id,
      status: status,
      order_number: order_number
    })

    # notify_telegram_status_update  # disabled for now — enable when ready

    EmailStatusUpdateJob.perform_later(id, status)
  end

  def broadcast_payment_status_change
    OrderStatusChannel.broadcast_to(self, { order_number: order_number, payment_status: payment_status })
  end

  def broadcast_estimated_ready_at_change
    OrderStatusChannel.broadcast_to(self, {
      order_number: order_number,
      estimated_ready_at: estimated_ready_at
    })
  end
end
