import MenuItem from '../models/MenuItem.js';
import { HttpError } from '../utils/HttpError.js';

const EDITABLE_FIELDS = ['name', 'category', 'price', 'isVeg', 'isAvailable'];

function pickEditable(body) {
  const data = {};
  for (const field of EDITABLE_FIELDS) {
    if (body[field] !== undefined) data[field] = body[field];
  }
  return data;
}

export async function listMenuItems(req, res) {
  const filter = {};
  if (req.query.available === 'true') filter.isAvailable = true;

  const items = await MenuItem.find(filter).sort({ category: 1, name: 1 });
  res.json(items);
}

export async function createMenuItem(req, res) {
  const item = await MenuItem.create(pickEditable(req.body));
  res.status(201).json(item);
}

export async function updateMenuItem(req, res) {
  const item = await MenuItem.findById(req.params.id);
  if (!item) throw new HttpError(404, 'Menu item not found');

  item.set(pickEditable(req.body));
  await item.save();
  res.json(item);
}

export async function deleteMenuItem(req, res) {
  // Old orders keep their own copy of name/price, so deleting is safe.
  const item = await MenuItem.findByIdAndDelete(req.params.id);
  if (!item) throw new HttpError(404, 'Menu item not found');
  res.status(204).end();
}
