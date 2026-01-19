import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api.js';
import { Link } from 'react-router-dom';

const statusStyles = {
  DRAFT: 'bg-slate-100 text-slate-600',
  SUBMITTED: 'bg-amber-100 text-amber-700',
  VERIFIED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-rose-100 text-rose-700'
};

export default function SupplierDashboard() {
  const [supplier, setSupplier] = useState(null);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    category: '',
    origin_country: '',
    producer_name: '',
    certifications: '',
    co2_per_kg: '',
    production_method: ''
  });

  const loadProducts = async () => {
    const data = await apiFetch('/api/supplier/products');
    setSupplier(data.supplier);
    setProducts(data.products);
  };

  useEffect(() => {
    loadProducts().catch((err) => setError(err.message));
  }, []);

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await apiFetch('/api/supplier/products', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          certifications: form.certifications
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
          co2_per_kg: Number(form.co2_per_kg || 0)
        })
      });
      setForm({
        name: '',
        category: '',
        origin_country: '',
        producer_name: '',
        certifications: '',
        co2_per_kg: '',
        production_method: ''
      });
      await loadProducts();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAction = async (id, action) => {
    setError('');
    try {
      if (action === 'submit') {
        await apiFetch(`/api/supplier/products/${id}/submit`, { method: 'POST' });
      }
      if (action === 'verify') {
        await apiFetch(`/api/admin/products/${id}/verify`, { method: 'POST' });
      }
      if (action === 'reject') {
        await apiFetch(`/api/admin/products/${id}/reject`, { method: 'POST' });
      }
      await loadProducts();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-wide text-slate-400">Supplier workspace</p>
        <h2 className="text-2xl font-semibold text-slate-900">
          {supplier ? supplier.name : 'Your products'}
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Draft and submit products for restaurant visibility and approval.
        </p>
      </header>

      {error && (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-slate-900">Create product</h3>
        <form onSubmit={handleCreate} className="mt-4 grid gap-4 md:grid-cols-2">
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Product name"
            className="rounded-xl border-slate-200 px-4 py-2 text-sm"
            required
          />
          <input
            name="category"
            value={form.category}
            onChange={handleChange}
            placeholder="Category"
            className="rounded-xl border-slate-200 px-4 py-2 text-sm"
            required
          />
          <input
            name="origin_country"
            value={form.origin_country}
            onChange={handleChange}
            placeholder="Origin country"
            className="rounded-xl border-slate-200 px-4 py-2 text-sm"
            required
          />
          <input
            name="producer_name"
            value={form.producer_name}
            onChange={handleChange}
            placeholder="Producer"
            className="rounded-xl border-slate-200 px-4 py-2 text-sm"
            required
          />
          <input
            name="certifications"
            value={form.certifications}
            onChange={handleChange}
            placeholder="Certifications (comma separated)"
            className="rounded-xl border-slate-200 px-4 py-2 text-sm"
          />
          <input
            name="co2_per_kg"
            value={form.co2_per_kg}
            onChange={handleChange}
            placeholder="CO2 per kg"
            type="number"
            step="0.1"
            className="rounded-xl border-slate-200 px-4 py-2 text-sm"
            required
          />
          <input
            name="production_method"
            value={form.production_method}
            onChange={handleChange}
            placeholder="Production method"
            className="rounded-xl border-slate-200 px-4 py-2 text-sm md:col-span-2"
            required
          />
          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white md:col-span-2"
          >
            Add product
          </button>
        </form>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">Product list</h3>
        <div className="grid gap-4">
          {products.map((product) => (
            <div
              key={product.id}
              className="rounded-2xl border border-slate-200 bg-white p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <Link
                    to={`/product/${product.id}`}
                    className="text-lg font-semibold text-slate-900"
                  >
                    {product.name}
                  </Link>
                  <p className="text-sm text-slate-500">
                    {product.category} · {product.origin_country}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    statusStyles[product.status] || 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {product.status}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                <span>Producer: {product.producer_name}</span>
                <span>CO2/kg: {product.co2_per_kg}</span>
                <span>Method: {product.production_method}</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                {product.status === 'DRAFT' && (
                  <button
                    onClick={() => handleAction(product.id, 'submit')}
                    className="rounded-full bg-amber-600 px-4 py-2 text-xs font-semibold text-white"
                  >
                    Submit for review
                  </button>
                )}
                {product.status === 'SUBMITTED' && (
                  <>
                    <button
                      onClick={() => handleAction(product.id, 'verify')}
                      className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white"
                    >
                      Verify (demo admin)
                    </button>
                    <button
                      onClick={() => handleAction(product.id, 'reject')}
                      className="rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600"
                    >
                      Reject
                    </button>
                  </>
                )}
                {product.status === 'VERIFIED' && (
                  <span className="text-xs text-slate-400">
                    Verified products are read-only.
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
