import { BrowserRouter, Route, Routes } from 'react-router';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import TablesPage from './pages/TablesPage';
import OrderPage from './pages/OrderPage';
import BillPage from './pages/BillPage';
import BillsPage from './pages/BillsPage';
import MenuPage from './pages/MenuPage';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{ duration: 2500, style: { fontSize: 14, borderRadius: 8, border: "1px solid #e4e4e7", boxShadow: "0 4px 12px rgb(0 0 0 / 0.06)" } }}
      />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<TablesPage />} />
          <Route path="orders/:id" element={<OrderPage />} />
          <Route path="bills" element={<BillsPage />} />
          <Route path="bills/:id" element={<BillPage />} />
          <Route path="menu" element={<MenuPage />} />
          <Route path="*" element={<p className="text-center text-zinc-500">Page not found</p>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
