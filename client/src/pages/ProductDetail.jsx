import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch, getUser } from '../lib/api.js';

export default function ProductDetail() {
  const { id } = useParams();
  const user = getUser();
  const [product, setProduct] = useState(null);
  const [supplier, setSupplier] = useState(null);
  const [selection, setSelection] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [error, setError] = useState('');

  const loadData = async () => {
    const [productData, auditData] = await Promise.all([
      apiFetch(`/api/product/${id}`),
      apiFetch(`/api/audit/product/${id}`)
    ]);
    setProduct(productData.product);
    setSupplier(productData.supplier);
    setSelection(productData.selection);
    setAuditLogs(auditData.logs);
  };

  useEffect(() => {
    loadData().catch((err) => setError(err.message));
  }, [id]);

  if (error) {
    return (
      <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
        {error}
      </div>
    );
  }

  if (!product) {
    return <div className="text-sm text-slate-500">Loading product...</div>;
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wide text-slate-400">Product detail</p>
        <h2 className="text-2xl font-semibold text-slate-900">{product.name}</h2>
        <p className="mt-2 text-sm text-slate-500">
          {product.category} · {product.origin_country} · {product.status}
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-slate-900">Product overview</h3>
          <dl className="mt-4 space-y-2 text-sm text-slate-600">
            <div className="flex justify-between">
              <dt>Supplier</dt>
              <dd className="font-medium text-slate-900">{supplier?.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Producer</dt>
              <dd className="font-medium text-slate-900">{product.producer_name}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Production method</dt>
              <dd className="font-medium text-slate-900">{product.production_method}</dd>
            </div>
            <div className="flex justify-between">
              <dt>CO2 per kg</dt>
              <dd className="font-medium text-slate-900">{product.co2_per_kg}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Certifications</dt>
              <dd className="font-medium text-slate-900">
                {product.certifications.join(', ') || 'None'}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-slate-900">Approved claims</h3>
          {user?.role === 'RESTAURANT' && (
            <p className="mt-2 text-sm text-slate-500">
              Claims approved by your restaurant selection.
            </p>
          )}
          <div className="mt-4 space-y-2 text-sm text-slate-600">
            {selection ? (
              selection.approved_claims.map((claim) => (
                <span
                  key={claim}
                  className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700"
                >
                  {claim}
                </span>
              ))
            ) : (
              <p className="text-sm text-slate-500">No approved claims recorded.</p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-slate-900">Audit trail</h3>
        <div className="mt-4 space-y-3">
          {auditLogs.length === 0 && (
            <p className="text-sm text-slate-500">No audit events yet.</p>
          )}
          {auditLogs.map((log) => (
            <div
              key={log.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">{log.action}</p>
                <p className="text-xs text-slate-500">Actor: {log.actor_email}</p>
              </div>
              <p className="text-xs text-slate-400">
                {new Date(log.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
