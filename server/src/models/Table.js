import mongoose from 'mongoose';

const tableSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Table name is required'], trim: true, maxlength: 20 },
    capacity: { type: Number, default: 4, min: [1, 'Capacity must be at least 1'] },
    // The open order sitting on this table. null means the table is free.
    currentOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  },
  { timestamps: true }
);

tableSchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

export default mongoose.model('Table', tableSchema);
