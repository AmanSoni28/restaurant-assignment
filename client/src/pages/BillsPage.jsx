import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Banknote, CreditCard, FileText, IndianRupee, Receipt, Search, Smartphone } from 'lucide-react';
import { orderApi, reportApi } from '../api';
import { useApi } from '../utils/useApi';
import { formatCurrency, formatDateTime, itemCount, toDayRange, todayString } from '../utils/format';
import { EmptyState, ErrorMessage, Loader, PageHeader, StatCard } from '../components/Status';

const PAYMENT_CARDS = [
  { mode: 'CASH', icon: Banknote },
  { mode: 'UPI', icon: Smartphone },
  { mode: 'CARD', icon: CreditCard },
];

function PaymentBadge({ mode }) {
  return (
    <span className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[11px] font-medium text-zinc-600">{mode}</span>
  );
}

export default function BillsPage() {
  const navigate = useNavigate();
  const [fromDate, setFromDate] = useState(todayString);
  const [toDate, setToDate] = useState(todayString);
  const [search, setSearch] = useState('');

  const rangeError = fromDate && toDate && fromDate > toDate ? '"From" date is after "To" date' : null;
  const validRange = fromDate && toDate && !rangeError;

  const { data, loading, error, reload } = useApi(async () => {
    if (!validRange) return null;
    const range = toDayRange(fromDate, toDate);
    const [bills, summary] = await Promise.all([
      orderApi.list({ status: 'PAID', ...range }),
      reportApi.summary(range),
    ]);
    return { bills, summary };
  }, [fromDate, toDate, validRange]);

  const query = search.trim().toLowerCase();
  const bills = (data?.bills ?? []).filter(
    (b) =>
      !query ||
      b.billNumber.toLowerCase().includes(query) ||
      (b.tableName || '').toLowerCase().includes(query) ||
      (b.customerName || '').toLowerCase().includes(query)
  );

  const openBill = (bill) => navigate(`/bills/${bill._id}`);
  const placeLabel = (bill) => (bill.orderType === 'DINE_IN' ? `Table ${bill.tableName}` : 'Takeaway');

  return (
    <div>
      <PageHeader title="Bills & Sales" subtitle="Paid bills and collections for the selected period" />

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-[180px_180px_1fr]">
        <label className="label">
          From
          <input type="date" className="input mt-1.5" value={fromDate} max={todayString()} onChange={(e) => setFromDate(e.target.value)} />
        </label>
        <label className="label">
          To
          <input type="date" className="input mt-1.5" value={toDate} max={todayString()} onChange={(e) => setToDate(e.target.value)} />
        </label>
        <label className="label col-span-2 md:col-span-1">
          Search
          <div className="relative mt-1.5">
            <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400" />
            <input className="input pl-9" placeholder="Bill no, table or customer" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </label>
        {rangeError && <p className="col-span-2 text-sm text-red-600 md:col-span-3">{rangeError}</p>}
      </div>

      {loading ? (
        <Loader />
      ) : error ? (
        <ErrorMessage message={error} onRetry={reload} />
      ) : data ? (
        <div className="space-y-5">
          <div className="grid grid-cols-6 gap-3 lg:grid-cols-5">
            <StatCard className="col-span-3 lg:col-span-1" icon={IndianRupee} label="Total sales" value={formatCurrency(data.summary.totalSales)} />
            <StatCard className="col-span-3 lg:col-span-1" icon={Receipt} label="Bills" value={data.summary.billCount} />
            {PAYMENT_CARDS.map(({ mode, icon }) => {
              const row = data.summary.byPaymentMode.find((p) => p.mode === mode);
              return (
                <StatCard key={mode} className="col-span-2 lg:col-span-1" icon={icon} label={mode} value={formatCurrency(row?.amount ?? 0)} hint={`${row?.count ?? 0} ${row?.count === 1 ? "bill" : "bills"}`} />
              );
            })}
          </div>

          {bills.length === 0 ? (
            <EmptyState icon={FileText} title="No bills found">Try a different date range or search.</EmptyState>
          ) : (
            <>
              {/* Phone: cards */}
              <div className="card divide-y divide-zinc-100 md:hidden">
                {bills.map((bill) => (
                  <button key={bill._id} onClick={() => openBill(bill)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-zinc-50">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{bill.billNumber}</p>
                      <p className="truncate text-xs text-zinc-500">
                        {placeLabel(bill)} · {formatDateTime(bill.paidAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="mb-0.5 text-sm font-semibold tabular-nums">{formatCurrency(bill.total)}</p>
                      <PaymentBadge mode={bill.paymentMode} />
                    </div>
                  </button>
                ))}
              </div>

              {/* Tablet / desktop: table */}
              <div className="card hidden overflow-hidden md:block">
                <table className="w-full text-sm">
                  <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium text-zinc-500">
                    <tr>
                      <th className="px-4 py-2.5">Bill no</th>
                      <th className="px-4 py-2.5">Date & time</th>
                      <th className="px-4 py-2.5">Table / Type</th>
                      <th className="px-4 py-2.5">Customer</th>
                      <th className="px-4 py-2.5 text-right">Items</th>
                      <th className="px-4 py-2.5">Payment</th>
                      <th className="px-4 py-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {bills.map((bill) => (
                      <tr key={bill._id} className="cursor-pointer transition hover:bg-zinc-50" onClick={() => openBill(bill)}>
                        <td className="px-4 py-2.5 font-medium">{bill.billNumber}</td>
                        <td className="px-4 py-2.5 text-zinc-600 tabular-nums">{formatDateTime(bill.paidAt)}</td>
                        <td className="px-4 py-2.5">{placeLabel(bill)}</td>
                        <td className="px-4 py-2.5 text-zinc-600">{bill.customerName || '-'}</td>
                        <td className="px-4 py-2.5 text-right text-zinc-600">{itemCount(bill.items)}</td>
                        <td className="px-4 py-2.5"><PaymentBadge mode={bill.paymentMode} /></td>
                        <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{formatCurrency(bill.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
