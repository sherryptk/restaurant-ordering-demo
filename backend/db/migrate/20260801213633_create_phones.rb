class CreatePhones < ActiveRecord::Migration[7.1]
  def change
    create_table :phones do |t|
      t.references :customer, null: false, foreign_key: true
      t.string :number, null: false
      t.boolean :is_default, default: false

      t.timestamps
    end
  end
end
