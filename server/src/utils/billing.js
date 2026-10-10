export const DISCOUNT_TYPES = ['PERCENT', 'FLAT'];

export function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates bill totals for a list of order items.
 * GST is applied on the amount after discount.
 *
 * @param {Array<{price: number, qty: number}>} items
 * @param {{ discountType?: 'PERCENT'|'FLAT', discountValue?: number, taxRate: number }} options
 */
export function calculateTotals(items, { discountType = 'PERCENT', discountValue = 0, taxRate }) {
  const subtotal = round2(items.reduce((sum, item) => sum + item.price * item.qty, 0));

  let discountAmount =
    discountType === 'PERCENT' ? (subtotal * discountValue) / 100 : discountValue;
  // never discount more than the bill itself
  discountAmount = round2(Math.min(Math.max(discountAmount, 0), subtotal));

  const taxableAmount = round2(subtotal - discountAmount);
  const taxAmount = round2((taxableAmount * taxRate) / 100);
  const total = round2(taxableAmount + taxAmount);

  return { subtotal, discountAmount, taxableAmount, taxAmount, total };
}

/** Returns an error message if the discount is invalid, otherwise null. */
export function validateDiscount(discountType, discountValue) {
  if (!DISCOUNT_TYPES.includes(discountType)) {
    return 'Discount type must be PERCENT or FLAT';
  }
  if (typeof discountValue !== 'number' || Number.isNaN(discountValue) || discountValue < 0) {
    return 'Discount must be a positive number';
  }
  if (discountType === 'PERCENT' && discountValue > 100) {
    return 'Discount percentage cannot be more than 100';
  }
  return null;
}
