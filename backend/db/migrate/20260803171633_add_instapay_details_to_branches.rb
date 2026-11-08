class AddInstapayDetailsToBranches < ActiveRecord::Migration[7.1]
  def up
    add_column :branches, :instapay_details, :jsonb, default: {}, null: false
  end

  def down
    remove_column :branches, :instapay_details
  end
end
