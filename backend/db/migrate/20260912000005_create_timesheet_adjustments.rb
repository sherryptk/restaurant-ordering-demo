class CreateTimesheetAdjustments < ActiveRecord::Migration[7.1]
  def change
    create_table :timesheet_adjustments do |t|
      t.references :employee, null: false, foreign_key: true
      t.date :date, null: false
      t.decimal :amount, precision: 10, scale: 2, null: false
      t.integer :adjustment_type, null: false, default: 0
      t.string :note

      t.timestamps
    end
  end
end
