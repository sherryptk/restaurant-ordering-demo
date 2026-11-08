class ComboDealItem < ApplicationRecord
  belongs_to :combo_deal
  belongs_to :menu_item
end
