import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// Teach tailwind-merge the custom radius and shadow names from tailwind.config.js
const twMerge = extendTailwindMerge({
  extend: {
    theme: { borderRadius: ['control', 'card', 'sheet'] },
    classGroups: { shadow: [{ shadow: ['pop', 'lift'] }] },
  },
})

/** Joins class names and resolves Tailwind conflicts (later classes win). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
