import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../lib/api.js';
import { Link } from 'react-router-dom';

const claimOptions = [
  { id: 'origin', label: 'Origin verified' },
  { id: 'certification', label: 'Certifications verified' },
  { id: 'co2', label: 'CO₂ verified' }
];

export default function RestaurantDashboard() {
  const [catalog, setCatalog] = useState([]);
  const [selections, setSelections] = useState([]);
  const [filter, setFilter] = useState('');
  const [activeProduct, setActiveProduct] = useState(null);
  const [activeProductDetail, setActiveProductDetail] = useState(null);
  const [approvedClaims, setApprovedClaims] = useState([]);
  const [error, setError] = useState('');

  const loadData = async () => {
    const [catalogData, selectionData] = await Promise.all([
      apiFetch('/api/restaurant/catalog'),
      apiFetch('/api/restaurant/selection')
    ]);
    setCatalog(catalogData.products);
    setSelections(selectionData.selections);
  };

  useEffect(() => {
    loadData().catch((err) => setError(err.message));
  }, []);

  const filteredCatalog = useMemo(() => {
    const query = filter.toLowerCase();
    return catalog.filter((product) =>
      [product.name, product.category, product.supplier_name]
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [catalog, filter]);

  const openModal = async (product) => {
    setActiveProduct(product);
    setActiveProductDetail(null);
    const existing = selections.find((selection) => selection.product_id === product.id);
    setApprovedClaims(existing?.approved_claims || []);
    try {
      const detailData = await apiFetch(`/api/products/${product.id}`);
      setActiveProductDetail(detailData.product);
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleClaim = (claimId) => {
    setApprovedClaims((prev) =>
      prev.includes(claimId)
        ? prev.filter((item) => item !== claimId)
        : [...prev, claimId]
    );
  };

  const handleSave = async () => {
    setError('');
    try {
      await apiFetch('/api/restaurant/selection', {
        method: 'POST',
        body: JSON.stringify({
          product_id: activeProduct.id,
          approved_claims: approvedClaims
        })
      });
      setActiveProduct(null);
      setActiveProductDetail(null);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-wide text-slate-400">Restaurant workspace</p>
        <h2 className="text-2xl font-semibold text-slate-900">
          Verified supplier catalog
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Select verified products and record approved sustainability claims.
        </p>
      </header>

      {error && (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-slate-900">Catalog</h3>
          <input
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Filter products"
            className="rounded-xl border-slate-200 px-4 py-2 text-sm"
          />
        </div>
        <div className="mt-4 grid gap-4">
          {filteredCatalog.map((product) => (
            <div
              key={product.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
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
                  <p className="text-xs text-slate-400">Supplier: {product.supplier_name}</p>
                </div>
                <button
                  className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
                  onClick={() => openModal(product)}
                >
                  Select product
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-slate-900">Your selections</h3>
        <div className="mt-4 space-y-3">
          {selections.length === 0 && (
            <p className="text-sm text-slate-500">No selections yet.</p>
          )}
          {selections.map((selection) => (
            <div
              key={selection.id}
              className="rounded-xl border border-slate-200 px-4 py-3"
            >
              <p className="text-sm font-semibold text-slate-900">{selection.name}</p>
              <p className="text-xs text-slate-500">Supplier: {selection.supplier_name}</p>
              <p className="mt-2 text-xs text-slate-500">
                Approved claims: {selection.approved_claims.join(', ') || 'None'}
              </p>
            </div>
          ))}
        </div>
      </section>

      {activeProduct && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6">
            <h4 className="text-lg font-semibold text-slate-900">Select claims</h4>
            <p className="mt-1 text-sm text-slate-500">
              {activeProduct.name} · {activeProduct.origin_country}
            </p>
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Evidence summary
              </p>
              <p className="mt-2 text-sm text-slate-700">
                {activeProductDetail?.evidence_notes ||
                  'No evidence notes available yet.'}
              </p>
              <div className="mt-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Evidence URL
                </p>
                {activeProductDetail?.evidence_url ? (
                  <a
                    href={activeProductDetail.evidence_url}
                    className="mt-1 inline-flex text-sm font-medium text-emerald-700 hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {activeProductDetail.evidence_url}
                  </a>
                ) : (
                  <p className="mt-1 text-sm text-slate-500">
                    No evidence URL provided.
                  </p>
                )}
              </div>
              <div className="mt-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Verification notes
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {activeProductDetail?.verification_notes ||
                    'No verification notes recorded yet.'}
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Allowed claims
              </p>
              {claimOptions.map((claim) => (
                <label key={claim.id} className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={approvedClaims.includes(claim.id)}
                    onChange={() => toggleClaim(claim.id)}
                    className="rounded border-slate-300"
                  />
                  {claim.label}
                </label>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
                onClick={() => {
                  setActiveProduct(null);
                  setActiveProductDetail(null);
                }}
              >
                Cancel
              </button>
              <button
                className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
                onClick={handleSave}
              >
                Save selection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
