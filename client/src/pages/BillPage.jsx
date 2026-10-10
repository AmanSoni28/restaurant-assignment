import { Link, useParams } from 'react-router';
import { ArrowLeft, Printer } from 'lucide-react';
import { orderApi } from '../api';
import { useApi } from '../utils/useApi';
import { splitGst } from '../utils/billing';
import { formatCurrency, formatDateTime } from '../utils/format';
import { ErrorMessage, Loader } from '../components/Status';
import { RESTAURANT } from '../config';

export default function BillPage() {
  const { id } = useParams();
  const { data: order, loading, error, reload } = useApi(() => orderApi.get(id), [id]);

  if (loading) return <Loader />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  if (order.status !== 'PAID') {
    return (
      <div className="card mx-auto max-w-md p-6 text-center">
        <p>This order has not been billed yet.</p>
        {order.status === 'OPEN' && (
          <Link to={`/orders/${order._id}`} className="btn-primary mt-4">Go to order</Link>
        )}
      </div>
    );
  }

  const { cgst, sgst } = splitGst(order.taxAmount);
  const discountLabel = order.discountType === 'PERCENT' ? ` (${order.discountValue}%)` : '';

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-4 flex justify-between gap-2 print:hidden">
        <Link to="/" className="btn-secondary"><ArrowLeft size={16} /> Tables</Link>
        <div className="flex gap-2">
          <Link to="/bills" className="btn-secondary">All bills</Link>
          <button className="btn-primary" onClick={() => window.print()}><Printer size={16} /> Print</button>
        </div>
      </div>

      <div className="card p-6 font-mono text-[13px] shadow-sm print:border-0 print:shadow-none">
        <div className="text-center">
          <p className="text-base font-bold">{RESTAURANT.name}</p>
          <p>{RESTAURANT.address}</p>
          <p>Ph: {RESTAURANT.phone}</p>
          <p>GSTIN: {RESTAURANT.gstin}</p>
        </div>

        <div className="my-3 border-y border-dashed border-zinc-400 py-2">
          <Line left={`Bill No: ${order.billNumber}`} right={formatDateTime(order.paidAt)} />
          <Line
            left={order.orderType === 'DINE_IN' ? `Table: ${order.tableName}` : 'Takeaway'}
            right={`Paid by: ${order.paymentMode}`}
          />
          {order.customerName && <p>Customer: {order.customerName}</p>}
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b border-dashed border-zinc-400 text-left">
              <th className="py-1 font-semibold">Item</th>
              <th className="py-1 text-right font-semibold">Qty</th>
              <th className="py-1 text-right font-semibold">Rate</th>
              <th className="py-1 text-right font-semibold">Amt</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.menuItem}>
                <td className="py-0.5 pr-2">{item.name}</td>
                <td className="text-right">{item.qty}</td>
                <td className="text-right">{item.price.toFixed(2)}</td>
                <td className="text-right">{(item.price * item.qty).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-2 space-y-0.5 border-t border-dashed border-zinc-400 pt-2">
          <Line left="Subtotal" right={formatCurrency(order.subtotal)} />
          {order.discountAmount > 0 && (
            <Line left={`Discount${discountLabel}`} right={`- ${formatCurrency(order.discountAmount)}`} />
          )}
          <Line left={`CGST @ ${order.taxRate / 2}%`} right={formatCurrency(cgst)} />
          <Line left={`SGST @ ${order.taxRate / 2}%`} right={formatCurrency(sgst)} />
        </div>
        <div className="mt-2 border-y border-dashed border-zinc-400 py-2 text-base font-bold">
          <Line left="Grand Total" right={formatCurrency(order.total)} />
        </div>

        <p className="mt-3 text-center">Thank you! Visit again.</p>
      </div>
    </div>
  );
}

function Line({ left, right }) {
  return (
    <div className="flex justify-between gap-2">
      <span>{left}</span>
      <span>{right}</span>
    </div>
  );
}
