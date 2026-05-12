-- Supabase Row Level Security (RLS) Policies
-- These control who can read/write data

-- 1. Tables - Anyone can read, only staff can modify
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all to read tables" ON tables FOR SELECT USING (true);

CREATE POLICY "Only staff can update tables" ON tables FOR UPDATE 
USING (auth.role() = 'authenticated' AND EXISTS (
  SELECT 1 FROM staff_users WHERE id = auth.uid()
));

-- 2. Menu Items - Anyone can read, only staff can modify
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all to read menu items" ON menu_items FOR SELECT USING (true);

CREATE POLICY "Only staff can modify menu items" ON menu_items FOR ALL
USING (auth.role() = 'authenticated' AND EXISTS (
  SELECT 1 FROM staff_users WHERE id = auth.uid()
));

-- 3. Categories - Anyone can read, only staff can modify
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all to read categories" ON categories FOR SELECT USING (true);

CREATE POLICY "Only staff can modify categories" ON categories FOR ALL
USING (auth.role() = 'authenticated' AND EXISTS (
  SELECT 1 FROM staff_users WHERE id = auth.uid()
));

-- 4. Orders - Customers can only see their own orders, staff can see all
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view their table's orders" ON orders FOR SELECT
USING (
  table_id = (SELECT table_id FROM tables WHERE active_token = current_setting('app.current_token', true)::text)
  OR auth.role() = 'authenticated'
);

CREATE POLICY "Only staff can insert/update orders" ON orders FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Only staff can update order status" ON orders FOR UPDATE
USING (auth.role() = 'authenticated' AND EXISTS (
  SELECT 1 FROM staff_users WHERE id = auth.uid()
));

-- 5. Order Items - Inherit from orders
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow reading order items" ON order_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_items.order_id 
    AND (
      orders.table_id = (SELECT table_id FROM tables WHERE active_token = current_setting('app.current_token', true)::text)
      OR auth.role() = 'authenticated'
    )
  )
);

-- 6. Staff Users - Only authenticated staff can read
ALTER TABLE staff_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only authenticated users can view staff" ON staff_users FOR SELECT
USING (auth.role() = 'authenticated');
