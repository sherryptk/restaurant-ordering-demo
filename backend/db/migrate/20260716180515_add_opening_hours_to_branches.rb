class AddOpeningHoursToBranches < ActiveRecord::Migration[7.1]
  def change
    add_column :branches, :opening_hours, :jsonb, default: {}
  end
end
