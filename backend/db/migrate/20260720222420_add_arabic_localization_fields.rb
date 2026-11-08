class AddArabicLocalizationFields < ActiveRecord::Migration[7.1]
  def change
    add_column :restaurants, :name_ar, :string
    add_column :restaurants, :description_ar, :text

    add_column :categories, :name_ar, :string
    add_column :categories, :description_ar, :text

    add_column :menu_items, :name_ar, :string
    add_column :menu_items, :description_ar, :text

    add_column :combo_deals, :name_ar, :string
    add_column :combo_deals, :description_ar, :string

    add_column :menu_item_options, :name_ar, :string

    add_column :menu_item_choices, :label_ar, :string

    add_column :branches, :name_ar, :string
  end
end
