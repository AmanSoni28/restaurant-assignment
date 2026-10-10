import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import toast from 'react-hot-toast';
import {
  AlertCircle, ArrowLeft, Banknote, Check, ChevronUp, CreditCard, Loader2, Minus, Plus, Search, ShoppingBag,
  Smartphone, X,
} from 'lucide-react';
import { menuApi, orderApi } from '../api';
import { getErrorMessage } from '../api/client';
import { useApi } from '../utils/useApi';
import { calculateTotals, splitGst } from '../utils/billing';
import { formatCurrency, itemCount } from '../utils/format';
import { EmptyState, ErrorMessage, Loader, VegMark } from '../components/Status';

const SAVE_DELAY_MS = 400;
const PAYMENT_MODES = [
  { value: 'CASH', icon: Banknote },
  { value: 'UPI', icon: Smartphone },
  { value: 'CARD', icon: CreditCard },
];

const toCartItem = (item) => ({ menuItemId: item.menuItem, name: item.name, price: item.price, qty: item.qty });

export default function OrderPage() {
  const { id } = useParams();
  const { data, loading, error, reload } = useApi(
    () => Promise.all([orderApi.get(id), menuApi.list({ available: true })]),
    [id]
  );

  if (loading && !data) return <Loader />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  const [order, menu] = data;
  if (order.status === 'PAID') return <Navigate to={`/bills/${order._id}`} replace />;
  if (order.status !== 'OPEN') {
    return <ErrorMessage message={`This order was ${order.status.toLowerCase()}.`} />;
  }
  // key resets the editor state if we navigate to another order
  return <OrderEditor key={order._id} initialOrder={order} menu={menu} />;
}

