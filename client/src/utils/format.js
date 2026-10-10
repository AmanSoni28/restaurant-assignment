const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

export function formatCurrency(amount) {
  return inr.format(amount ?? 0);
}

export function formatDateTime(date) {
  return new Date(date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export function itemCount(items) {
  const count = items.reduce((n, item) => n + item.qty, 0);
  return `${count} ${count === 1 ? 'item' : 'items'}`;
}

export function minutesSince(date) {
  return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60000));
}

const pad = (n) => String(n).padStart(2, '0');

/** Today's date as YYYY-MM-DD in local time (value format of <input type="date">) */
export function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Converts two YYYY-MM-DD strings into a full-day range in local time. */
export function toDayRange(fromDate, toDate) {
  const [fy, fm, fd] = fromDate.split('-').map(Number);
  const [ty, tm, td] = toDate.split('-').map(Number);
  return {
    from: new Date(fy, fm - 1, fd, 0, 0, 0, 0).toISOString(),
    to: new Date(ty, tm - 1, td, 23, 59, 59, 999).toISOString(),
  };
}
