import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import './App.css'
import Home from './components/Home'
import Login from './components/Auth/Login'
import Signup from './components/Auth/Signup'
import NavBar from './components/NavBar'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import Account from './components/Account/Account'
import Purchases from './components/Account/Purchases'
import OrderConfirmation from './components/Account/OrderConfirmation'
import ProductManagement from './components/Admin/ProductManagement'
import ProductPage from './components/Shop/ProductPage'
import ProductDetailPage from './components/Shop/ProductDetailPage'
import Cart from './components/Shop/Cart'
import TransactionComplete from './components/Shop/TransactionComplete'
import ProsperGuide from './components/Guides/ProsperGuide'
import OrderTracking from './pages/OrderTracking'

function AppContent() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';
  console.log('Current location:', location.pathname);
  return (
    <>
      {!isAuthPage && <NavBar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/account" element={<Account />} />
        <Route path="/account/purchases" element={<Purchases />} />
        <Route path="/account/orders/:orderId" element={<OrderConfirmation />} />
        <Route path="/account/tracking/:orderId" element={<OrderTracking />} />
        <Route path="/purchases" element={<Navigate to="/account/purchases" replace />} />
        <Route path="/admin/products" element={<ProductManagement />} />
        <Route path="/shop" element={<ProductPage />} />
        <Route path="/product/:id" element={<ProductDetailPage />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/transaction-complete" element={<TransactionComplete />} />
        <Route path="/prosper-guide/:sign" element={<ProsperGuide />} />
      </Routes>
    </>
  );
}
function App() {
  console.log('App component rendering');
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <AppContent />
        </CartProvider>
      </AuthProvider>
    </Router>
  )
}
export default App
