import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Pencil, Plus, Search, Trash2, UtensilsCrossed } from 'lucide-react';
import { menuApi } from '../api';
import { getErrorMessage } from '../api/client';
import { useApi } from '../utils/useApi';
import { formatCurrency } from '../utils/format';
import { EmptyState, ErrorMessage, Loader, PageHeader, VegMark } from '../components/Status';
import Modal from '../components/Modal';

export default function MenuPage() {
  const { data: items, setData: setItems, loading, error, reload } = useApi(() => menuApi.list());
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [editing, setEditing] = useState(null); // null = closed, {} = new item, item = edit

  const categories = useMemo(() => [...new Set((items ?? []).map((i) => i.category))], [items]);

  if (loading) return <Loader />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  const query = search.trim().toLowerCase();
  const visible = items.filter(
    (i) => (category === 'All' || i.category === category) && (!query || i.name.toLowerCase().includes(query))
  );
  const availableCount = items.filter((i) => i.isAvailable).length;

  function handleSaved(saved) {
    setItems((list) => {
      const exists = list.some((i) => i._id === saved._id);
      const next = exists ? list.map((i) => (i._id === saved._id ? saved : i)) : [...list, saved];
      return next.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
    });
    setEditing(null);
  }

  async function toggleAvailable(item) {
    try {
      const saved = await menuApi.update(item._id, { isAvailable: !item.isAvailable });
      setItems((list) => list.map((i) => (i._id === saved._id ? saved : i)));
      toast.success(`${saved.name} is now ${saved.isAvailable ? 'available' : 'unavailable'}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`Delete "${item.name}" from the menu?`)) return;
    try {
      await menuApi.remove(item._id);
      setItems((list) => list.filter((i) => i._id !== item._id));
      toast.success('Item deleted');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <div>
      <PageHeader title="Menu" subtitle={`${items.length} items · ${availableCount} available`}>
        <button className="btn-primary" onClick={() => setEditing({})}>
          <Plus size={16} /> Add item
        </button>
      </PageHeader>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400" />
          <input className="input pl-9" placeholder="Search item..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input sm:w-52" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="All">All categories</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      {visible.length === 0 ? (
        <EmptyState icon={UtensilsCrossed} title="No menu items found" />
      ) : (
        <>
          {/* Phone: cards */}
          <div className="card divide-y divide-zinc-100 md:hidden">
            {visible.map((item) => (
              <div key={item._id} className={`flex items-center gap-3 px-4 py-2.5 ${item.isAvailable ? '' : 'opacity-60'}`}>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <VegMark isVeg={item.isVeg} />
                    <span className="truncate">{item.name}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {item.category} · <span className="font-semibold text-zinc-700">{formatCurrency(item.price)}</span>
                  </p>
                </div>
                <Toggle checked={item.isAvailable} onChange={() => toggleAvailable(item)} />
                <RowActions onEdit={() => setEditing(item)} onDelete={() => handleDelete(item)} />
              </div>
            ))}
          </div>

          {/* Tablet / desktop: table */}
          <div className="card hidden overflow-hidden md:block">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium text-zinc-500">
                <tr>
                  <th className="px-4 py-2.5">Item</th>
                  <th className="px-4 py-2.5">Category</th>
                  <th className="px-4 py-2.5 text-right">Price</th>
                  <th className="px-4 py-2.5">Available</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {visible.map((item) => (
                  <tr key={item._id} className={`transition hover:bg-zinc-50 ${item.isAvailable ? '' : 'text-zinc-400'}`}>
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-2.5 font-medium">
                        <VegMark isVeg={item.isVeg} /> {item.name}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-zinc-600">{item.category}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(item.price)}</td>
                    <td className="px-4 py-2.5">
                      <Toggle checked={item.isAvailable} onChange={() => toggleAvailable(item)} />
                    </td>
                    <td className="px-4 py-2.5">
                      <RowActions onEdit={() => setEditing(item)} onDelete={() => handleDelete(item)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {editing && (
        <MenuItemForm item={editing} categories={categories} onClose={() => setEditing(null)} onSaved={handleSaved} />
      )}
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      title={checked ? 'Available - click to mark unavailable' : 'Unavailable - click to mark available'}
      onClick={onChange}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-emerald-500' : 'bg-zinc-300'}`}
    >
      <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition ${checked ? 'translate-x-5' : ''}`} />
    </button>
  );
}

function RowActions({ onEdit, onDelete }) {
  return (
    <div className="flex justify-end gap-1">
      <button className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800" title="Edit" onClick={onEdit}>
        <Pencil size={16} />
      </button>
      <button className="rounded-md p-1.5 text-zinc-500 hover:bg-red-50 hover:text-red-600" title="Delete" onClick={onDelete}>
        <Trash2 size={16} />
      </button>
    </div>
  );
}

function MenuItemForm({ item, categories, onClose, onSaved }) {
  const isNew = !item._id;
  const [form, setForm] = useState({
    name: item.name ?? '',
    category: item.category ?? '',
    price: item.price ?? '',
    isVeg: item.isVeg ?? true,
    isAvailable: item.isAvailable ?? true,
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  function validate() {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.category.trim()) errs.category = 'Category is required';
    const price = Number(form.price);
    if (form.price === '' || Number.isNaN(price) || price < 0) errs.price = 'Enter a valid price';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    const payload = { ...form, name: form.name.trim(), category: form.category.trim(), price: Number(form.price) };
    try {
      const saved = isNew ? await menuApi.create(payload) : await menuApi.update(item._id, payload);
      toast.success(isNew ? 'Item added' : 'Item updated');
      onSaved(saved);
    } catch (err) {
      toast.error(getErrorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal title={isNew ? 'Add menu item' : 'Edit menu item'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Name" error={errors.name}>
          <input className="input" autoFocus maxLength={80} value={form.name} onChange={set('name')} placeholder="e.g. Masala Dosa" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category" error={errors.category}>
            <input className="input" list="categories" maxLength={40} value={form.category} onChange={set('category')} placeholder="e.g. Starters" />
            <datalist id="categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label="Price (₹)" error={errors.price}>
            <input className="input" type="number" min="0" step="0.01" value={form.price} onChange={set('price')} placeholder="0" />
          </Field>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-zinc-600">Type</p>
          <div className="grid grid-cols-2 gap-2">
            {[[true, 'Veg'], [false, 'Non-veg']].map(([value, label]) => (
              <button
                key={label}
                type="button"
                onClick={() => setForm((f) => ({ ...f, isVeg: value }))}
                className={`flex items-center justify-center gap-2 h-9 rounded-md border text-sm font-medium transition-colors ${
                  form.isVeg === value ? 'border-zinc-900 text-zinc-900 ring-1 ring-zinc-900' : 'border-zinc-200 text-zinc-600'
                }`}
              >
                <VegMark isVeg={value} /> {label}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center justify-between rounded-md border border-zinc-200 px-3 py-2.5 text-sm font-medium">
          Available for orders
          <input type="checkbox" className="h-4 w-4 accent-zinc-900" checked={form.isAvailable} onChange={set('isAvailable')} />
        </label>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={saving}>{saving ? 'Saving...' : isNew ? 'Add item' : 'Save changes'}</button>
        </div>
      </form>
    </Modal>
  );
}

function Field({ label, error, children }) {
  return (
    <label className="block text-sm">
      <span className="label">{label}</span>
      <div className="mt-1.5">{children}</div>
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
