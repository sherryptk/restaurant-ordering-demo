class CreateTimesheets < ActiveRecord::Migration[7.1]
  def change
    create_table :timesheets do |t|
      t.references :employee, null: false, foreign_key: true
      t.date :date, null: false
      t.decimal :hours_worked, precision: 5, scale: 2
      t.boolean :day_off, null: false, default: false
      t.string :note

      t.timestamps
    end

    add_index :timesheets, [:employee_id, :date], unique: true
  end
end
