import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import './App.css'
import './styles/Modern.css'
import Home from './components/Home'
import Login from './components/Auth/Login'
import Signup from './components/Auth/Signup'
import Account from './components/Account/Account'
import Purchases from './components/Account/Purchases'
import OrderConfirmation from './components/Account/OrderConfirmation'
import ProductManagement from './components/Admin/ProductManagement'
import ProductPage from './components/Shop/ProductPage'
import ProductDetailPage from './components/Shop/ProductDetailPage'
import Cart from './components/Shop/Cart'
import Checkout from './components/Shop/Checkout'
import TransactionComplete from './components/Shop/TransactionComplete'
import ProsperGuide from './components/Guides/ProsperGuide'
import Horoscope from './components/Horoscope/Horoscope'
import OrderTracking from './pages/OrderTracking'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import Blog from './components/Blog'
import BlogDetail from './components/BlogDetail'
import FAQs from './components/FAQs'

function AppContent() {
  const location = useLocation();
  console.log('Current location:', location.pathname);
  
  // Determine if we should show the debug component (only in development)
  const isDevelopment = import.meta.env.DEV;
  
  return (
    <>
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
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/transaction-complete" element={<TransactionComplete />} />
        <Route path="/prosper-guide/:sign" element={<ProsperGuide />} />
        <Route path="/horoscope" element={<Horoscope />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:blogID" element={<BlogDetail />} />
        <Route path="/faqs" element={<FAQs />} />
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
