-- Example seed data for development

-- Insert categories
INSERT INTO categories (label, icon, "order") VALUES
('All', 'food-fork-drink', 0),
('Coffee', 'coffee', 1),
('Tea', 'tea', 2),
('Pastry', 'food-croissant', 3),
('Food', 'food', 4),
('Drinks', 'cup-water', 5)
ON CONFLICT DO NOTHING;

-- Insert menu items (sample)
INSERT INTO menu_items (name, category_id, price, description, icon, "order") VALUES
(
  'Signature Espresso', 
  (SELECT id FROM categories WHERE label = 'Coffee'),
  120,
  'A bold and intense single-origin espresso shot with a rich crema.',
  'coffee-outline',
  1
),
(
  'Caramel Macchiato',
  (SELECT id FROM categories WHERE label = 'Coffee'),
  165,
  'Velvety steamed milk layered with house espresso and caramel sauce.',
  'glass-tulip',
  2
),
(
  'Butter Croissant',
  (SELECT id FROM categories WHERE label = 'Pastry'),
  95,
  'Freshly baked, flaky croissant made with premium European butter.',
  'food-croissant',
  3
),
(
  'Avocado Toast',
  (SELECT id FROM categories WHERE label = 'Food'),
  195,
  'Smashed ripe avocado on sourdough toast with cherry tomatoes and egg.',
  'bread-slice',
  4
)
ON CONFLICT DO NOTHING;

-- Insert tables
INSERT INTO tables (id, label, status) VALUES
(1, 'Window Seat', 'empty'),
(2, 'Center Table', 'empty'),
(3, 'Garden View', 'empty')
ON CONFLICT DO NOTHING;

-- Insert sample staff user (use Supabase Auth instead)
-- This is just a reference - actual staff auth goes through Supabase Auth UI
