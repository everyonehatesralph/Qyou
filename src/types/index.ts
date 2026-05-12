// TypeScript interfaces for the entire app
// This file will be expanded as we build each component

export interface Table {
  id: number;
  label: string;
  status: 'empty' | 'active' | 'occupied';
  activeToken?: string | null;
  activatedAt?: string | null;
  customerName?: string | null;
}

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  icon: string;
  disabled: boolean;
  order: number;
}

export interface Category {
  id: string;
  label: string;
  icon: string;
  order: number;
}

export interface CartItem extends MenuItem {
  quantity: number;
  notes: string;
  cartId: string;
}

export interface Order {
  id: string;
  tableId: number;
  customerName: string;
  items: CartItem[];
  status: 'pending' | 'confirmed' | 'ready';
  total: number;
  createdAt: string;
  updatedAt: string;
}

export interface TableSession {
  tableId: number;
  token: string;
  customerName: string;
  createdAt: string;
  expiresAt: string;
}
