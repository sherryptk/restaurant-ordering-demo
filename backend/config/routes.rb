Rails.application.routes.draw do
  mount ActionCable.server => "/cable"

  devise_for :customers,
             path: "api/v1/auth",
             controllers: {
               sessions: "api/v1/sessions",
               registrations: "api/v1/registrations"
             },
             defaults: { format: :json }

  get '/auth/google_oauth2/callback', to: 'api/v1/omniauth_callbacks#google_oauth2'
  get '/auth/failure', to: 'api/v1/omniauth_callbacks#failure'
  get '/auth/google_oauth2', to: proc { [404, {}, []] }

  devise_for :admins,
             path: "admins/auth",
             controllers: {
               sessions: "admins/sessions"
             },
             defaults: { format: :json }

  namespace :api do
    namespace :v1 do
      get "me" => "me#show"
      patch "me" => "me#update"

      get "menu" => "menu#index"
      get "menu/:id" => "menu#show"

      get "branches" => "branches#index"
      post "branches/find_by_location" => "branches#find_by_location"

      get "combo_deals" => "combo_deals#index"
      post "cart/check_combos" => "cart#check_combos"

      get "favorites" => "favorites#index"
      post "favorites" => "favorites#create"
      delete "favorites/:menu_item_id" => "favorites#destroy"

      resources :orders, only: [:index, :show, :create] do
        member do
          post :payment_proof
        end
      end
      resources :addresses, only: [:index, :create, :update, :destroy]
      resources :phones, only: [:index, :create, :destroy]

      post "payments/paymob/callback" => "payment_callbacks#paymob"
      post "payments/kashier/callback" => "payment_callbacks#kashier"

      post "promo_codes/validate" => "promo_codes#validate"
    end
  end

  namespace :admins, module: "admins" do
    get "orders" => "orders#index"
    get "orders/:id" => "orders#show"
    patch "orders/:id/status" => "orders#update_status"
    patch "orders/:id/payment_status" => "orders#update_payment_status"
    patch "orders/:id/assign_driver" => "orders#assign_driver"
    patch "orders/:id/estimated_time" => "orders#update_estimated_time"

    get "menu/categories" => "menu#categories"
    post "menu/categories" => "menu#create_category"
    patch "menu/categories/reorder" => "menu#reorder_categories"
    patch "menu/categories/:id" => "menu#update_category"
    delete "menu/categories/:id" => "menu#destroy_category"
    post "menu/categories/:category_id/items" => "menu#create_item"
    post "menu/items/bulk_update" => "menu#bulk_update_items"
    patch "menu/items/:id" => "menu#update_item"
    delete "menu/items/:id" => "menu#destroy_item"
    patch "menu/items/:id/toggle" => "menu#toggle_item_availability"
    get "menu/items/:id/options" => "menu#get_item_options"
    post "menu/items/:id/options" => "menu#save_item_options"
    post "menu/options/import_csv" => "menu#import_options_csv"

    get "settings" => "settings#show"
    patch "settings" => "settings#update"
    post "settings/banner" => "settings#upload_banner"
    post "settings/logo" => "settings#upload_logo"

    resources :promo_codes, only: [:index, :create, :update, :destroy]
    patch "promo_codes/:id/toggle" => "promo_codes#toggle"

    resources :users, only: [:index, :create, :update, :destroy]
    patch "users/:id/reset_password" => "users#reset_password"

    resources :combo_deals, only: [:index, :create, :update, :destroy]
    patch "combo_deals/:id/toggle" => "combo_deals#toggle"

    resources :branches, only: [:index, :create, :update, :destroy] do
      member do
        get :menu_availability
        post :update_menu_availability
      end
    end

    resources :cash_transactions, only: [:index, :create, :update, :destroy] do
      get :daily_summary, on: :collection
    end
    resources :denomination_counts, only: [:index, :create]
    get "monthly_summary" => "monthly_summaries#show"

    resources :employees, only: [:index, :create, :update, :destroy] do
      get :payroll_summary, on: :member
      resources :timesheet_adjustments, only: [:create, :destroy]
    end
    resources :timesheets, only: [:index, :create, :update]

    resources :ledger_payments, only: [:index, :create, :update, :destroy]
  end

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check
end
