import { RESTAURANT } from '../config/restaurant'

/** Money in the restaurant's currency, whole units by default: ₱165 */
export function peso(amount: number, digits = 0): string {
  return `${RESTAURANT.currency}${amount.toFixed(digits)}`
}
