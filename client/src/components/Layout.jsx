import { Outlet, Link, useNavigate } from 'react-router-dom';
import { clearSession, getUser } from '../lib/api.js';

export default function Layout() {
  const user = getUser();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Supplier Restaurant Layer
            </p>
            <h1 className="text-lg font-semibold text-slate-900">
              Product Verification Workspace
            </h1>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            {user?.role === 'SUPPLIER' && (
              <Link className="text-slate-600 hover:text-slate-900" to="/supplier">
                Supplier Dashboard
              </Link>
            )}
            {user?.role === 'RESTAURANT' && (
              <Link className="text-slate-600 hover:text-slate-900" to="/restaurant">
                Restaurant Dashboard
              </Link>
            )}
            {user && (
              <button
                type="button"
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600"
                onClick={handleLogout}
              >
                Log out
              </button>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
