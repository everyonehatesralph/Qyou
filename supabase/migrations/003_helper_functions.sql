-- Supabase configuration and helper functions

-- Helper function to generate secure tokens
CREATE OR REPLACE FUNCTION generate_table_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Helper function to check if table token is valid
CREATE OR REPLACE FUNCTION is_table_token_valid(token TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM tables 
    WHERE active_token = token 
    AND activated_at > NOW() - INTERVAL '8 hours'
  );
END;
$$ LANGUAGE plpgsql;

-- Helper function to get table ID from token
CREATE OR REPLACE FUNCTION get_table_id_from_token(token TEXT)
RETURNS INT AS $$
BEGIN
  RETURN (
    SELECT id FROM tables 
    WHERE active_token = token 
    AND activated_at > NOW() - INTERVAL '8 hours'
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply timestamp triggers
CREATE TRIGGER update_tables_updated_at BEFORE UPDATE ON tables
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
