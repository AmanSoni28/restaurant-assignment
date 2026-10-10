import { AlertCircle, Loader2 } from 'lucide-react';

export function Loader({ text = 'Loading...' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-500">
      <Loader2 className="animate-spin" size={16} />
      {text}
    </div>
  );
}

export function ErrorMessage({ message, onRetry }) {
  return (
    <div className="card mx-auto max-w-md p-6 text-center">
      <AlertCircle className="mx-auto text-red-500" size={24} />
      <p className="mt-2 text-sm text-zinc-700">{message}</p>
      {onRetry && (
        <button className="btn-secondary mt-4" onClick={() => onRetry()}>
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 px-4 py-10 text-center">
      {Icon && <Icon className="text-zinc-400" size={22} />}
      <p className="mt-2 text-sm font-medium text-zinc-700">{title}</p>
      {children && <div className="mt-0.5 text-sm text-zinc-500">{children}</div>}
    </div>
  );
}

export function VegMark({ isVeg }) {
  const color = isVeg ? 'border-green-600 after:bg-green-600' : 'border-red-700 after:bg-red-700';
  return (
    <span
      title={isVeg ? 'Veg' : 'Non-veg'}
      className={`relative inline-block h-3 w-3 shrink-0 rounded-[2px] border after:absolute after:top-1/2 after:left-1/2 after:h-1.5 after:w-1.5 after:-translate-1/2 after:rounded-full ${color}`}
    />
  );
}

export function StatCard({ label, value, icon: Icon, hint, className = '' }) {
  return (
    <div className={`card min-w-0 p-3 sm:p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-zinc-500">{label}</p>
        {Icon && <Icon size={15} className="text-zinc-400" />}
      </div>
      <p className="mt-1.5 truncate text-lg font-semibold sm:text-2xl tracking-tight tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-zinc-500">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function StatusDot({ color, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
      {children}
    </span>
  );
}
