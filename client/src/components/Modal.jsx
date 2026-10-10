import { useEffect } from 'react';
import { X } from 'lucide-react';

// Centered dialog on larger screens, bottom sheet on phones.
export default function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/40 sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-xl border border-zinc-200 bg-white shadow-lg sm:max-w-md sm:rounded-lg"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3.5">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
