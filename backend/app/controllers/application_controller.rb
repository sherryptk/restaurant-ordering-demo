class ApplicationController < ActionController::API
  include Pagy::Backend

  before_action :set_restaurant
  before_action :set_locale

  attr_reader :current_customer, :current_admin, :restaurant

  private

  def set_restaurant
    @restaurant = Restaurant.first
    render json: { error: "Restaurant not configured" }, status: :service_unavailable if @restaurant.nil?
  end

  def set_locale
    @current_locale = request.headers["X-Locale"] == "en" ? "en" : "ar"
  end

  def localized(record, field)
    return record.public_send(field) if @current_locale == "en"

    record.public_send(:"#{field}_ar").presence || record.public_send(field)
  end

  # Builds a direct Cloudflare R2 URL from the attachment's blob key, bypassing
  # Active Storage's url_for (which points at R2's private S3-API endpoint --
  # slow and capped at ~6 concurrent connections per host in the browser).
  # Locally CLOUDFLARE_R2_PUBLIC_URL isn't set (storage falls back to disk), so
  # fall back to Active Storage's own redirect route instead of a broken link.
  def public_url_for(attachment)
    return nil unless attachment.attached?
    return rails_blob_url(attachment, host: request.base_url) if ENV["CLOUDFLARE_R2_PUBLIC_URL"].blank?

    "#{ENV['CLOUDFLARE_R2_PUBLIC_URL']}/#{attachment.blob.key}"
  end

  # Resizes an uploaded image down to display size before attaching it, so we
  # don't store/serve full-resolution originals. Falls back to attaching the
  # untouched upload if processing fails, so an upload never silently fails.
  def attach_resized(attachment, uploaded_file, max_dimension: ImageResizer::MAX_DIMENSION)
    return if uploaded_file.blank?

    resized = ImageResizer.process(uploaded_file.tempfile, max_dimension: max_dimension)

    if resized
      basename = File.basename(uploaded_file.original_filename.to_s, ".*")
      attachment.attach(io: resized, filename: "#{basename}.jpg", content_type: "image/jpeg")
    else
      attachment.attach(uploaded_file)
    end
  ensure
    resized&.close!
  end
end
