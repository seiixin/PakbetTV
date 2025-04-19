import React, { useState, useEffect } from 'react';
import './Admin.css';

const ProductManagement = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState({
    name: '',
    description: '',
    price: '',
    category: 'books',
    stock: '',
    is_best_seller: false,
    is_flash_deal: false,
    flash_deal_end: '',
    discount_percentage: ''
  });
  const [productImage, setProductImage] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/products');
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      const data = await response.json();
      setProducts(data);
      setError(null);
    } catch (err) {
      setError('Error fetching products: ' + err.message);
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setCurrentProduct({
        ...currentProduct,
        [name]: checked
      });
      return;
    }
    
    if (type === 'number') {
      setCurrentProduct({
        ...currentProduct,
        [name]: value === '' ? '' : Number(value)
      });
      return;
    }
    
    setCurrentProduct({
      ...currentProduct,
      [name]: value
    });
  };

  const handleImageChange = (e) => {
    setProductImage(e.target.files[0]);
  };

  const resetForm = () => {
    setIsEditing(false);
    setCurrentProduct({
      name: '',
      description: '',
      price: '',
      category: 'books',
      stock: '',
      is_best_seller: false,
      is_flash_deal: false,
      flash_deal_end: '',
      discount_percentage: ''
    });
    setProductImage(null);
    setIsModalOpen(false);
  };

  const handleAddNewClick = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleEditClick = (product) => {
    let formattedProduct = { ...product };
    if (product.flash_deal_end) {
      const date = new Date(product.flash_deal_end);
      formattedProduct.flash_deal_end = date.toISOString().slice(0, 16);
    }
    
    setCurrentProduct(formattedProduct);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const formData = new FormData();
      
      Object.keys(currentProduct).forEach(key => {
        if (key === 'id' && !isEditing) return;
      
        if (typeof currentProduct[key] === 'boolean') {
          formData.append(key, currentProduct[key] ? 'true' : 'false');
        } else if (currentProduct[key] !== null && currentProduct[key] !== undefined) {
          formData.append(key, currentProduct[key]);
        }
      });
      if (productImage) {
        formData.append('productImage', productImage);
      }
      
      const url = isEditing 
        ? `http://localhost:5000/api/products/${currentProduct.id}`
        : 'http://localhost:5000/api/products';
      
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Something went wrong');
      }
      
      setSuccessMessage(isEditing ? 'Product updated successfully!' : 'Product created successfully!');
      resetForm();
      fetchProducts();
      
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      
    } catch (err) {
      setError('Error: ' + err.message);
      console.error('Error submitting product:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:5000/api/products/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete product');
      }
      setSuccessMessage('Product deleted successfully!');
      fetchProducts();
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      
    } catch (err) {
      setError('Error deleting product: ' + err.message);
      console.error('Error deleting product:', err);
    }
  };

  const formatPrice = (price) => {
    return `₱${Number(price).toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const calculateDiscountedPrice = (price, discount) => {
    if (!discount) return price;
    return (price - (price * discount / 100)).toFixed(2);
  };
  const getCategoryPlaceholder = (category) => {
    switch(category) {
      case 'books':
        return 'http://localhost:5000/uploads/placeholder-book.jpg';
      case 'amulets':
        return 'http://localhost:5000/uploads/placeholder-amulet.jpg';
      case 'bracelets':
        return 'http://localhost:5000/uploads/placeholder-bracelet.jpg';
      default:
        return 'http://localhost:5000/uploads/placeholder-product.jpg';
    }
  };

  return (
    <div className="admin-container">
      <h1>Product Management</h1>
      {successMessage && (
        <div className="success-message">{successMessage}</div>
      )}
      {error && (
        <div className="error-message">{error}</div>
      )}
      <div className="action-bar">
        <button 
          className="btn btn-primary add-product-btn"
          onClick={handleAddNewClick}
        >
          Add New Product
        </button>
      </div>
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{isEditing ? 'Edit Product' : 'Add New Product'}</h2>
              <button 
                className="modal-close-btn"
                onClick={() => setIsModalOpen(false)}
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="product-form">
              <div className="form-group">
                <label htmlFor="name">Product Name*</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={currentProduct.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="price">Price*</label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={currentProduct.price}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="category">Category*</label>
                <select
                  id="category"
                  name="category"
                  value={currentProduct.category}
                  onChange={handleInputChange}
                  required
                >
                  <option value="books">Books</option>
                  <option value="amulets">Amulets</option>
                  <option value="bracelets">Bracelets</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="stock">Stock</label>
                <input
                  type="number"
                  id="stock"
                  name="stock"
                  value={currentProduct.stock || ''}
                  onChange={handleInputChange}
                  min="0"
                />
              </div>
              
              <div className="form-group checkbox-group">
                <input
                  type="checkbox"
                  id="is_best_seller"
                  name="is_best_seller"
                  checked={currentProduct.is_best_seller || false}
                  onChange={handleInputChange}
                />
                <label htmlFor="is_best_seller">Best Seller</label>
              </div>
              
              <div className="form-group checkbox-group">
                <input
                  type="checkbox"
                  id="is_flash_deal"
                  name="is_flash_deal"
                  checked={currentProduct.is_flash_deal || false}
                  onChange={handleInputChange}
                />
                <label htmlFor="is_flash_deal">Flash Deal</label>
              </div>
              
              {/* Move description to its own row that spans the full width */}
              <div className="form-group full-width">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={currentProduct.description || ''}
                  onChange={handleInputChange}
                  rows="4"
                />
              </div>
              
              {currentProduct.is_flash_deal && (
                <>
                  <div className="form-group">
                    <label htmlFor="flash_deal_end">Flash Deal End Date</label>
                    <input
                      type="datetime-local"
                      id="flash_deal_end"
                      name="flash_deal_end"
                      value={currentProduct.flash_deal_end || ''}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="discount_percentage">Discount Percentage (%)</label>
                    <input
                      type="number"
                      id="discount_percentage"
                      name="discount_percentage"
                      value={currentProduct.discount_percentage || ''}
                      onChange={handleInputChange}
                      min="1"
                      max="99"
                    />
                  </div>
                </>
              )}
              
              <div className="form-group full-width">
                <label htmlFor="productImage">Product Image</label>
                <input
                  type="file"
                  id="productImage"
                  name="productImage"
                  onChange={handleImageChange}
                  accept="image/*"
                />
              </div>
              
              {isEditing && currentProduct.image_url && !productImage && (
                <div className="current-image">
                  <p>Current Image:</p>
                  <img 
                    src={`http://localhost:5000${currentProduct.image_url}`} 
                    alt={currentProduct.name} 
                    style={{ maxWidth: '200px', marginTop: '10px' }}
                  />
                </div>
              )}
              
              <div className="form-buttons">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={resetForm}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {isEditing ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Products List */}
      <div className="products-list-container">
        <h2>Products List</h2>
        
        {loading ? (
          <div className="loading">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="empty-list">No products found</div>
        ) : (
          <div className="products-table-container">
            <table className="products-table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Tags</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <img 
                        src={
                          (product.image_url && typeof product.image_url === 'string' && !product.image_url.includes('default')) 
                          ? `http://localhost:5000${product.image_url}` 
                          : getCategoryPlaceholder(product.category)
                        } 
                        alt={product.name}
                        className="product-thumbnail" 
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = getCategoryPlaceholder(product.category);
                        }}
                      />
                    </td>
                    <td>{product.name}</td>
                    <td>{product.category}</td>
                    <td>
                      {product.is_flash_deal ? (
                        <div className="product-price-cell">
                          <span className="original-price">{formatPrice(product.price)}</span>
                          <span className="discounted-price">
                            {formatPrice(calculateDiscountedPrice(product.price, product.discount_percentage))}
                          </span>
                        </div>
                      ) : (
                        formatPrice(product.price)
                      )}
                    </td>
                    <td>{product.stock}</td>
                    <td>
                      <div className="product-tags">
                        {product.is_best_seller && <span className="tag best-seller">Best Seller</span>}
                        {product.is_flash_deal && (
                          <span className="tag flash-deal">
                            Flash Deal 
                            {product.flash_deal_end && ` (Until ${formatDate(product.flash_deal_end)})`}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="btn btn-edit"
                          onClick={() => handleEditClick(product)}
                        >
                          Edit
                        </button>
                        <button 
                          className="btn btn-delete"
                          onClick={() => handleDelete(product.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductManagement; 