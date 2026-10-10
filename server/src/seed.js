// Resets the database with a sample menu and tables.
// Usage: npm run seed   (WARNING: deletes existing menu, tables and orders)
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import MenuItem from './models/MenuItem.js';
import Table from './models/Table.js';
import Order from './models/Order.js';
import Counter from './models/Counter.js';

const menu = [
  ['Paneer Tikka', 'Starters', 240, true],
  ['Veg Spring Roll', 'Starters', 180, true],
  ['Hara Bhara Kabab', 'Starters', 200, true],
  ['Chicken Tikka', 'Starters', 280, false],
  ['Chicken 65', 'Starters', 260, false],
  ['Tomato Soup', 'Soups', 120, true],
  ['Sweet Corn Soup', 'Soups', 130, true],
  ['Paneer Butter Masala', 'Main Course', 280, true],
  ['Dal Makhani', 'Main Course', 220, true],
  ['Kadai Paneer', 'Main Course', 270, true],
  ['Mix Veg', 'Main Course', 210, true],
  ['Butter Chicken', 'Main Course', 340, false],
  ['Chicken Curry', 'Main Course', 300, false],
  ['Veg Biryani', 'Rice & Biryani', 220, true],
  ['Chicken Biryani', 'Rice & Biryani', 300, false],
  ['Jeera Rice', 'Rice & Biryani', 150, true],
  ['Tandoori Roti', 'Breads', 25, true],
  ['Butter Naan', 'Breads', 50, true],
  ['Garlic Naan', 'Breads', 60, true],
  ['Lachha Paratha', 'Breads', 55, true],
  ['Masala Chaas', 'Beverages', 60, true],
  ['Sweet Lassi', 'Beverages', 80, true],
  ['Fresh Lime Soda', 'Beverages', 70, true],
  ['Mineral Water', 'Beverages', 20, true],
  ['Gulab Jamun', 'Desserts', 90, true],
  ['Rasmalai', 'Desserts', 110, true],
];

async function seed() {
  await connectDB(process.env.MONGODB_URI);

  await Promise.all([
    MenuItem.deleteMany({}),
    Table.deleteMany({}),
    Order.deleteMany({}),
    Counter.deleteMany({}),
  ]);

  await MenuItem.insertMany(
    menu.map(([name, category, price, isVeg]) => ({ name, category, price, isVeg }))
  );
  await Table.insertMany(
    Array.from({ length: 10 }, (_, i) => ({ name: `T${i + 1}`, capacity: i < 6 ? 4 : 6 }))
  );
  // make sure unique indexes exist before the app starts using the collections
  await Promise.all([MenuItem.syncIndexes(), Table.syncIndexes(), Order.syncIndexes()]);

  console.log(`Seeded ${menu.length} menu items and 10 tables.`);
}

seed()
  .catch((err) => {
    console.error('Seeding failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
