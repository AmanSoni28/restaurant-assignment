import Order from '../models/Order.js';
import { parseDateRange } from '../utils/dateRange.js';

/** Sales summary of paid bills in a date range (defaults to today). */
export async function salesSummary(req, res) {
  const { from, to } = parseDateRange(req.query);
  const match = { status: 'PAID', paidAt: { $gte: from, $lte: to } };

  const [totals] = await Order.aggregate([
    { $match: match },
    { $group: { _id: null, totalSales: { $sum: '$total' }, billCount: { $sum: 1 } } },
  ]);

  const byPaymentMode = await Order.aggregate([
    { $match: match },
    { $group: { _id: '$paymentMode', amount: { $sum: '$total' }, count: { $sum: 1 } } },
    { $sort: { amount: -1 } },
  ]);

  const openOrders = await Order.countDocuments({ status: 'OPEN' });

  res.json({
    from,
    to,
    totalSales: Math.round((totals?.totalSales ?? 0) * 100) / 100,
    billCount: totals?.billCount ?? 0,
    byPaymentMode: byPaymentMode.map((p) => ({ mode: p._id, amount: p.amount, count: p.count })),
    openOrders,
  });
}
