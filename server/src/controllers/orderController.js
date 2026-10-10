import Order, { ORDER_TYPES, ORDER_STATUSES, PAYMENT_MODES } from '../models/Order.js';
import Table from '../models/Table.js';
import MenuItem from '../models/MenuItem.js';
import { nextSequence } from '../models/Counter.js';
import { HttpError } from '../utils/HttpError.js';
import { calculateTotals, validateDiscount } from '../utils/billing.js';
import { parseDateRange } from '../utils/dateRange.js';
import { getTaxRate } from '../config/settings.js';

const MAX_QTY = 999;

async function findOpenOrder(id) {
  const order = await Order.findById(id);
  if (!order) throw new HttpError(404, 'Order not found');
  if (order.status !== 'OPEN') {
    throw new HttpError(409, `Order is already ${order.status.toLowerCase()}`);
  }
  return order;
}

async function releaseTable(order) {
  if (!order.table) return;
  await Table.updateOne({ _id: order.table, currentOrder: order._id }, { currentOrder: null });
}

function formatBillNumber(seq) {
  return `INV-${String(seq).padStart(5, '0')}`;
}

export async function createOrder(req, res) {
  const { orderType, tableId, customerName } = req.body;
  if (!ORDER_TYPES.includes(orderType)) {
    throw new HttpError(400, 'Order type must be DINE_IN or TAKEAWAY');
  }

  const order = new Order({ orderType, customerName, taxRate: getTaxRate() });

  if (orderType === 'DINE_IN') {
    if (!tableId) throw new HttpError(400, 'Please select a table');

    // Claim the table only if it is free. Doing it in one query avoids two
    // waiters opening an order on the same table at the same time.
    const table = await Table.findOneAndUpdate(
      { _id: tableId, currentOrder: null },
      { currentOrder: order._id },
      { returnDocument: 'after' }
    );
    if (!table) {
      const exists = await Table.exists({ _id: tableId });
      throw exists
        ? new HttpError(409, 'This table already has an open order')
        : new HttpError(404, 'Table not found');
    }
    order.table = table._id;
    order.tableName = table.name;
  }

  try {
    await order.save();
  } catch (err) {
    await releaseTable(order);
    throw err;
  }
  res.status(201).json(order);
}

export async function listOrders(req, res) {
  const { status } = req.query;
  if (status && !ORDER_STATUSES.includes(status)) {
    throw new HttpError(400, 'Invalid status');
  }

  if (status === 'OPEN') {
    const orders = await Order.find({ status: 'OPEN' }).sort({ createdAt: 1 });
    return res.json(orders);
  }

  // Billed orders, filtered by the date they were paid
  const { from, to } = parseDateRange(req.query);
  const orders = await Order.find({ status: status || 'PAID', paidAt: { $gte: from, $lte: to } })
    .sort({ paidAt: -1 })
    .limit(500);
  res.json(orders);
}

export async function getOrder(req, res) {
  const order = await Order.findById(req.params.id);
  if (!order) throw new HttpError(404, 'Order not found');
  res.json(order);
}

/**
 * Replaces the items of an open order. The client sends the whole cart:
 * { items: [{ menuItemId, qty }], customerName? }
 */
export async function updateOrder(req, res) {
  const order = await findOpenOrder(req.params.id);
  const { items, customerName } = req.body;

  if (customerName !== undefined) order.customerName = customerName;

  if (items !== undefined) {
    if (!Array.isArray(items)) throw new HttpError(400, 'Items must be a list');

    // merge duplicate lines of the same menu item
    const qtyById = new Map();
    for (const line of items) {
      const qty = Number(line?.qty);
      if (!line?.menuItemId || !Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
        throw new HttpError(400, `Each item needs a valid menu item and a quantity between 1 and ${MAX_QTY}`);
      }
      const id = String(line.menuItemId);
      qtyById.set(id, (qtyById.get(id) || 0) + qty);
    }

    // Lines already on the order keep the price they were added with.
    // New lines are looked up in the menu.
    const existing = new Map(order.items.map((item) => [item.menuItem.toString(), item]));
    const newIds = [...qtyById.keys()].filter((id) => !existing.has(id));
    const menuItems = await MenuItem.find({ _id: { $in: newIds } });
    const menuById = new Map(menuItems.map((m) => [m._id.toString(), m]));

    order.items = [...qtyById.entries()].map(([id, qty]) => {
      const current = existing.get(id);
      if (current) return { menuItem: current.menuItem, name: current.name, price: current.price, qty };

      const menuItem = menuById.get(id);
      if (!menuItem) throw new HttpError(400, 'One of the items is no longer on the menu');
      if (!menuItem.isAvailable) throw new HttpError(400, `${menuItem.name} is not available right now`);
      return { menuItem: menuItem._id, name: menuItem.name, price: menuItem.price, qty };
    });
  }

  // running totals without discount; the discount is applied at checkout
  const { subtotal, discountAmount, taxAmount, total } = calculateTotals(order.items, {
    taxRate: order.taxRate,
  });
  order.set({ subtotal, discountAmount, taxAmount, total });
  await order.save();
  res.json(order);
}

/** Generates the final bill: { paymentMode, discountType, discountValue } */
export async function checkoutOrder(req, res) {
  const { paymentMode, discountType = 'PERCENT' } = req.body;
  const discountValue = Number(req.body.discountValue ?? 0);

  if (!PAYMENT_MODES.includes(paymentMode)) {
    throw new HttpError(400, 'Please select a payment mode');
  }
  const discountError = validateDiscount(discountType, discountValue);
  if (discountError) throw new HttpError(400, discountError);

  const order = await findOpenOrder(req.params.id);
  if (order.items.length === 0) {
    throw new HttpError(400, 'Add at least one item before generating the bill');
  }

  const { subtotal, discountAmount, taxAmount, total } = calculateTotals(order.items, {
    discountType,
    discountValue,
    taxRate: order.taxRate,
  });
  if (discountType === 'FLAT' && discountValue > subtotal) {
    throw new HttpError(400, 'Discount cannot be more than the bill amount');
  }

  // Only an OPEN order can be marked as paid. If the button is clicked twice,
  // the second request finds nothing and gets a 409 instead of a second bill.
  const paid = await Order.findOneAndUpdate(
    { _id: order._id, status: 'OPEN' },
    {
      status: 'PAID',
      paymentMode,
      discountType,
      discountValue,
      subtotal,
      discountAmount,
      taxAmount,
      total,
      paidAt: new Date(),
    },
    { returnDocument: 'after' }
  );
  if (!paid) throw new HttpError(409, 'Order is already billed or cancelled');

  paid.billNumber = formatBillNumber(await nextSequence('bill'));
  await paid.save();
  await releaseTable(paid);

  res.json(paid);
}

export async function cancelOrder(req, res) {
  const order = await Order.findOneAndUpdate(
    { _id: req.params.id, status: 'OPEN' },
    { status: 'CANCELLED' },
    { returnDocument: 'after' }
  );
  if (!order) {
    const exists = await Order.exists({ _id: req.params.id });
    throw exists
      ? new HttpError(409, 'Only open orders can be cancelled')
      : new HttpError(404, 'Order not found');
  }

  await releaseTable(order);
  res.json(order);
}
