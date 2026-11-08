class RemoveCountTypeFromDenominationCounts < ActiveRecord::Migration[7.1]
  def change
    remove_column :denomination_counts, :count_type, :integer
  end
end
