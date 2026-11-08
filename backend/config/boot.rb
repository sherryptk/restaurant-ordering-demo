ENV["BUNDLE_GEMFILE"] ||= File.expand_path("../Gemfile", __dir__)

# Ruby fully buffers STDOUT/STDERR when they aren't attached to a real
# terminal (always true inside a container). Without this, any output
# printed before a hang or crash can sit in the buffer and never reach
# Railway's (or any other platform's) log collector.
$stdout.sync = true
$stderr.sync = true

require "bundler/setup" # Set up gems listed in the Gemfile.
require "bootsnap/setup" # Speed up boot time by caching expensive operations.
