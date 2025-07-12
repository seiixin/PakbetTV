import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import axios from 'axios'
import './App.css'
import './styles/Modern.css'
import './styles/notifications.css'
import { initFacebookSDK } from './utils/facebookSDK'
import API_BASE_URL from './config'
import Home from './components/Home'
import Login from './components/Auth/Login'
import Signup from './components/Auth/Signup'
import Account from './components/Account/Account'
import Purchases from './components/Account/Purchases'
import OrderConfirmation from './components/Account/OrderConfirmation'
import ProductManagement from './components/Admin/ProductManagement'
import ProductPage from './components/Shop/ProductPage'
import CategoryPage from './components/Shop/CategoryPage'
import ProductDetailPage from './components/Shop/ProductDetailPage'
import Cart from './components/Shop/Cart'
import Checkout from './components/Shop/Checkout'
import TransactionComplete from './components/Shop/TransactionComplete'
import ProsperGuide from './components/Guides/ProsperGuide'
import ProductPageGuide from './components/ProductGuide/ProductPageGuide'
import Horoscope from './components/Horoscope/Horoscope'
import OrderTracking from './pages/OrderTracking/OrderTracking'
import SocialAuthSuccess from './components/Auth/SocialAuthSuccess'
import BaziCalculator from './components/BaziCalculator/BaziCalculator'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { LegalModalProvider, useLegalModal } from './context/LegalModalContext'
import LegalModal from './components/common/LegalModal'
import Blog from './components/Blog'
import BlogDetail from './components/BlogDetail'
import FAQs from './components/FAQs'
import Contact from './components/Contact'
import Consultation from './components/Consultation'
import ForgotPassword from './pages/ForgotPassword/ForgotPassword'
import ResetPassword from './pages/ResetPassword/ResetPassword'
import PrivacyPolicy from './components/Legal/PrivacyPolicy'
import ChatButton from './components/common/ChatButton'
import PromoModal from './components/common/PromoModal';

function LegalModalContainer() {
  const { modalState, closeModal } = useLegalModal();
  return (
    <LegalModal 
      isOpen={modalState.isOpen}
      onClose={closeModal}
      type={modalState.type}
    />
  );
}

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

  // Trigger payment status check on page load/refresh
  useEffect(() => {
    const triggerPaymentCheck = async () => {
      try {
        // Only trigger if this is a page refresh or new session
        const isPageRefresh = performance.navigation?.type === 1 || 
                             performance.getEntriesByType('navigation')[0]?.type === 'reload';
        
        if (isPageRefresh || !sessionStorage.getItem('paymentCheckTriggered')) {
          console.log('Triggering payment status check on page load...');
          
          const response = await axios.post(`${API_BASE_URL}/api/transactions/trigger-payment-check`, {}, {
            timeout: 5000 // 5 second timeout
          });
          
          if (response.data.success) {
            console.log('Payment status check triggered successfully:', response.data.message);
            if (response.data.updated > 0) {
              console.log(`${response.data.updated} payment(s) updated`);
            }
          }
          
          // Mark as triggered for this session
          sessionStorage.setItem('paymentCheckTriggered', 'true');
        }
      } catch (error) {
        // Silently handle errors - don't disrupt user experience
        console.log('Payment status check trigger failed (non-critical):', error.message);
      }
    };

    // Delay the trigger slightly to not block initial page load
    const timer = setTimeout(triggerPaymentCheck, 1000);
    
    return () => clearTimeout(timer);
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
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/consultation" element={<Consultation />} />
        <Route path="/social-auth-success" element={<SocialAuthSuccess />} />
        <Route path="/account" element={<Account />} />
        <Route path="/account/purchases" element={<Purchases />} />
        <Route path="/account/orders/:orderId" element={<OrderConfirmation />} />
        <Route path="/account/tracking/:orderId" element={<OrderTracking />} />
        <Route path="/purchases" element={<Navigate to="/account/purchases" replace />} />
        <Route path="/admin/products" element={<ProductManagement />} />
        <Route path="/shop" element={<ProductPage />} />
        <Route path="/category/:category" element={<CategoryPage />} />
        <Route path="/product/:id" element={<ProductDetailPage />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/transaction-complete" element={<TransactionComplete />} />
        <Route path="/payment/confirmation" element={<TransactionComplete />} />
        <Route path="/prosper-guide/:sign" element={<ProsperGuide />} />
        <Route path="/product-guide" element={<ProductPageGuide />} />
        <Route path="/horoscope" element={<Horoscope />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:blogID" element={<BlogDetail />} />
        <Route path="/faqs" element={<FAQs />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/bazi-calculator" element={<BaziCalculator />} />
      </Routes>
    </>
  );
}

function App() {
  console.log('App component rendering');
  
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <LegalModalProvider>
            <PromoModal
              title="Welcome! 🎉"
              message="Enjoy 10% OFF your first order. Use code: WELCOME10 at checkout!"
              ctaText="Shop Now"
              ctaLink="/shop"
              image="/Carousel-2.jpg"
            />
            <AppContent />
            <ChatButton />
            <LegalModalContainer />
          </LegalModalProvider>
        </CartProvider>
      </AuthProvider>
      <ToastContainer
        position={isMobile ? "top-center" : "top-right"}
        autoClose={isMobile ? 2500 : 3000}
        limit={isMobile ? 2 : 3}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss={!isMobile}
        draggable={!isMobile}
        pauseOnHover={!isMobile}
        theme="light"
        style={{
          fontSize: isMobile ? '14px' : '16px',
        }}
      />
    </Router>
  )
}

export default App
