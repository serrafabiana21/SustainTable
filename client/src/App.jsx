import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import LoginPage from './pages/LoginPage.jsx';
import SupplierDashboard from './pages/SupplierDashboard.jsx';
import RestaurantDashboard from './pages/RestaurantDashboard.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import Layout from './components/Layout.jsx';
import { getUser } from './lib/api.js';

const RequireRole = ({ role, children }) => {
  const location = useLocation();
  const user = getUser();
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (role && user.role !== role) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<Layout />}>
        <Route
          path="/supplier"
          element={
            <RequireRole role="SUPPLIER">
              <SupplierDashboard />
            </RequireRole>
          }
        />
        <Route
          path="/restaurant"
          element={
            <RequireRole role="RESTAURANT">
              <RestaurantDashboard />
            </RequireRole>
          }
        />
        <Route
          path="/product/:id"
          element={
            <RequireRole>
              <ProductDetail />
            </RequireRole>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
