# Namespaced controllers (Admins::) keep their concerns in
# app/controllers/admins/concerns instead of the flat top-level
# app/controllers/concerns Rails autoloads by convention. Collapse that
# directory so files there resolve as Admins::X rather than
# Admins::Concerns::X.
Rails.autoloaders.main.collapse("#{Rails.root}/app/controllers/admins/concerns")
