export interface MenuItem {
  id: number
  name: string
  price: number
  category: string
  description: string
  available: boolean
}
export const MENU_ITEMS: MenuItem[] = [
  { id: 1,  name: 'Signature Espresso',  price: 120, category: 'Coffee',  description: 'Bold single-origin shot with rich crema',            available: true },
  { id: 2,  name: 'Caramel Macchiato',   price: 165, category: 'Coffee',  description: 'Velvety milk layered with espresso & caramel',        available: true },
  { id: 3,  name: 'Matcha Latte',        price: 175, category: 'Coffee',  description: 'Ceremonial grade matcha with steamed oat milk',       available: true },
  { id: 4,  name: 'Cold Brew',           price: 155, category: 'Coffee',  description: '18-hour steeped, smooth and naturally sweet',         available: true },
  { id: 5,  name: 'Chamomile Honey Tea', price: 110, category: 'Tea',     description: 'Soothing floral with a touch of raw honey',           available: true },
  { id: 6,  name: 'Iced Lemon Verbena',  price: 125, category: 'Tea',     description: 'Refreshing citrus herb blend, served iced',           available: true },
  { id: 7,  name: 'Butter Croissant',    price: 95,  category: 'Pastry',  description: 'Freshly baked with premium European butter',          available: true },
  { id: 8,  name: 'Almond Danish',       price: 115, category: 'Pastry',  description: 'Flaky pastry with house-made almond cream',           available: true },
  { id: 9,  name: 'Avocado Toast',       price: 195, category: 'Food',    description: 'Smashed avo on sourdough, cherry tomato, egg',        available: true },
  { id: 10, name: 'Club Sandwich',       price: 225, category: 'Food',    description: 'Triple-deck with chicken, bacon & house sauce',       available: true },
]
export const CATEGORIES = ['All', 'Coffee', 'Tea', 'Pastry', 'Food'] as const