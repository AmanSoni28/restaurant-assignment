import { HttpError } from './HttpError.js';

/**
 * Reads ?from=&to= (ISO strings) from the query. The client sends the start
 * and end of the day in its own timezone. Defaults to today (server time).
 */
export function parseDateRange(query) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const from = query.from ? new Date(query.from) : startOfToday;
  const to = query.to ? new Date(query.to) : endOfToday;

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new HttpError(400, 'Invalid date range');
  }
  if (from > to) {
    throw new HttpError(400, '"From" date must be before "To" date');
  }
  return { from, to };
}
