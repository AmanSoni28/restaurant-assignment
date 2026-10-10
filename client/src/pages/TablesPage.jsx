import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import { ChevronRight, Clock, IndianRupee, LayoutGrid, Plus, Receipt, ShoppingBag, Trash2, UtensilsCrossed } from 'lucide-react';
import { orderApi, reportApi, tableApi } from '../api';
import { getErrorMessage } from '../api/client';
import { useApi } from '../utils/useApi';
import { formatCurrency, itemCount, minutesSince } from '../utils/format';
import { EmptyState, ErrorMessage, Loader, PageHeader, StatCard, StatusDot } from '../components/Status';

const REFRESH_MS = 20000;

async function loadDashboard() {
  const [tables, openOrders, summary] = await Promise.all([
    tableApi.list(),
    orderApi.list({ status: 'OPEN' }),
    reportApi.summary(),
  ]);
  return { tables, takeaways: openOrders.filter((o) => o.orderType === 'TAKEAWAY'), summary };
}

export default function TablesPage() {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useApi(loadDashboard);
  const [busy, setBusy] = useState(false);
  const [managing, setManaging] = useState(false);

  // keep table status fresh when several staff members use the app
  useEffect(() => {
    const timer = setInterval(() => reload({ silent: true }), REFRESH_MS);
    return () => clearInterval(timer);
  }, [reload]);

  async function openOrder(payload) {
    setBusy(true);
    try {
      const order = await orderApi.create(payload);
      navigate(`/orders/${order._id}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
      reload({ silent: true });
    } finally {
      setBusy(false);
    }
  }

  function handleTableClick(table) {
    if (managing) return;
    if (table.currentOrder) navigate(`/orders/${table.currentOrder._id}`);
    else openOrder({ orderType: 'DINE_IN', tableId: table._id });
  }

  if (loading && !data) return <Loader />;
  if (error && !data) return <ErrorMessage message={error} onRetry={reload} />;

  const { tables, takeaways, summary } = data;
  const occupied = tables.filter((t) => t.currentOrder).length;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={IndianRupee} label="Today's sales" value={formatCurrency(summary.totalSales)} />
        <StatCard icon={Receipt} label="Bills today" value={summary.billCount} />
        <StatCard icon={LayoutGrid} label="Tables occupied" value={`${occupied} / ${tables.length}`} />
        <StatCard icon={UtensilsCrossed} label="Open orders" value={summary.openOrders} />
      </div>

      <section>
        <PageHeader title="Tables" subtitle="Select a free table to start an order.">
          <div className="mr-2 hidden items-center gap-4 sm:flex">
            <StatusDot color="bg-emerald-500">Free</StatusDot>
            <StatusDot color="bg-amber-500">Occupied</StatusDot>
          </div>
          <button className="btn-secondary" onClick={() => setManaging((m) => !m)}>
            {managing ? 'Done' : 'Manage tables'}
          </button>
        </PageHeader>

        {managing && <AddTableForm onAdded={() => reload({ silent: true })} />}

        {tables.length === 0 ? (
          <EmptyState icon={LayoutGrid} title="No tables yet">Use "Manage tables" to add one.</EmptyState>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
            {tables.map((table) => (
              <TableCard
                key={table._id}
                table={table}
                disabled={busy}
                managing={managing}
                onClick={() => handleTableClick(table)}
                onDeleted={() => reload({ silent: true })}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <PageHeader title="Takeaway" subtitle="Counter and parcel orders.">
          <button className="btn-primary" disabled={busy} onClick={() => openOrder({ orderType: 'TAKEAWAY' })}>
            <Plus size={16} /> New takeaway
          </button>
        </PageHeader>
        {takeaways.length === 0 ? (
          <EmptyState icon={ShoppingBag} title="No open takeaway orders" />
        ) : (
          <div className="card divide-y divide-zinc-100">
            {takeaways.map((order) => (
              <button
                key={order._id}
                onClick={() => navigate(`/orders/${order._id}`)}
                className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-zinc-50"
              >
                <ShoppingBag size={16} className="shrink-0 text-zinc-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{order.customerName || 'Walk-in customer'}</p>
                  <p className="text-xs text-zinc-500">
                    {itemCount(order.items)} · started {minutesSince(order.createdAt)} min ago
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums">{formatCurrency(order.subtotal)}</span>
                <ChevronRight size={16} className="text-zinc-400" />
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function TableCard({ table, disabled, managing, onClick, onDeleted }) {
  const order = table.currentOrder;

  async function handleDelete(e) {
    e.stopPropagation();
    if (!window.confirm(`Delete table ${table.name}?`)) return;
    try {
      await tableApi.remove(table._id);
      toast.success(`Table ${table.name} deleted`);
      onDeleted();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={disabled ? undefined : onClick}
      onKeyDown={(e) => e.key === 'Enter' && !disabled && onClick()}
      className={`flex h-32 cursor-pointer flex-col rounded-lg border bg-white p-3.5 transition-colors focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:outline-none ${
        order ? 'border-amber-300 bg-amber-50/40 hover:border-amber-400' : 'border-zinc-200 hover:border-zinc-400'
      } ${disabled ? 'pointer-events-none opacity-60' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-lg font-semibold">{table.name}</p>
          <p className="text-xs text-zinc-500">{table.capacity} seats</p>
        </div>
        <StatusDot color={order ? 'bg-amber-500' : 'bg-emerald-500'}>{order ? 'Occupied' : 'Free'}</StatusDot>
      </div>

      <div className="mt-auto">
        {order ? (
          <div className="flex items-end justify-between gap-2">
            <div className="text-xs text-zinc-500">
              <p>{itemCount(order.items)}</p>
              <p className="flex items-center gap-1 tabular-nums">
                <Clock size={11} /> {minutesSince(order.createdAt)} min
              </p>
            </div>
            <span className="text-sm font-semibold tabular-nums">{formatCurrency(order.subtotal)}</span>
          </div>
        ) : managing ? (
          <button className="btn-danger h-8 w-full" onClick={handleDelete}>
            <Trash2 size={14} /> Delete
          </button>
        ) : null}
      </div>
    </div>
  );
}

function AddTableForm({ onAdded }) {
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState(4);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return toast.error('Enter a table name');
    setSaving(true);
    try {
      await tableApi.create({ name: name.trim(), capacity: Number(capacity) });
      toast.success(`Table ${name.trim()} added`);
      setName('');
      onAdded();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card mb-4 flex flex-wrap items-end gap-3 p-4">
      <label className="label flex-1 sm:flex-none">
        Table name
        <input className="input mt-1.5 sm:w-40" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. T11" />
      </label>
      <label className="label w-24">
        Seats
        <input className="input mt-1.5" type="number" min="1" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
      </label>
      <button className="btn-primary" disabled={saving}>
        <Plus size={16} /> Add table
      </button>
    </form>
  );
}
