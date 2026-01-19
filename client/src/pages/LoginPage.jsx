import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, setSession, getUser } from '../lib/api.js';

export default function LoginPage() {
  const navigate = useNavigate();
  const existing = getUser();
  const [form, setForm] = useState({
    email: existing?.email || 'supplier1@example.com',
    password: 'password'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(form)
      });
      setSession(data.token, data.user);
      navigate(data.user.role === 'SUPPLIER' ? '/supplier' : '/restaurant');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm"
      >
        <h2 className="text-2xl font-semibold text-slate-900">Sign in</h2>
        <p className="mt-2 text-sm text-slate-500">
          Use the demo credentials to access supplier or restaurant flows.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Email
            </label>
            <input
              name="email"
              value={form.email}
              onChange={handleChange}
              className="mt-2 w-full rounded-xl border-slate-200 px-4 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Password
            </label>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              className="mt-2 w-full rounded-xl border-slate-200 px-4 py-2 text-sm"
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {loading ? 'Signing in...' : 'Login'}
        </button>

        <div className="mt-6 rounded-xl border border-dashed border-slate-200 p-4 text-xs text-slate-500">
          <p className="font-semibold text-slate-600">Demo accounts</p>
          <p>supplier1@example.com / password</p>
          <p>restaurant1@example.com / password</p>
        </div>
      </form>
    </div>
  );
}
