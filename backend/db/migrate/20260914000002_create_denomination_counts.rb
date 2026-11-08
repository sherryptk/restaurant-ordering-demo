class CreateDenominationCounts < ActiveRecord::Migration[7.1]
  def change
    create_table :denomination_counts do |t|
      t.references :branch, null: false, foreign_key: true
      t.references :admin, null: false, foreign_key: true
      t.references :employee, foreign_key: true
      t.integer :count_type, null: false
      t.datetime :counted_at, null: false

      t.timestamps
    end

    add_index :denomination_counts, [:branch_id, :counted_at]
  end
end
