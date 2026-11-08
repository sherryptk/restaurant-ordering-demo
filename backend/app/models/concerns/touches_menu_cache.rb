module TouchesMenuCache
  extend ActiveSupport::Concern

  CACHE_VERSION_KEY = "menu:cache_version"

  included do
    after_commit :bump_menu_cache_version
  end

  private

  def bump_menu_cache_version
    Rails.cache.write(CACHE_VERSION_KEY, Time.current.to_f)
  end
end
