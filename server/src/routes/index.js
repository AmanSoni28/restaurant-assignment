import { Router } from 'express';
import * as menu from '../controllers/menuController.js';
import * as tables from '../controllers/tableController.js';
import * as orders from '../controllers/orderController.js';
import * as reports from '../controllers/reportController.js';

// Express 5 forwards errors from async handlers to the error middleware,
// so the controllers can simply throw.
const router = Router();

router.get('/menu', menu.listMenuItems);
router.post('/menu', menu.createMenuItem);
router.put('/menu/:id', menu.updateMenuItem);
router.delete('/menu/:id', menu.deleteMenuItem);

router.get('/tables', tables.listTables);
router.post('/tables', tables.createTable);
router.delete('/tables/:id', tables.deleteTable);

router.get('/orders', orders.listOrders);
router.post('/orders', orders.createOrder);
router.get('/orders/:id', orders.getOrder);
router.patch('/orders/:id', orders.updateOrder);
router.post('/orders/:id/checkout', orders.checkoutOrder);
router.post('/orders/:id/cancel', orders.cancelOrder);

router.get('/reports/summary', reports.salesSummary);

export default router;
