import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import './App.css'
import Home from './components/Home'
import Login from './components/Auth/Login'
import Signup from './components/Auth/Signup'
import NavBar from './components/NavBar'
import { AuthProvider } from './context/AuthContext'
import Account from './components/Account/Account'
import Purchases from './components/Account/Purchases'
import ProductManagement from './components/Admin/ProductManagement'
import ProductPage from './components/Shop/ProductPage'
import ProductDetailPage from './components/Shop/ProductDetailPage'

function AppContent() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';
  
  return (
    <>
      {!isAuthPage && <NavBar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/account" element={<Account />} />
        <Route path="/purchases" element={<Purchases />} />
        <Route path="/admin/products" element={<ProductManagement />} />
        <Route path="/shop" element={<ProductPage />} />
        <Route path="/product/:id" element={<ProductDetailPage />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  )
}

export default App
