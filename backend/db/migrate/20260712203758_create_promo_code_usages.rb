class CreatePromoCodeUsages < ActiveRecord::Migration[7.1]
  def change
    create_table :promo_code_usages do |t|
      t.references :promo_code, null: false, foreign_key: true
      t.integer :customer_id
      t.string :guest_phone
      t.integer :order_id

      t.timestamps
    end
  end
end
