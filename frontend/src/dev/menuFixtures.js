// Dev-only worst-case menu data for stress-testing the bulk editor.
// Selected with ?data=worst | empty | one | huge (see DataToggle). Never reaches production:
// every import of this file is behind import.meta.env.DEV.

let nextId = -1
const id = () => nextId--

const item = (over) => ({
  id: id(),
  category_id: 0,
  name: 'Item',
  name_ar: null,
  description: null,
  description_ar: null,
  price: '50.0',
  compare_at_price: null,
  offer_badge: null,
  available: true,
  featured: false,
  position: 0,
  tags: [],
  image_url: null,
  options_count: 0,
  ...over,
})

const category = (name, items, over = {}) => ({
  id: id(),
  name,
  name_ar: null,
  description: null,
  description_ar: null,
  position: 0,
  visible: true,
  item_count: items.length,
  items,
  ...over,
})

const worst = () => [
  category(
    'Signature Waffles, Crêpes & Seasonal Sharing Platters — Winter Collection (Limited Time Only)',
    [
      item({
        name: 'Dubai Chocolate Pistachio Kunafa Stuffed Belgian Waffle with Salted Caramel Drizzle and Fresh Strawberries (Large, Serves 2–3)',
        name_ar: 'وافل بلجيكي محشو بالكنافة والفستق والشوكولاتة الدبي مع صلصة الكراميل المملح والفراولة الطازجة (حجم كبير يكفي ٢–٣ أشخاص)',
        price: '185.0',
        options_count: 8,
      }),
      item({ name: 'Supercalifragilisticexpialidocious_Cinnamon_Roll_Deluxe_Triple_Chocolate_Caramel_Filled', price: '1250.5' }),
      item({ name: 'J', name_ar: 'ج', price: '0.0' }),
      item({ name: '  Sam   Lee ', price: '27.0' }),
      item({ name: '🍫 Choco Lava 👩🏽‍💻', price: '99999999.99', options_count: 1 }),
      item({ name: '<script>alert(1)</script> & **bold** &amp;', price: '12.0' }),
      item({
        name: 'نور الهدى — وافل بالشوكولاتة والفستق المحمص',
        name_ar: 'نور الهدى — وافل بالشوكولاتة والفستق المحمص',
        price: '95.0',
      }),
      item({
        name: 'Molten Cake Nutella + Cappuccino Offer',
        price: '120.0',
        compare_at_price: '160.0',
        offer_badge: 'Limited-time offer ends Friday at midnight — save 25% on your whole order',
        options_count: 2,
      }),
      item({ name: 'Plain Waffle', price: '40.0' }),
      item({ name: 'Plain Waffle', price: '45.0', available: false }),
      item({ name: 'Đặng Thị Ngọc Hân Special', name_ar: null, price: '0.1', options_count: 0 }),
    ]
  ),
  category('Empty Category', []),
  category('Drinks', [item({ name: 'Cola', price: '20.0' }), item({ name: 'Water', price: '5.0', available: false })], {
    name_ar: 'مشروبات',
  }),
]

const one = () => [category('Only Category', [item({ name: 'Only Item', price: '10.0' })])]

const huge = () =>
  Array.from({ length: Number(new URLSearchParams(window.location.search).get('n')) || 12 }, (_, c) =>
    category(
      `Category ${c + 1}`,
      Array.from({ length: 40 }, (_, i) =>
        item({
          name: `Menu item ${c * 40 + i + 1} with a reasonably descriptive name`,
          name_ar: `صنف رقم ${c * 40 + i + 1}`,
          price: String(10 + ((c * 40 + i) % 90)),
          options_count: i % 4,
        })
      )
    )
  )

export function fixtureFor(mode) {
  nextId = -1
  return { worst, empty: () => [], one, huge }[mode]?.() ?? null
}

// Options for a fixture item. A few items get a deliberately awful tree.
export function fixtureOptions(itemId) {
  const heavy = itemId === -2 // the first item: 8 groups × 10 choices
  const groups = heavy ? 8 : 2
  return {
    options: Array.from({ length: groups }, (_, g) => ({
      id: itemId * 100 - g,
      name: g === 0 ? 'Choose your toppings (up to 5, extra toppings are charged separately)' : `Option group ${g + 1}`,
      name_ar: g === 0 ? 'اختر الإضافات (حتى ٥ إضافات، الإضافات الزائدة بسعر إضافي)' : null,
      required: g % 2 === 0,
      multi_select: g % 3 === 0,
      max_selections: g % 3 === 0 ? 5 : null,
      position: g,
      choices:
        g === 3
          ? []
          : Array.from({ length: heavy ? 10 : 2 }, (_, c) => ({
              id: itemId * 1000 - g * 20 - c,
              label: c === 0 ? 'Extra-large portion of whipped cream and crushed roasted pistachios' : `Choice ${c + 1}`,
              label_ar: c === 0 ? 'حصة كبيرة جدا من الكريمة المخفوقة والفستق المحمص المطحون' : null,
              price_delta: c === 1 ? '-15.0' : String(c * 5),
              available: c % 4 !== 3,
              position: c,
            })),
    })),
  }
}
