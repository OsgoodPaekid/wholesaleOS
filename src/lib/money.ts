import { Prisma } from "@prisma/client";

// All money and quantity math goes through Prisma.Decimal so we never coerce to
// a JS float (which would silently lose precision on values like 62.5 or 0.25).
export const D = (value: Prisma.Decimal.Value): Prisma.Decimal =>
  new Prisma.Decimal(value);

export const ZERO = D(0);

// Round to 2 dp for storage/display. HALF_UP matches everyday money rounding.
export const money = (value: Prisma.Decimal.Value): Prisma.Decimal =>
  D(value).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

// Format for the UI. Currency symbol is intentionally simple; change here if needed.
export const formatMoney = (value: Prisma.Decimal.Value): string =>
  `GHS ${money(value).toFixed(2)}`;

export const formatQty = (value: Prisma.Decimal.Value): string => {
  const d = D(value);
  // Show 62.5 not 62.50, but keep 62 as 62.
  return d.equals(d.trunc()) ? d.toFixed(0) : d.toString();
};
