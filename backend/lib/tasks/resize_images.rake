namespace :images do
  desc "Resize already-attached images (menu items, combo deals, restaurant logo/banner) down to display size"
  task resize_existing: :environment do
    attachments = []

    MenuItem.with_attached_image.find_each { |item| attachments << item.image if item.image.attached? }
    ComboDeal.with_attached_image.find_each { |combo| attachments << combo.image if combo.image.attached? }
    Restaurant.with_attached_logo.with_attached_banner.find_each do |restaurant|
      attachments << restaurant.logo if restaurant.logo.attached?
      attachments << restaurant.banner if restaurant.banner.attached?
    end

    puts "=== Resizing #{attachments.size} attached image(s) ==="

    resized_count = 0
    failed_count = 0

    attachments.each do |attachment|
      blob = attachment.blob
      original_size = blob.byte_size

      source = Tempfile.new(["resize", ".bin"], binmode: true)
      attachment.download { |chunk| source.write(chunk) }
      source.rewind

      resized = ImageResizer.process(source)
      source.close!

      if resized
        filename = "#{File.basename(blob.filename.to_s, ".*")}.jpg"
        attachment.attach(io: resized, filename: filename, content_type: "image/jpeg")
        new_size = attachment.blob.byte_size
        puts "OK    #{blob.filename} (#{original_size} -> #{new_size} bytes)"
        resized_count += 1
      else
        puts "FAIL  #{blob.filename}"
        failed_count += 1
      end
    rescue => e
      puts "ERROR #{blob&.filename}: #{e.class}: #{e.message}"
      failed_count += 1
    ensure
      resized&.close!
      # ImageProcessing::Vips leaves libvips's operation cache and each
      # Tempfile's finalizer to Ruby's GC, which doesn't run often enough to
      # keep up over dozens of iterations -- forcing it periodically here is
      # what kept this task from tripping the container's memory limit.
      GC.start if (resized_count + failed_count) % 10 == 0
    end

    puts "\n=== Summary ==="
    puts "Resized: #{resized_count}"
    puts "Failed: #{failed_count}"
  end
end
