export interface MenuItem {
  id: number
  name: string
  price: number
  category: string
  description: string
  available: boolean
  /** Extras picked at checkout (oat milk, extra shot); not listed on the menu itself. */
  addon?: boolean
  /** Built-in photo (public/menu); staff can replace it from the staff menu. */
  image?: string
}

// The starting menu. Once the order backend has a menu (Supabase menu_items or the
// order server's menu.json), staff edit it in the app and this list is only the seed.

export const MENU_ITEMS: MenuItem[] = [
  { id: 1,  name: 'Signature Espresso',  price: 120, category: 'Coffee',  description: 'Bold single-origin shot with rich crema',            available: true, image: '/menu/signature-espresso.webp' },
  { id: 2,  name: 'Caramel Macchiato',   price: 165, category: 'Coffee',  description: 'Velvety milk layered with espresso & caramel',        available: true, image: '/menu/caramel-macchiato.webp' },
  { id: 3,  name: 'Matcha Latte',        price: 175, category: 'Coffee',  description: 'Ceremonial grade matcha with steamed oat milk',       available: true, image: '/menu/matcha-latte.webp' },
  { id: 4,  name: 'Cold Brew',           price: 155, category: 'Coffee',  description: '18-hour steeped, smooth and naturally sweet',         available: true, image: '/menu/cold-brew.webp' },
  { id: 5,  name: 'Chamomile Honey Tea', price: 110, category: 'Tea',     description: 'Soothing floral with a touch of raw honey',           available: true, image: '/menu/chamomile-honey-tea.webp' },
  { id: 6,  name: 'Iced Lemon Verbena',  price: 125, category: 'Tea',     description: 'Refreshing citrus herb blend, served iced',           available: true, image: '/menu/iced-lemon-verbena.webp' },
  { id: 7,  name: 'Butter Croissant',    price: 95,  category: 'Pastry',  description: 'Freshly baked with premium European butter',          available: true, image: '/menu/butter-croissant.webp' },
  { id: 8,  name: 'Almond Danish',       price: 115, category: 'Pastry',  description: 'Flaky pastry with house-made almond cream',           available: true, image: '/menu/almond-danish.webp' },
  { id: 9,  name: 'Avocado Toast',       price: 195, category: 'Food',    description: 'Smashed avo on sourdough, cherry tomato, egg',        available: true, image: '/menu/avocado-toast.webp' },
  { id: 10, name: 'Club Sandwich',       price: 225, category: 'Food',    description: 'Triple-deck with chicken, bacon & house sauce',       available: true, image: '/menu/club-sandwich.webp' },
]

export const ADD_ONS: MenuItem[] = [
  { id: 101, name: 'Extra Espresso Shot', price: 30, category: 'Add-ons', description: '', available: true, addon: true },
  { id: 102, name: 'Oat Milk Upgrade',    price: 25, category: 'Add-ons', description: '', available: true, addon: true },
  { id: 103, name: 'Extra Sugar',         price: 0,  category: 'Add-ons', description: '', available: true, addon: true },
  { id: 104, name: 'Less Ice',            price: 0,  category: 'Add-ons', description: '', available: true, addon: true },
  { id: 105, name: 'Whipped Cream',       price: 20, category: 'Add-ons', description: '', available: true, addon: true },
  { id: 106, name: 'Caramel Syrup',       price: 15, category: 'Add-ons', description: '', available: true, addon: true },
]

/** Everything the server prices: menu items and add-ons. */
export const SEED_MENU: MenuItem[] = [...MENU_ITEMS, ...ADD_ONS]

/** Built-in photos by item id. The live menu comes from the backend without photos, so they're added back from here. */
export const BUILT_IN_PHOTOS = new Map(SEED_MENU.filter(m => m.image).map(m => [m.id, m.image!]))

export const MENU_CATEGORIES = ['Coffee', 'Tea', 'Pastry', 'Food'] as const
export const CATEGORIES = ['All', ...MENU_CATEGORIES] as const
