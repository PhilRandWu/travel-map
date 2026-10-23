const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** Strict YYYY-MM-DD validation that rejects impossible calendar dates. */
export function isValidISODate(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
}

/** Compare two YYYY-MM-DD strings: a < b → -1. */
export function compareDate(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}