function OrderEditor({ initialOrder, menu }) {
  const navigate = useNavigate();
  const orderId = initialOrder._id;

  const [cart, setCart] = useState(() => initialOrder.items.map(toCartItem));
  const [customerName, setCustomerName] = useState(initialOrder.customerName || '');
  const [saveState, setSaveState] = useState('saved'); // saved | pending | saving | error
  const [panelOpen, setPanelOpen] = useState(false); // order panel on small screens

  // --- Auto-save -----------------------------------------------------------
  // Every edit bumps `revision`. A save sends the latest cart and remembers
  // which revision it saved, so edits made while a request is in flight are
  // saved in the next round instead of being lost.
  const revision = useRef(0);
  const savedRevision = useRef(0);
  const inFlight = useRef(null);
  const latest = useRef({ cart, customerName });
  latest.current = { cart, customerName };

  const flush = useCallback(async () => {
    while (savedRevision.current !== revision.current) {
      if (inFlight.current) {
        await inFlight.current;
        continue;
      }
      const rev = revision.current;
      const { cart: items, customerName: name } = latest.current;
      setSaveState('saving');
      inFlight.current = orderApi.update(orderId, {
        customerName: name,
        items: items.map((i) => ({ menuItemId: i.menuItemId, qty: i.qty })),
      });
      try {
        await inFlight.current;
        savedRevision.current = rev;
      } finally {
        inFlight.current = null;
      }
    }
    setSaveState('saved');
  }, [orderId]);

  const saveNow = useCallback(async () => {
    try {
      await flush();
      return true;
    } catch (err) {
      setSaveState('error');
      toast.error(getErrorMessage(err));
      // bring the screen back in sync with what the server has
      try {
        const fresh = await orderApi.get(orderId);
        if (fresh.status === 'OPEN') {
          setCart(fresh.items.map(toCartItem));
          setCustomerName(fresh.customerName || '');
          savedRevision.current = revision.current;
          setSaveState('saved');
        }
      } catch {
        /* keep the error state */
      }
      return false;
    }
  }, [flush, orderId]);

  useEffect(() => {
    if (savedRevision.current === revision.current) return;
    const timer = setTimeout(saveNow, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [cart, customerName, saveNow]);

  // save pending changes if the user leaves the page quickly
  useEffect(() => () => void flush().catch(() => {}), [flush]);

  function edit(updater) {
    revision.current += 1;
    setSaveState('pending');
    setCart(updater);
  }

  const addItem = (menuItem) =>
    edit((items) => {
      const existing = items.find((i) => i.menuItemId === menuItem._id);
      if (existing) return items.map((i) => (i === existing ? { ...i, qty: i.qty + 1 } : i));
      return [...items, { menuItemId: menuItem._id, name: menuItem.name, price: menuItem.price, qty: 1 }];
    });

  const changeQty = (menuItemId, delta) =>
    edit((items) =>
      items
        .map((i) => (i.menuItemId === menuItemId ? { ...i, qty: Math.min(999, i.qty + delta) } : i))
        .filter((i) => i.qty > 0)
    );

  const removeItem = (menuItemId) => edit((items) => items.filter((i) => i.menuItemId !== menuItemId));

  function changeCustomerName(value) {
    revision.current += 1;
    setSaveState('pending');
    setCustomerName(value);
  }

  // --- Cancel / checkout ---------------------------------------------------
  async function handleCancel() {
    if (!window.confirm('Cancel this order? The table will be freed.')) return;
    try {
      await flush().catch(() => {});
      await orderApi.cancel(orderId);
      toast.success('Order cancelled');
      navigate('/');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleCheckout(payment) {
    if (!(await saveNow())) return;
    try {
      await orderApi.checkout(orderId, payment);
      toast.success('Bill generated');
      navigate(`/bills/${orderId}`, { replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  const isDineIn = initialOrder.orderType === 'DINE_IN';
  const title = isDineIn ? `Table ${initialOrder.tableName}` : 'Takeaway';
  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  return (
    <div className="pb-20 lg:pb-0">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/" className="btn-secondary w-9 px-0" title="Back to tables">
            <ArrowLeft size={16} />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
            <SaveIndicator state={saveState} />
          </div>
        </div>
        <button className="btn-danger" onClick={handleCancel}>
          <span className="hidden sm:inline">Cancel order</span>
          <X size={16} className="sm:hidden" />
        </button>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
        <MenuPicker menu={menu} cart={cart} onAdd={addItem} />

        {/* Sticky side panel on large screens, full-screen sheet on phones */}
        <aside
          className={`${
            panelOpen ? 'fixed inset-0 z-40 flex flex-col bg-zinc-50' : 'hidden'
          } lg:sticky lg:top-7 lg:flex lg:max-h-[calc(100vh-3.5rem)] lg:flex-col`}
        >
          <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 lg:hidden">
            <p className="text-sm font-semibold">{title} · Current order</p>
            <button className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100" onClick={() => setPanelOpen(false)}>
              <X size={18} />
            </button>
          </div>

          <div className="card flex flex-1 flex-col overflow-y-auto max-lg:m-4">
            <div className="border-b border-zinc-200 p-4">
              <label className="label">
                Customer name
                <input
                  className="input mt-1.5"
                  value={customerName}
                  maxLength={60}
                  placeholder="Optional"
                  onChange={(e) => changeCustomerName(e.target.value)}
                />
              </label>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between px-4 pt-3 pb-1">
                <p className="label">Items</p>
                {cart.length > 0 && <p className="text-xs text-zinc-500">{itemCount(cart)}</p>}
              </div>
              <Cart items={cart} onQty={changeQty} onRemove={removeItem} />
            </div>
            <CheckoutPanel
              items={cart}
              taxRate={initialOrder.taxRate}
              disabled={saveState === 'error'}
              onCheckout={handleCheckout}
            />
          </div>
        </aside>
      </div>

      {/* Phone: order summary bar above the bottom tabs */}
      {!panelOpen && (
        <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 border-t border-zinc-200 bg-white p-3 lg:hidden">
          <button onClick={() => setPanelOpen(true)} className="btn-primary h-11 w-full justify-between px-4">
            <span>
              {itemCount(cart)} · <span className="tabular-nums">{formatCurrency(subtotal)}</span>
            </span>
            <span className="flex items-center gap-1">
              Review & bill <ChevronUp size={16} />
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

function SaveIndicator({ state }) {
  if (state === 'error') {
    return (
      <span className="flex items-center gap-1 text-xs text-red-600">
        <AlertCircle size={12} /> Changes not saved
      </span>
    );
  }
  if (state === 'saved') {
    return (
      <span className="flex items-center gap-1 text-xs text-zinc-500">
        <Check size={12} /> Saved
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs text-zinc-500">
      <Loader2 size={12} className="animate-spin" /> Saving
    </span>
  );
}

function MenuPicker({ menu, cart, onAdd }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const categories = useMemo(() => ['All', ...new Set(menu.map((m) => m.category))], [menu]);
  const qtyInCart = useMemo(() => new Map(cart.map((i) => [i.menuItemId, i.qty])), [cart]);

  const query = search.trim().toLowerCase();
  const visible = menu.filter(
    (m) => (category === 'All' || m.category === category) && (!query || m.name.toLowerCase().includes(query))
  );
  // names starting with the search text come first ("paneer" -> Paneer Tikka before Kadai Paneer)
  if (query) {
    const startsWith = (m) => m.name.toLowerCase().startsWith(query);
    visible.sort((a, b) => startsWith(b) - startsWith(a));
  }

  // Enter adds the first match, so a cashier can type "naan" + Enter
  function handleKeyDown(e) {
    if (e.key === 'Enter' && query && visible.length > 0) {
      onAdd(visible[0]);
      setSearch('');
    } else if (e.key === 'Escape') {
      setSearch('');
    }
  }

  return (
    <div className="card">
      <div className="space-y-3 border-b border-zinc-200 p-4">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400" />
          <input
            autoFocus
            className="input pl-9"
            placeholder="Search items"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <kbd className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded border border-zinc-200 bg-zinc-50 px-1.5 text-[10px] text-zinc-500 sm:block">
            Enter to add
          </kbd>
        </div>
        <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`h-7 shrink-0 rounded-md border px-2.5 text-xs font-medium transition-colors ${
                c === category ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="p-4">
          <EmptyState icon={Search} title="No items match your search" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3 xl:grid-cols-4">
          {visible.map((item) => {
            const qty = qtyInCart.get(item._id);
            return (
              <button
                key={item._id}
                onClick={() => onAdd(item)}
                className={`flex h-20 flex-col rounded-md border p-2.5 text-left transition-colors ${
                  qty ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 bg-white hover:border-zinc-400'
                }`}
              >
                <div className="flex items-start gap-1.5">
                  <span className="mt-[3px]">
                    <VegMark isVeg={item.isVeg} />
                  </span>
                  <span className="line-clamp-2 text-[13px] leading-snug font-medium">{item.name}</span>
                </div>
                <div className="mt-auto flex items-center justify-between">
                  <span className="text-xs text-zinc-500 tabular-nums">{formatCurrency(item.price)}</span>
                  {qty && (
                    <span className="rounded bg-zinc-900 px-1.5 text-[11px] leading-5 font-semibold text-white tabular-nums">
                      × {qty}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Cart({ items, onQty, onRemove }) {
  if (items.length === 0) {
    return (
      <div className="p-4">
        <EmptyState icon={ShoppingBag} title="No items added">Select items from the menu.</EmptyState>
      </div>
    );
  }
  return (
    <ul className="divide-y divide-zinc-100">
      {items.map((item) => (
        <li key={item.menuItemId} className="flex items-center gap-2 px-4 py-2.5 sm:gap-3">
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm leading-tight font-medium">{item.name}</p>
            <p className="text-xs text-zinc-500 tabular-nums">{formatCurrency(item.price)}</p>
          </div>
          <div className="flex h-7 items-center rounded-md border border-zinc-200">
            <button className="grid h-full w-7 place-items-center text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900" onClick={() => onQty(item.menuItemId, -1)}>
              <Minus size={12} />
            </button>
            <span className="w-7 text-center text-sm font-medium tabular-nums">{item.qty}</span>
            <button className="grid h-full w-7 place-items-center text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900" onClick={() => onQty(item.menuItemId, 1)}>
              <Plus size={12} />
            </button>
          </div>
          <span className="w-[72px] shrink-0 text-right text-sm font-medium tabular-nums">{formatCurrency(item.price * item.qty)}</span>
          <button className="text-zinc-300 hover:text-red-600" title="Remove" onClick={() => onRemove(item.menuItemId)}>
            <X size={14} />
          </button>
        </li>
      ))}
    </ul>
  );
}

function CheckoutPanel({ items, taxRate, disabled, onCheckout }) {
  const [discountType, setDiscountType] = useState('PERCENT');
  const [discountInput, setDiscountInput] = useState('');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [submitting, setSubmitting] = useState(false);

  const discountValue = discountInput === '' ? 0 : Number(discountInput);
  const totals = calculateTotals(items, { discountType, discountValue, taxRate });
  const { cgst, sgst } = splitGst(totals.taxAmount);

  let discountError = null;
  if (Number.isNaN(discountValue) || discountValue < 0) discountError = 'Enter a valid discount';
  else if (discountType === 'PERCENT' && discountValue > 100) discountError = 'Max 100%';
  else if (discountType === 'FLAT' && discountValue > totals.subtotal) discountError = 'More than the bill amount';

  async function handleSubmit() {
    setSubmitting(true);
    await onCheckout({ paymentMode, discountType, discountValue });
    setSubmitting(false);
  }

  const canSubmit = items.length > 0 && !discountError && !disabled && !submitting;

  return (
    <div className="space-y-4 border-t border-zinc-200 bg-zinc-50/60 p-4">
      <div>
        <p className="label mb-1.5">Discount</p>
        <div className="flex gap-2">
          <div className="flex h-9 shrink-0 rounded-md border border-zinc-200 bg-white p-0.5">
            {[['PERCENT', '%'], ['FLAT', '₹']].map(([type, label]) => (
              <button
                key={type}
                onClick={() => setDiscountType(type)}
                className={`w-8 rounded text-sm font-medium transition-colors ${
                  discountType === type ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <input
            className="input"
            type="number"
            min="0"
            step="any"
            placeholder="0"
            value={discountInput}
            onChange={(e) => setDiscountInput(e.target.value)}
            // stop the mouse wheel from silently changing the discount
            onWheel={(e) => e.currentTarget.blur()}
          />
        </div>
        {discountError && <p className="mt-1 text-xs text-red-600">{discountError}</p>}
      </div>

      <dl className="space-y-1 text-sm">
        <Row label="Subtotal" value={formatCurrency(totals.subtotal)} />
        {totals.discountAmount > 0 && <Row label="Discount" value={`− ${formatCurrency(totals.discountAmount)}`} />}
        <Row label={`CGST ${taxRate / 2}%`} value={formatCurrency(cgst)} />
        <Row label={`SGST ${taxRate / 2}%`} value={formatCurrency(sgst)} />
        <div className="flex items-baseline justify-between border-t border-zinc-200 pt-2">
          <dt className="font-medium">Total</dt>
          <dd className="text-xl font-semibold tracking-tight tabular-nums">{formatCurrency(totals.total)}</dd>
        </div>
      </dl>

      <div>
        <p className="label mb-1.5">Payment mode</p>
        <div className="grid grid-cols-3 gap-1.5">
          {PAYMENT_MODES.map(({ value, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setPaymentMode(value)}
              className={`flex h-9 items-center justify-center gap-1.5 rounded-md border text-xs font-medium transition-colors ${
                paymentMode === value
                  ? 'border-zinc-900 bg-white text-zinc-900 ring-1 ring-zinc-900'
                  : 'border-zinc-200 bg-white text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <Icon size={14} />
              {value}
            </button>
          ))}
        </div>
      </div>

      <button className="btn-primary h-11 w-full text-sm" disabled={!canSubmit} onClick={handleSubmit}>
        {submitting && <Loader2 size={16} className="animate-spin" />}
        {submitting ? 'Generating bill' : `Generate bill · ${formatCurrency(totals.total)}`}
      </button>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
