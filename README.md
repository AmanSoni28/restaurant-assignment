# Restaurant Billing & Management System

A small web app that handles the everyday billing flow of a restaurant:
**pick a table (or takeaway) → add items → generate and print the bill**, plus menu management and a sales view.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, React Router, Tailwind CSS, Axios, react-hot-toast, lucide-react (icons) |
| Backend | Node.js (v20+), Express 5 |
| Database | MongoDB with Mongoose |
| Tests | Node's built-in test runner (`node --test`) |

## Features

**Tables & orders**
- Table grid showing free/occupied tables, with item count, running amount and time since the order started.
- Click a free table to start a dine-in order. Click an occupied table to continue it.
- Takeaway orders, with an optional customer name.
- A table can only have one open order. This is enforced on the server with an atomic update, so two staff members can't open the same table at the same time.
- Add/delete tables (a table with an open order can't be deleted).
- The page refreshes every 20 seconds so several devices stay in sync.

**Taking an order**
- Menu grid with category filter and search. Typing a name and pressing **Enter** adds the first match, so the menu can be operated from the keyboard.
- Quantity +/- and remove buttons, and a live subtotal.
- Changes are **auto-saved**. Closing the browser or going back does not lose the order.
- Unavailable menu items are hidden from the order screen.
- Cancel an order (frees the table).

**Billing**
- Discount as a percentage or a flat amount, with validation.
- GST (default 5%, configurable) applied after the discount and shown as CGST + SGST.
- Payment mode: Cash / UPI / Card.
- Sequential bill numbers (`INV-00001`, ...).
- Responsive layout: sidebar on desktop; bottom tabs and a slide-up order sheet on phones.
- Printable receipt-style bill (`Print bill` uses the browser print dialog; the navigation is hidden when printing).
- Protection against double billing: clicking "Generate bill" twice does not create two bills.

**Menu management**
- Add / edit / delete items (name, category, price, veg/non-veg, available).
- One-click availability toggle (e.g. when an item runs out).
- Item names are unique (case-insensitive).

**Bills & sales**
- List of bills for a date range, with search by bill number, table or customer.
- Totals for the period: total sales, bill count and split by payment mode.
- Today's sales and open orders on the home screen.

## Architecture

```
client/                React SPA (Vite)
  src/api/             Axios instance + one small module per resource
  src/pages/           One component per screen (Tables, Order, Bill, Bills, Menu)
  src/components/      Shared UI (layout, modal, loaders, stat cards)
  src/utils/           Formatting, bill preview calculation, useApi data hook

server/                REST API (Express)
  src/models/          Mongoose schemas: MenuItem, Table, Order, Counter
  src/controllers/     Request handling and business rules
  src/routes/          URL → controller mapping
  src/middleware/      404 + central error handler
  src/utils/billing.js Bill calculation (single source of truth, unit tested)
  src/seed.js          Sample menu and tables
  test/                Unit tests for billing logic
```

In development, Vite runs on port 5180 and forwards `/api` requests to Express on port 5000.
In production, Express serves the built React app and the API from one port.

### Data model

- **MenuItem**: name, category, price, isVeg, isAvailable
- **Table**: name, capacity, `currentOrder` (reference to the open order, `null` = free)
- **Order**: orderType (`DINE_IN`/`TAKEAWAY`), table, items, status (`OPEN`/`PAID`/`CANCELLED`), discount, taxRate, subtotal/tax/total, billNumber, paymentMode, paidAt
  - Order items are **embedded** and store a copy of the item's name and price. Changing or deleting a menu item later does not change old bills.
  - The tax rate is stored on the order, so changing GST later does not affect old bills.
- **Counter**: sequence used for bill numbers (atomic `$inc`).

### Key decisions
- **The server calculates all money values.** The client only previews totals while the cashier types a discount.
- One order = one bill. Bill-specific fields live on the order instead of in a separate collection, because the two always map 1:1 in this scope.
- Amounts are rounded to 2 decimals at each step (subtotal, discount, tax, total).

## API

| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/menu` | List (`?available=true`) / create menu items |
| PUT/DELETE | `/api/menu/:id` | Update / delete a menu item |
| GET/POST | `/api/tables` | List tables (with open order) / create table |
| DELETE | `/api/tables/:id` | Delete a free table |
| GET | `/api/orders` | `?status=OPEN`, or paid bills with `?from=&to=` |
| POST | `/api/orders` | Start an order `{ orderType, tableId?, customerName? }` |
| GET/PATCH | `/api/orders/:id` | Get order / replace items `{ items: [{ menuItemId, qty }] }` |
| POST | `/api/orders/:id/checkout` | Generate bill `{ paymentMode, discountType, discountValue }` |
| POST | `/api/orders/:id/cancel` | Cancel an open order |
| GET | `/api/reports/summary` | Sales summary for `?from=&to=` (default: today) |

Errors are returned as `{ "message": "..." }` with a suitable status code (400 validation, 404, 409 conflict).

## Running the project

**Requirements:** Node.js 20 or newer, and a MongoDB database (local or MongoDB Atlas).

```bash
# 1. Install dependencies (root, server and client)
npm run install:all

# 2. Configure the database
cp server/.env.example server/.env
#    then set MONGODB_URI in server/.env

# 3. Load the sample menu (26 items) and 10 tables
#    WARNING: this clears existing menu, tables and orders
npm run seed

# 4. Start the API and the frontend together
npm run dev
```

Open **http://localhost:5180**.

Other commands:

```bash
npm test          # billing unit tests
npm run build     # build the frontend
npm start         # serve API + built frontend on http://localhost:5000
```

### Database setup
There are no migrations. Mongoose creates the collections and indexes on first use, and `npm run seed` loads the starting data.

### Configuration (`server/.env`)
| Variable | Default | Description |
|---|---|---|
| `MONGODB_URI` | - | MongoDB connection string |
| `PORT` | 5000 | API port |
| `TAX_RATE` | 5 | GST % (split equally into CGST and SGST) |

Restaurant name, address and GSTIN printed on the bill are set in `client/src/config.js`.

### Authentication
Not implemented. See "Next steps" below.

## Known issues / limitations
- No login. Anyone who can open the app can use every screen.
- Multi-step updates (e.g. marking an order paid and freeing its table) do not use MongoDB transactions, so they work on a standalone MongoDB too. Each step is guarded with conditions, but a server crash in between could leave a table marked occupied. Cancelling or billing the order again fixes it.
- Auto-save sends the full cart after a short delay (400 ms). If two people edit the **same** order at the same moment, the last save wins.
- Bill-history listing shows at most 500 bills per query (no pagination yet). The totals still cover the full range.
- **Atlas + some ISPs:** if `mongodb+srv://` fails with `querySrv ETIMEOUT`, the local DNS server is not answering SRV lookups. Use the standard `mongodb://host1,host2,host3/...` connection string from Atlas ("Drivers" → older driver version), or change the system DNS to 8.8.8.8.

## Next steps (with more time)
1. Login with roles (admin manages menu/prices/reports, staff takes orders and bills).
2. KOT (kitchen order ticket) printing when items are added, and a simple kitchen screen.
3. Split bill and move/merge tables.
4. Per-item notes ("less spicy") and item variants (half/full).
5. Reports: item-wise sales, hourly sales, export to CSV/PDF.
6. Pagination on the bills list and API integration tests with an in-memory MongoDB.
