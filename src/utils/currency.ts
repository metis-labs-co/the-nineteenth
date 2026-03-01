/**
 * Shared currency formatting and calculation utilities.
 *
 * Used by both skins and wolf game calculations.
 */

/** Decimal precision for currency calculations */
export const CURRENCY_PRECISION = 2;

/**
 * Round a number to currency precision (2 decimal places).
 *
 * @param value - Number to round
 * @returns Rounded number
 */
export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Format a number as currency (e.g., "$12.50")
 *
 * @param value - Number to format
 * @returns Formatted currency string
 *
 * @example
 * formatCurrency(12.5) // Returns "$12.50"
 * formatCurrency(0) // Returns "$0.00"
 */
export function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`;
}

/**
 * Format a net result with + or - sign
 *
 * @param value - Net result value (positive or negative)
 * @returns Formatted string with sign prefix
 *
 * @example
 * formatNetResult(22.50) // Returns "+$22.50"
 * formatNetResult(-12.50) // Returns "-$12.50"
 * formatNetResult(0) // Returns "$0.00"
 */
export function formatNetResult(value: number): string {
  if (value > 0) {
    return `+$${value.toFixed(2)}`;
  } else if (value < 0) {
    return `-$${Math.abs(value).toFixed(2)}`;
  }
  return '$0.00';
}
