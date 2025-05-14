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

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/api/products`);
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      const data = await response.json();
      setProducts(data.products || []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products. Please try again later.');
      setLoading(false);
    }
  };

  const handleCategoryClick = (categoryId) => {
    navigate(`/shop?category=${categoryId}`);
    setSelectedCategory(categoryId);
  };

  useEffect(() => {
    filterProducts();
  }, [selectedCategory, products, searchParams]); 

  const filterProducts = () => {
    let filtered = [...products];
    const searchQuery = searchParams.get('search')?.toLowerCase();

    // Apply category filter
    if (selectedCategory && selectedCategory !== 'all') {
      filtered = filtered.filter(product => {
        if (selectedCategory === 'best-sellers') {
          return product.items_sold > 100; // Example threshold
        } else if (selectedCategory === 'flash-deals') {
          return product.discount_percentage > 0;
        } else if (selectedCategory === 'new-arrivals') {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return new Date(product.created_at) > thirtyDaysAgo;
        } else {
          return product.category_name?.toLowerCase() === selectedCategory.toLowerCase();
        }
      });
    }

    // Apply search filter if search query exists
    if (searchQuery) {
      filtered = filtered.filter(product => {
        const name = product.name?.toLowerCase() || '';
        const description = product.description?.toLowerCase() || '';
        const category = product.category_name?.toLowerCase() || '';
        const code = product.product_code?.toLowerCase() || '';
        
        return name.includes(searchQuery) ||
               description.includes(searchQuery) ||
               category.includes(searchQuery) ||
               code.includes(searchQuery);
      });
    }

    setFilteredProducts(filtered);
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
              <p>No products found{searchParams.get('search') ? ' matching your search' : ' in this category'}.</p>
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
      <Footer forceShow={false} />
    </div>
  );
};

export default ProductPage; 