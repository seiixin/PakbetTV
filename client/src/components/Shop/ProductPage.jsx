import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './Shop.css';
import API_BASE_URL from '../../config';
import NavBar from '../NavBar';
import Footer from '../Footer';
import ProductCard from '../common/ProductCard';

const ProductPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchParams] = useSearchParams(); 
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get('category') || 'all'
  );
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isCategoriesVisible, setIsCategoriesVisible] = useState(true);
  const navigate = useNavigate();
  
  const categories = [
    { id: 'all', name: 'All Products', image: '/Categories-1.png' },
    { id: 'best-sellers', name: 'Best Sellers', image: '/Categories-1.png' },
    { id: 'flash-deals', name: 'Flash Deals', image: '/Categories-2.png' },
    { id: 'books', name: 'Books', image: '/Categories-3.png' },
    { id: 'amulets', name: 'Amulets', image: '/Categories-5.png' },
    { id: 'bracelets', name: 'Bracelets', image: '/Categories-4.png' },
    { id: 'new-arrivals', name: 'New Arrivals', image: '/Categories-2.png' }
  ];

  useEffect(() => {
    const categoryParam = searchParams.get('category');
    if (categoryParam && categories.some(cat => cat.id === categoryParam)) {
      setSelectedCategory(categoryParam);
    } else {
      setSelectedCategory('all');
    }
  }, [searchParams]); 

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [selectedCategory, products]); 

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/products`);
      if (!response.ok) {
        let errorMsg = 'Failed to fetch products';
        try {
          const errorData = await response.json();
          errorMsg = errorData.message || errorMsg;
        } catch (parseError) {  }
        throw new Error(errorMsg);
      }
      const data = await response.json();
      const productsArray = Array.isArray(data.products) ? data.products : []; 
      console.log("Raw products from API:", productsArray);
      setProducts(productsArray); 
      setError(null);
    } catch (err) {
      setError('Error loading products. Please try again later.');
      console.error('Error fetching products:', err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    if (selectedCategory === 'all') {
      setFilteredProducts(products);
      return;
    }
    if (selectedCategory === 'best-sellers') {
      setFilteredProducts(products.filter(product => product.is_best_seller));
      return;
    }
    if (selectedCategory === 'flash-deals') {
      setFilteredProducts(products.filter(product => product.is_flash_deal));
      return;
    }
    if (selectedCategory === 'new-arrivals') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      setFilteredProducts(products.filter(product => {
        const createdDate = new Date(product.created_at);
        return createdDate > thirtyDaysAgo;
      }));
      return;
    }
    setFilteredProducts(products.filter(product => 
      product.category_name?.toLowerCase() === selectedCategory?.toLowerCase()
    ));
  };

  const handleCategoryClick = (categoryId) => {
    setSelectedCategory(categoryId);
  };

  const handleProductClick = (productId) => {
    navigate(`/product/${productId}`);
  };

  const formatPrice = (price) => {
    const numericPrice = Number(price);
    if (isNaN(numericPrice)) {
      console.warn(`Invalid price value received: ${price}`);
      return '₱NaN';
    }
    return `₱${numericPrice.toFixed(2)}`;
  };

  const toggleCategories = () => {
    setIsCategoriesVisible(!isCategoriesVisible);
  };

  return (
    <div className="shop-container">
      <NavBar />
      <div className="shop-main">
        <div className="products-content">
          <div className="shop-header">
            <h1>Shop</h1>
          </div>
          
          <button 
            className={`toggle-categories ${!isCategoriesVisible ? 'collapsed' : ''}`}
            onClick={toggleCategories}
          >
            {isCategoriesVisible ? 'Hide Categories' : 'Show Categories'}
            <i className="fas fa-chevron-up"></i>
          </button>

          <div className={`shop-categories ${!isCategoriesVisible ? 'collapsed' : ''}`}>
            <div className="shop-categories-grid">
              {categories.map(category => (
                <div 
                  key={category.id}
                  className={`shop-category-card ${selectedCategory === category.id ? 'active' : ''}`}
                  onClick={() => handleCategoryClick(category.id)}
                >
                  <div className="shop-category-image">
                    <img src={category.image} alt={category.name} />
                  </div>
                  <h3>{category.name}</h3>
                </div>
              ))}
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}
          {loading ? (
            <div className="loading-spinner">Loading products...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="no-products">
              <p>No products found in this category.</p>
            </div>
          ) : (
            <div className="shop-products-grid">
              {filteredProducts.map(product => (
                <ProductCard key={product.product_id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ProductPage; 