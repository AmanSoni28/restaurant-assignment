import mongoose from 'mongoose';
import { DISCOUNT_TYPES } from '../utils/billing.js';

export const ORDER_TYPES = ['DINE_IN', 'TAKEAWAY'];
export const ORDER_STATUSES = ['OPEN', 'PAID', 'CANCELLED'];
export const PAYMENT_MODES = ['CASH', 'UPI', 'CARD'];

// Name and price are copied from the menu when the item is added, so that
// editing the menu later does not change old bills.
const orderItemSchema = new mongoose.Schema(
  {
    menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderType: { type: String, enum: ORDER_TYPES, required: true },
    table: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', default: null },
    tableName: { type: String, default: null },
    customerName: { type: String, trim: true, maxlength: 60, default: '' },
    items: { type: [orderItemSchema], default: [] },
    status: { type: String, enum: ORDER_STATUSES, default: 'OPEN' },

    discountType: { type: String, enum: DISCOUNT_TYPES, default: 'PERCENT' },
    discountValue: { type: Number, default: 0, min: 0 },
    taxRate: { type: Number, required: true, min: 0 },

    subtotal: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },

    // filled in when the bill is generated
    billNumber: { type: String },
    paymentMode: { type: String, enum: PAYMENT_MODES },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

orderSchema.index({ billNumber: 1 }, { unique: true, sparse: true });
orderSchema.index({ status: 1, paidAt: -1 });

export default mongoose.model('Order', orderSchema);
