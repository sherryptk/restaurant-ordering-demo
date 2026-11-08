class Branch < ApplicationRecord
  include TouchesMenuCache

  belongs_to :restaurant

  has_many :menu_item_branches, dependent: :destroy
  has_many :menu_items, through: :menu_item_branches
  has_many :orders, dependent: :nullify
  has_many :admins

  validates :name, presence: true
  validates :slug, presence: true, uniqueness: true

  scope :open, -> { where(is_open: true) }

  DAYS = %w[monday tuesday wednesday thursday friday saturday sunday].freeze

  def currently_open?
    return true if opening_hours.blank?

    now = Time.current.in_time_zone(restaurant&.timezone || "Africa/Cairo")

    # A session starting yesterday (e.g. Thursday 10:00-03:00) can still be
    # open into today, so today's own hours aren't enough to check alone.
    open_for_session_starting_on?(now, now) || open_for_session_starting_on?(now, now - 1.day)
  end

  def zone_for_point(lat, lng)
    return nil if delivery_zones.blank?

    delivery_zones.find do |zone|
      polygon = zone["polygon"]
      next false if polygon.blank? || polygon.length < 3

      point_in_polygon?(lat.to_f, lng.to_f, polygon)
    end
  end

  def contains_point?(lat, lng)
    zone_for_point(lat, lng).present?
  end

  def effective_price_for(menu_item)
    override = menu_item_branches.find_by(menu_item_id: menu_item.id)&.price_override
    override || menu_item.price
  end

  private

  # Checks whether `now` falls within the session that starts on
  # `session_date`'s day of week, handling sessions that cross midnight
  # (e.g. Thursday 10:00-03:00 stays open until Friday 03:00).
  def open_for_session_starting_on?(now, session_date)
    hours = opening_hours[session_date.strftime("%A").downcase]
    return false unless hours&.dig("open")

    from = parse_time(hours["from"], session_date)
    to   = parse_time(hours["to"], session_date)
    to += 1.day if to < from

    now >= from && now <= to
  end

  def parse_time(time_str, reference)
    hour, min = time_str.split(":").map(&:to_i)
    reference.change(hour: hour, min: min, sec: 0)
  end

  def point_in_polygon?(lat, lng, polygon)
    x, y = lat, lng
    inside = false
    j = polygon.length - 1

    polygon.each_with_index do |point_i, i|
      xi, yi = point_i["lat"].to_f, point_i["lng"].to_f
      xj, yj = polygon[j]["lat"].to_f, polygon[j]["lng"].to_f
      if ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)
        inside = !inside
      end
      j = i
    end

    inside
  end
end
