// Same formula as server/src/utils/billing.js. Used only to preview totals
// while the cashier types a discount; the server recalculates the final bill.

export function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateTotals(items, { discountType = 'PERCENT', discountValue = 0, taxRate }) {
  const subtotal = round2(items.reduce((sum, item) => sum + item.price * item.qty, 0));

  let discountAmount =
    discountType === 'PERCENT' ? (subtotal * discountValue) / 100 : discountValue;
  discountAmount = round2(Math.min(Math.max(discountAmount, 0), subtotal));

  const taxableAmount = round2(subtotal - discountAmount);
  const taxAmount = round2((taxableAmount * taxRate) / 100);
  const total = round2(taxableAmount + taxAmount);

  return { subtotal, discountAmount, taxableAmount, taxAmount, total };
}

/** GST is shown on the bill as two equal halves: CGST and SGST. */
export function splitGst(taxAmount) {
  const cgst = round2(taxAmount / 2);
  return { cgst, sgst: round2(taxAmount - cgst) };
}
