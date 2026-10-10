import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router';
import { LayoutGrid, Receipt, UtensilsCrossed } from 'lucide-react';
import { RESTAURANT } from '../config';

const links = [
  { to: '/', label: 'Tables', icon: LayoutGrid, end: true },
  { to: '/bills', label: 'Bills & Sales', short: 'Bills', icon: Receipt },
  { to: '/menu', label: 'Menu', icon: UtensilsCrossed },
];

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

function Brand() {
  const initials = RESTAURANT.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2);
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-8 w-8 place-items-center rounded-md bg-zinc-900 text-xs font-semibold text-white">
        {initials}
      </span>
      <div className="leading-tight">
        <p className="text-sm font-semibold">{RESTAURANT.name}</p>
        <p className="text-xs text-zinc-500">Point of sale</p>
      </div>
    </div>
  );
}

export default function Layout() {
  const now = useClock();
  const date = now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen lg:pl-56">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-56 flex-col border-r border-zinc-200 bg-white px-3 py-4 lg:flex print:hidden">
        <div className="px-2">
          <Brand />
        </div>
        <nav className="mt-6 flex flex-col gap-0.5">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
                }`
              }
            >
              <Icon size={16} strokeWidth={2} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto border-t border-zinc-200 px-2 pt-3 text-xs text-zinc-500">
          <p>{date}</p>
          <p className="mt-0.5 font-medium text-zinc-900 tabular-nums">{time}</p>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-200 bg-white/95 px-4 py-2.5 backdrop-blur lg:hidden print:hidden">
        <Brand />
        <span className="text-xs font-medium text-zinc-500 tabular-nums">{time}</span>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-5 pb-24 sm:px-6 lg:px-8 lg:py-7 lg:pb-8 print:p-0">
        <Outlet />
      </main>

      {/* Mobile bottom tabs */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid h-14 grid-cols-3 border-t border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden print:hidden">
        {links.map(({ to, label, short, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${isActive ? 'text-zinc-900' : 'text-zinc-400'}`
            }
          >
            <Icon size={18} />
            {short || label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
