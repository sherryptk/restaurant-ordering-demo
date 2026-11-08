class CreateAddresses < ActiveRecord::Migration[7.1]
  def change
    create_table :addresses do |t|
      t.references :customer, null: false, foreign_key: true
      t.string :label
      t.string :street, null: false
      t.string :district
      t.string :city
      t.string :building
      t.string :floor
      t.string :apartment
      t.string :notes
      t.decimal :lat, precision: 10, scale: 7
      t.decimal :lng, precision: 10, scale: 7
      t.boolean :is_default, default: false

      t.timestamps
    end
  end
end
