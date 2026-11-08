class CreateEmployees < ActiveRecord::Migration[7.1]
  def change
    create_table :employees do |t|
      t.references :branch, null: false, foreign_key: true
      t.string :name, null: false
      t.string :name_ar
      t.decimal :hourly_rate, precision: 10, scale: 2, null: false, default: 0
      t.boolean :active, null: false, default: true

      t.timestamps
    end
  end
end
