#!/usr/bin/env ruby
# One-off: wire the watchOS app into the phone app target so WCSession links
# them. Adds (1) a target dependency TheNineteenth -> "TheNineteenthWatch Watch
# App" and (2) an "Embed Watch Content" copy-files build phase that copies the
# watch .app into $(CONTENTS_FOLDER_PATH)/Watch. Idempotent.

# Requires the xcodeproj gem. Run with Homebrew Ruby:
#   /opt/homebrew/opt/ruby/bin/ruby scripts/embed_watch_app.rb
require 'xcodeproj'

PROJECT = File.expand_path(File.join(__dir__, '..', 'ios', 'TheNineteenth.xcodeproj'))
PHONE_TARGET = 'TheNineteenth'
WATCH_TARGET = 'TheNineteenthWatch Watch App'

project = Xcodeproj::Project.open(PROJECT)
phone = project.targets.find { |t| t.name == PHONE_TARGET }
watch = project.targets.find { |t| t.name == WATCH_TARGET }
raise "phone target #{PHONE_TARGET.inspect} not found" unless phone
raise "watch target #{WATCH_TARGET.inspect} not found" unless watch

# 1) Target dependency (so the watch builds before the phone embeds it).
if phone.dependencies.any? { |d| d.target.uuid == watch.uuid }
  puts 'dependency: already present'
else
  phone.add_dependency(watch)
  puts 'dependency: added'
end

# 2) Embed Watch Content copy-files phase.
EMBED_NAME = 'Embed Watch Content'
embed = phone.copy_files_build_phases.find { |ph| ph.name == EMBED_NAME }
if embed.nil?
  embed = project.new(Xcodeproj::Project::Object::PBXCopyFilesBuildPhase)
  embed.name = EMBED_NAME
  embed.symbol_dst_subfolder_spec = :products_directory # spec 16
  embed.dst_path = '$(CONTENTS_FOLDER_PATH)/Watch'
  phone.build_phases << embed
  puts 'embed phase: created'
else
  puts 'embed phase: already present'
end

watch_product = watch.product_reference
already = embed.files.any? { |bf| bf.file_ref && bf.file_ref.uuid == watch_product.uuid }
if already
  puts 'embed file: already present'
else
  bf = embed.add_file_reference(watch_product)
  bf.settings = { 'ATTRIBUTES' => ['RemoveHeadersOnCopy'] }
  puts 'embed file: added watch .app'
end

project.save
puts "saved #{PROJECT}"
