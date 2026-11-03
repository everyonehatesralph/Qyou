/** Fixed order ids for seeded orders, so routes like /order/<id> and "my orders" can point at them. */
export const seedId = (n: number) => `00000000-0000-4000-8000-0000000${90000 + n}`

/** The dev server's staff PIN (QYOU_STAFF_PIN in playwright.config.ts). */
export const STAFF_PIN = '123456'
