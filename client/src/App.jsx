import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import './App.css'
import './styles/Modern.css'
import './styles/notifications.css'
import { initFacebookSDK } from './utils/facebookSDK'
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
import SocialAuthSuccess from './components/Auth/SocialAuthSuccess'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import Blog from './components/Blog'
import BlogDetail from './components/BlogDetail'
import FAQs from './components/FAQs'
import Contact from './components/Contact'
function AppContent() {
  const location = useLocation();
  const [isFBInitialized, setFBInitialized] = useState(false);
  
  useEffect(() => {
    const initFB = async () => {
      try {
        await initFacebookSDK();
        setFBInitialized(true);
      } catch (error) {
        console.error('Error initializing Facebook SDK:', error);
        // Still set as initialized to not block the app
        setFBInitialized(true);
      }
    };

    initFB();
  }, []);
  
  // Show loading state while FB SDK initializes
  if (!isFBInitialized) {
    return <div>Loading...</div>;
  }
  
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/social-auth-success" element={<SocialAuthSuccess />} />
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
      <ToastContainer
        position="top-right"
        autoClose={3000}
        limit={3}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </Router>
  )
}

export default App
