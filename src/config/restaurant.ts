// The one place a new restaurant is onboarded: its name, logo letter, accent
// colors and tables. Everything else in the app reads from here.

export interface TableDef {
  id: number
  label: string
}

export const RESTAURANT: {
  name: string
  shortName: string
  logoText: string
  accent: { light: string; dark: string }
  onAccent: { light: string; dark: string }
  currency: string
  tables: TableDef[]
} = {
  name: 'Qyou Demo Café',
  shortName: 'Demo Café',
  logoText: 'Q', // letter tile shown when there is no logo image
  accent: { light: '#9A5A0E', dark: '#E0A04A' },
  onAccent: { light: '#FFFFFF', dark: '#1A1208' },
  currency: '₱',
  tables: Array.from({ length: 10 }, (_, i) => ({ id: i + 1, label: `Table ${i + 1}` })),
}

/** Display label for a table id, falling back to `Table {id}` for unknown ids. */
export function tableLabel(id: number): string {
  return RESTAURANT.tables.find(t => t.id === id)?.label ?? `Table ${id}`
}
