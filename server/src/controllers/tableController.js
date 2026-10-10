import Table from '../models/Table.js';
import { HttpError } from '../utils/HttpError.js';

export async function listTables(req, res) {
  const tables = await Table.find()
    .collation({ locale: 'en', numericOrdering: true })
    .sort({ name: 1 })
    .populate('currentOrder', 'items subtotal createdAt');

  res.json(tables);
}

export async function createTable(req, res) {
  const { name, capacity } = req.body;
  const table = await Table.create({ name, capacity });
  res.status(201).json(table);
}

export async function deleteTable(req, res) {
  const table = await Table.findById(req.params.id);
  if (!table) throw new HttpError(404, 'Table not found');
  if (table.currentOrder) {
    throw new HttpError(409, 'Table has an open order. Bill or cancel it first.');
  }
  await table.deleteOne();
  res.status(204).end();
}
