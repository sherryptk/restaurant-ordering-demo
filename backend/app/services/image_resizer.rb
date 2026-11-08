require "image_processing/vips"

# Downsizes an uploaded image before it's attached, so we store/serve
# roughly what's actually displayed instead of full-resolution originals.
class ImageResizer
  MAX_DIMENSION = 1000
  QUALITY = 82

  # file: anything ImageProcessing::Vips.source accepts (Tempfile, File, path)
  # max_dimension: raise this for images rendered full-bleed at large sizes
  # (e.g. the site banner, which can render 1800px+ wide on desktop) — the
  # 1000px default is sized for menu item/combo photos, which only ever
  # render a couple hundred px tall.
  # Returns a Tempfile of the resized JPEG, or nil if processing fails.
  def self.process(file, max_dimension: MAX_DIMENSION)
    ImageProcessing::Vips
      .source(file)
      .resize_to_limit(max_dimension, max_dimension)
      .convert("jpeg")
      .saver(quality: QUALITY, strip: true)
      .call
  rescue => e
    Rails.logger.error("ImageResizer error: #{e.class}: #{e.message}")
    nil
  end
end
