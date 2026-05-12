# Supabase Setup Instructions

## 1. Create Supabase Project
- Go to https://supabase.com
- Create new project
- Copy credentials to `.env.local`

## 2. Run Migrations
In Supabase SQL Editor, run these files in order:
1. `001_initial_schema.sql` - Create tables
2. `002_rls_policies.sql` - Row level security
3. `003_helper_functions.sql` - Helper functions
4. `004_seed_data.sql` - Sample data

## 3. Enable Auth
- Go to Auth > Users in Supabase
- Enable Email authentication
- Staff will sign up via email

## 4. Environment Variables
Copy to `.env.local`:
```
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Database Schema

### Tables
- `tables` - Restaurant tables with status & tokens
- `menu_items` - Menu catalog
- `categories` - Menu categories
- `orders` - Customer orders
- `order_items` - Items in each order
- `staff_users` - Staff authentication

## Row Level Security (RLS)
- Customers see only their table's orders
- Staff can see all data
- Menu is public readable
- Only authenticated staff can modify anything

## Realtime Subscriptions
Supabase automatically provides real-time updates via WebSocket:
```typescript
supabase
  .from('orders')
  .on('*', (payload) => console.log(payload))
  .subscribe()
```
