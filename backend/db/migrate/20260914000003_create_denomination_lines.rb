class CreateDenominationLines < ActiveRecord::Migration[7.1]
  def change
    create_table :denomination_lines do |t|
      t.references :denomination_count, null: false, foreign_key: true
      t.decimal :value, precision: 10, scale: 2, null: false
      t.integer :quantity, null: false, default: 0

      t.timestamps
    end
  end
end
