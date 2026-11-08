require "csv"

module Admins
  class MenuController < Admins::BaseController
    include Admins::RoleEnforcement

    BULK_OPERATOR_FIELDS = %i[name name_ar price available].freeze
    BULK_ADMIN_FIELDS = (BULK_OPERATOR_FIELDS + %i[compare_at_price offer_badge]).freeze

    def categories
      categories = restaurant.categories.includes(menu_items: [{ image_attachment: :blob }, :menu_item_options])
      render json: categories.map { |category| category_json(category) }
    end

    def create_category
      category = restaurant.categories.build(category_params)

      if category.save
        render json: category_json(category), status: :created
      else
        render json: { errors: category.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def update_category
      category = restaurant.categories.find_by(id: params[:id])
      return render json: { error: "Not found" }, status: :not_found if category.nil?

      if category.update(category_params)
        render json: category_json(category)
      else
        render json: { errors: category.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def destroy_category
      category = restaurant.categories.find_by(id: params[:id])
      return render json: { error: "Not found" }, status: :not_found if category.nil?

      category.destroy
      head :no_content
    end

    def reorder_categories
      ActiveRecord::Base.transaction do
        Array(params[:ordered_ids]).each_with_index do |id, index|
          restaurant.categories.find(id).update!(position: index)
        end
      end

      render json: { success: true }
    rescue ActiveRecord::RecordNotFound
      render json: { error: "Not found" }, status: :not_found
    end

    def create_item
      category = restaurant.categories.find_by(id: params[:category_id])
      return render json: { error: "Not found" }, status: :not_found if category.nil?

      item = category.menu_items.build(menu_item_params)
      attach_resized(item.image, params[:image])

      if item.save
        render json: item_json(item), status: :created
      else
        render json: { errors: item.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def update_item
      item = restaurant.menu_items.find_by(id: params[:id])
      return render json: { error: "Not found" }, status: :not_found if item.nil?

      attach_resized(item.image, params[:image])

      if item.update(menu_item_params)
        render json: item_json(item)
      else
        render json: { errors: item.errors.full_messages }, status: :unprocessable_entity
      end
    end

    # Powers the bulk edit modal and the prices CSV import. All-or-nothing: one
    # invalid row rolls back the whole batch so the site is never half-updated.
    # Operators may change name/price/availability only; offer fields and
    # options & extras are admin-only, whatever the client sends.
    def bulk_update_items
      rows = Array(params[:items])
      return render json: { error: "No items provided" }, status: :unprocessable_entity if rows.empty?

      items = restaurant.menu_items.where(id: rows.map { |row| row[:id] }).index_by { |item| item.id.to_s }
      fields = current_admin.admin? ? BULK_ADMIN_FIELDS : BULK_OPERATOR_FIELDS
      errors = []

      ActiveRecord::Base.transaction(requires_new: true) do
        rows.each do |row|
          item = items[row[:id].to_s]
          if item.nil?
            errors << "Item #{row[:id]} not found"
            next
          end

          begin
            item.assign_attributes(row.permit(*fields).to_h)
            replace_item_options(item, row[:options]) if current_admin.admin? && row.key?(:options)
            errors << "#{item.name}: #{item.errors.full_messages.to_sentence}" unless item.save
          rescue ActiveRecord::RecordInvalid => e
            errors << "#{item.name}: #{e.record.errors.full_messages.to_sentence}"
          end
        end

        raise ActiveRecord::Rollback if errors.any?
      end

      if errors.any?
        render json: { errors: errors }, status: :unprocessable_entity
      else
        render json: { updated: rows.size }
      end
    end

    def destroy_item
      item = restaurant.menu_items.find_by(id: params[:id])
      return render json: { error: "Not found" }, status: :not_found if item.nil?

      item.destroy
      head :no_content
    end

    def toggle_item_availability
      item = restaurant.menu_items.find_by(id: params[:id])
      return render json: { error: "Not found" }, status: :not_found if item.nil?

      item.update(available: !item.available)
      render json: item_json(item)
    end

    def get_item_options
      item = restaurant.menu_items.find_by(id: params[:id])
      return render json: { error: "Not found" }, status: :not_found if item.nil?

      render json: { options: item.menu_item_options.order(:position).map { |opt| option_json(opt) } }
    end

    def save_item_options
      item = restaurant.menu_items.find_by(id: params[:id])
      return render json: { error: "Not found" }, status: :not_found if item.nil?

      ActiveRecord::Base.transaction { replace_item_options(item, params[:options]) }

      render json: { options: item.menu_item_options.order(:position).map { |opt| option_json(opt) } }
    rescue ActiveRecord::RecordInvalid => e
      render json: { errors: [e.message] }, status: :unprocessable_entity
    end

    def import_options_csv
      file = params[:file]
      return render json: { error: "No file provided" }, status: :unprocessable_entity if file.blank?

      begin
        rows = CSV.read(file.path, headers: true)
      rescue CSV::MalformedCSVError => e
        return render json: { error: "Invalid CSV: #{e.message}" }, status: :unprocessable_entity
      end

      imported_items = []
      errors = []

      ActiveRecord::Base.transaction do
        rows.group_by { |row| row["item_name"]&.strip }.each do |item_name, item_rows|
          item = restaurant.menu_items.find_by(name: item_name)
          if item.nil?
            errors << "Item not found: #{item_name}"
            next
          end

          item.menu_item_options.destroy_all

          item_rows.group_by { |row| row["option_name"]&.strip }.each_with_index do |(option_name, option_rows), opt_index|
            first_row = option_rows.first
            option = item.menu_item_options.create!(
              name: option_name,
              name_ar: first_row["option_name_ar"].presence,
              required: csv_bool(first_row["required"]),
              multi_select: csv_bool(first_row["multi_select"]),
              max_selections: first_row["max_selections"].presence&.to_i,
              position: opt_index
            )

            option_rows.each_with_index do |row, choice_index|
              option.menu_item_choices.create!(
                label: row["choice_label"],
                label_ar: row["choice_label_ar"].presence,
                price_delta: row["price_delta"].presence || 0,
                available: true,
                position: choice_index
              )
            end
          end

          imported_items << item_name
        end
      end

      render json: { imported_items: imported_items, errors: errors }
    rescue ActiveRecord::RecordInvalid => e
      render json: { errors: [e.message] }, status: :unprocessable_entity
    end

    private

    # Replaces an item's whole options & extras tree. Callers wrap this in a
    # transaction; invalid rows raise ActiveRecord::RecordInvalid.
    def replace_item_options(item, options_params)
      item.menu_item_options.destroy_all

      Array(options_params).each do |option_params|
        option = item.menu_item_options.create!(
          name: option_params[:name],
          name_ar: option_params[:name_ar],
          required: option_params[:required],
          multi_select: option_params[:multi_select],
          max_selections: option_params[:max_selections],
          position: option_params[:position]
        )

        Array(option_params[:choices]).each do |choice_params|
          option.menu_item_choices.create!(
            label: choice_params[:label],
            label_ar: choice_params[:label_ar],
            price_delta: choice_params[:price_delta],
            available: choice_params[:available],
            position: choice_params[:position]
          )
        end
      end
    end

    def csv_bool(value)
      ActiveModel::Type::Boolean.new.cast(value)
    end

    def permitted_action
      case action_name
      when "categories" then :view_menu
      when "toggle_item_availability" then :toggle_item_availability
      when "bulk_update_items" then :bulk_update_menu_prices
      else :manage_menu
      end
    end

    def category_params
      params.require(:category).permit(:name, :name_ar, :description, :description_ar, :position, :visible)
    end

    def menu_item_params
      params.require(:menu_item).permit(
        :name, :name_ar, :description, :description_ar, :price, :compare_at_price, :offer_badge,
        :available, :featured, :position, tags: []
      )
    end

    def category_json(category)
      {
        id: category.id,
        name: category.name,
        name_ar: category.name_ar,
        description: category.description,
        description_ar: category.description_ar,
        position: category.position,
        visible: category.visible,
        item_count: category.menu_items.size,
        items: category.menu_items.map { |item| item_json(item) }
      }
    end

    def item_json(item)
      {
        id: item.id,
        category_id: item.category_id,
        name: item.name,
        name_ar: item.name_ar,
        description: item.description,
        description_ar: item.description_ar,
        price: item.price,
        compare_at_price: item.compare_at_price,
        offer_badge: item.offer_badge,
        available: item.available,
        featured: item.featured,
        position: item.position,
        tags: item.tags,
        image_url: public_url_for(item.image),
        options_count: item.menu_item_options.size
      }
    end

    def option_json(option)
      {
        id: option.id,
        name: option.name,
        name_ar: option.name_ar,
        required: option.required,
        multi_select: option.multi_select,
        max_selections: option.max_selections,
        position: option.position,
        choices: option.menu_item_choices.order(:position).map { |c| choice_json(c) }
      }
    end

    def choice_json(choice)
      {
        id: choice.id,
        label: choice.label,
        label_ar: choice.label_ar,
        price_delta: choice.price_delta,
        available: choice.available,
        position: choice.position
      }
    end
  end
end
