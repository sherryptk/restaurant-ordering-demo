# Demo data for a fictional café. Every name, number and account here is made up.

puts "=== Seeding Restaurant ==="
restaurant = Restaurant.find_or_create_by!(slug: "demo-cafe") do |r|
  r.name = "Demo Café"
  r.description = "Waffles, crêpes and coffee — a sample menu for trying the app"
  r.city = "Alexandria"
  r.currency = "EGP"
  r.delivery_fee = 20.00
  r.min_order_amount = 50.00
  r.estimated_pickup_minutes = 20
  r.estimated_delivery_minutes = 45
  r.accepts_pickup = true
  r.accepts_delivery = true
  r.is_open = true
  r.timezone = "Africa/Cairo"
  r.payment_gateway = "cash"
end
puts "Restaurant: #{restaurant.name}"

puts "=== Seeding Admin ==="
admin = Admin.find_or_create_by!(email: "admin@example.com") do |a|
  a.password = "password123"
  a.password_confirmation = "password123"
  a.name = "Demo Admin"
  a.role = :admin
end
puts "Admin: #{admin.email} / password123"

puts "=== Seeding Branch ==="
branch = Branch.find_or_create_by!(slug: "demo-cafe-downtown") do |b|
  b.restaurant = restaurant
  b.name = "Demo Café — Downtown"
  b.name_ar = "ديمو كافيه — وسط البلد"
  b.city = "Alexandria"
  b.lat = 31.2001
  b.lng = 29.9187
  b.delivery_fee = 20.00
  b.min_order_amount = 50.00
  b.estimated_pickup_minutes = 20
  b.estimated_delivery_minutes = 45
  b.accepts_pickup = true
  b.accepts_delivery = true
  b.is_open = true
  b.delivery_zone = []
  b.instapay_details = {
    "bank_name" => "Example Bank",
    "bank_name_ar" => "بنك تجريبي",
    "account_number" => "0000000000000000",
    "iban" => nil,
    "beneficiary_name" => "Demo Café",
    "currency" => "EGP"
  }
end
puts "Branch: #{branch.name}"

puts "=== Seeding Menu ==="
menu = [
  {
    category: { name: "Waffles", name_ar: "وافل" },
    items: [
      {
        name: "Classic Waffle", name_ar: "وافل كلاسيك", price: 120, featured: true,
        description: "Crisp Belgian waffle with your choice of sauce.",
        options: [
          { name: "Sauce", name_ar: "الصوص", required: true, multi_select: false, max_selections: 1,
            choices: [["Caramel", "كراميل", 0], ["Chocolate", "شوكولاتة", 0], ["Lotus", "لوتس", 15]] },
          { name: "Extras", name_ar: "إضافات", required: false, multi_select: true, max_selections: 3,
            choices: [["Banana", "موز", 10], ["Strawberries", "فراولة", 15], ["Ice cream scoop", "بولة آيس كريم", 25]] }
        ]
      },
      {
        name: "Pistachio Waffle", name_ar: "وافل فستق", price: 165,
        description: "Waffle with pistachio cream and crushed pistachios.",
        options: []
      }
    ]
  },
  {
    category: { name: "Crêpes", name_ar: "كريب" },
    items: [
      {
        name: "Sweet Crêpe", name_ar: "كريب حلو", price: 110,
        description: "Thin crêpe folded with your filling of choice.",
        options: [
          { name: "Filling", name_ar: "الحشو", required: true, multi_select: false, max_selections: 1,
            choices: [["Hazelnut chocolate", "شوكولاتة بالبندق", 0], ["Honey & banana", "عسل وموز", 0], ["Mixed fruit", "فواكه مشكلة", 20]] }
        ]
      },
      {
        name: "Chicken Crêpe", name_ar: "كريب فراخ", price: 140,
        description: "Grilled chicken, mozzarella and peppers.",
        options: []
      }
    ]
  },
  {
    category: { name: "Drinks", name_ar: "مشروبات" },
    items: [
      {
        name: "Cappuccino", name_ar: "كابتشينو", price: 60,
        description: "Double shot with steamed milk.",
        options: [
          { name: "Size", name_ar: "الحجم", required: true, multi_select: false, max_selections: 1,
            choices: [["Regular", "عادي", 0], ["Large", "كبير", 15]] }
        ]
      },
      {
        name: "Fresh Orange Juice", name_ar: "عصير برتقال فريش", price: 55,
        description: "Squeezed to order.",
        options: []
      }
    ]
  }
]

menu.each_with_index do |section, cat_pos|
  category = Category.find_or_create_by!(restaurant: restaurant, name: section[:category][:name]) do |c|
    c.name_ar = section[:category][:name_ar]
    c.position = cat_pos
  end

  section[:items].each_with_index do |item, item_pos|
    menu_item = MenuItem.find_or_create_by!(category: category, name: item[:name]) do |m|
      m.name_ar = item[:name_ar]
      m.description = item[:description]
      m.price = item[:price]
      m.featured = item.fetch(:featured, false)
      m.position = item_pos
    end
    MenuItemBranch.find_or_create_by!(menu_item: menu_item, branch: branch)

    item[:options].each_with_index do |opt, opt_pos|
      option = MenuItemOption.find_or_create_by!(menu_item: menu_item, name: opt[:name]) do |o|
        o.name_ar = opt[:name_ar]
        o.required = opt[:required]
        o.multi_select = opt[:multi_select]
        o.max_selections = opt[:max_selections]
        o.position = opt_pos
      end

      opt[:choices].each_with_index do |(label, label_ar, delta), choice_pos|
        MenuItemChoice.find_or_create_by!(menu_item_option: option, label: label) do |ch|
          ch.label_ar = label_ar
          ch.price_delta = delta
          ch.position = choice_pos
        end
      end
    end
  end
end
puts "Menu: #{Category.count} categories, #{MenuItem.count} items"

puts "=== Done ==="
