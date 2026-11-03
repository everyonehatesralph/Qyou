# Qyou — QR table ordering

A progressive web app for restaurant table ordering with real-time status tracking, built for local network deployment.

## Tech Stack

- **Frontend**: React 18 + TypeScript + TailwindCSS
- **Database**: Supabase (PostgreSQL + Real-time subscriptions)
- **Auth**: Supabase Auth (Email for staff)
- **Routing**: React Router v6
- **Animations**: Framer Motion
- **Server**: Vite dev server or Express.js (local network hosting on Raspberry Pi/PC)

## Setup

### Prerequisites
- Node.js 18+
- Supabase account
- Local network connection

### Installation

```bash
npm install
```

### Configuration

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_url
   VITE_SUPABASE_ANON_KEY=your_key
   ```

3. Set your local network IP:
   ```
   VITE_SERVER_HOST=192.168.1.100
   ```

### Running Locally

Development server (Vite):
```bash
npm run dev
```

Production build:
```bash
npm run build
npm run preview
```

Express server:
```bash
npm run server
```

## Architecture

### Folder Structure

```
src/
├── pages/
│   ├── customer/     # Customer ordering screens
│   └── staff/        # Staff dashboard & management
├── components/       # Reusable React components
├── services/         # Supabase CRUD operations
├── context/          # Global state (AppContext, StaffContext)
├── hooks/            # Custom hooks for business logic
├── types/            # TypeScript interfaces
└── utils/            # Helper functions
```

### Key Features

1. **Token-Based Table Access**
   - Staff generates table tokens
   - Customers scan QR → enter name → validated token

2. **Real-Time Updates**
   - Supabase subscriptions (onSnapshot)
   - Live order status tracking
   - Live menu updates

3. **Security Layers**
   - Order cooldown: 2-minute wait between orders
   - Staff confirmation gate before kitchen
   - Row-level security in Firestore

4. **Staff Dashboard**
   - Table grid (color-coded status)
   - Pending orders queue
   - Menu management

## Guest WiFi Setup

For customer access on local network:

1. Create guest WiFi network
2. Print QR codes with URL: `http://192.168.1.100:3000/table/[id]?token=[token]`
3. Customers scan on their phones
4. App validates token and loads ordering interface

## Database Schema

See `firebase/` for Firestore rules.

Collections:
- `tables` - Restaurant tables with status
- `orders` - Customer orders with items
- `menuItems` - Menu catalog
- `categories` - Item categories
- `staff` - Staff authentication

## Deployment

On Raspberry Pi / Local PC:

1. Build: `npm run build`
2. Serve: `npm run server`
3. Access: `http://192.168.1.100:3000`

## License

Proprietary - Qyou
