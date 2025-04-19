import React, { useState, useEffect, useCallback } from 'react';
import './Admin.css';
import styled from 'styled-components';

const ModalContent = styled.div`
  .read-only-field {
    background-color: #f0f0f0;
    color: #555;
    cursor: not-allowed;
  }
`;

// Define the memoized ProductRow component
const ProductRow = React.memo(({ product, handleEditClick, handleDelete, deleteInProgress, getPrimaryImageUrl, getCategoryPlaceholder, formatPrice, calculateDiscountedPrice, formatDate }) => {
  // Construct the full image URL if the primary URL is relative
  const rawImageUrl = getPrimaryImageUrl(product.images);
  const fullImageUrl = rawImageUrl && rawImageUrl.startsWith('/') 
    ? `http://localhost:5000${rawImageUrl}` 
    : rawImageUrl; // Assume it's already absolute or null

  // Determine the initial source: valid full URL or placeholder
  const initialImageSrc = fullImageUrl || getCategoryPlaceholder(product.category_name);

  const displayStock = product.stock !== null && product.stock !== undefined ? product.stock : 'N/A';

  // Memoize the onError handler
  const handleImageError = useCallback((e) => {
    e.target.onerror = null; // Prevent infinite loop if placeholder also fails
    const placeholderSrc = getCategoryPlaceholder(product.category_name);
    console.log(`Image error for ${product.product_id}. Setting placeholder: ${placeholderSrc}`);
    e.target.src = placeholderSrc;
  }, [getCategoryPlaceholder, product.category_name, product.product_id]); // Dependencies

  console.log(`Rendering row for product: ${product.product_id}, Initial Image Src: ${initialImageSrc}`);

  return (
    <tr key={product.product_id}>
      <td>
        <img 
          src={initialImageSrc} // Use the determined initial source
          alt={product.name}
          className="product-thumbnail" 
          onError={handleImageError} // Use the memoized handler
        />
      </td>
      <td>{product.name}</td>
      <td>{product.category_name}</td>
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
      <td>{displayStock}</td>
      <td>{product.product_code}</td>
      <td title={product.description || 'No description'}>
        {product.description ? `${product.description.substring(0, 50)}...` : '-'}
      </td>
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
            type="button"
            className="btn btn-edit"
            onClick={(e) => {
              e.stopPropagation();
              handleEditClick(product.product_id);
            }}
            onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
          >
            Edit
          </button>
          <button 
            type="button"
            className="btn btn-delete"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(product.product_id);
            }}
            onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
            // Check deleteInProgress specific to *this* product if possible, otherwise use global
            // For now, using global deleteInProgress passed as prop
            disabled={deleteInProgress} 
          >
            {deleteInProgress ? 'Deleting...' : 'Delete'} 
          </button>
        </div>
      </td>
    </tr>
  );
});

const ProductManagement = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteInProgress, setDeleteInProgress] = useState(false);
  const [userInitiatedSubmit, setUserInitiatedSubmit] = useState(false);
  const [categories, setCategories] = useState([]);
  const [currentProduct, setCurrentProduct] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    stock: '',
    is_best_seller: false,
    is_flash_deal: false,
    flash_deal_end: '',
    discount_percentage: '',
    images: [],
    product_code: ''
  });
  const [newProductImages, setNewProductImages] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    // Reset all form state when component mounts
    resetForm();
    // Then fetch products and categories
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/products');
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      const data = await response.json();
      setProducts(Array.isArray(data.products) ? data.products : []);
      setError(null);
    } catch (err) {
      setError('Error fetching products: ' + err.message);
      console.error('Error fetching products:', err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/categories');
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      const data = await response.json();
      const fetchedCategories = Array.isArray(data) ? data : [];
      console.log("Fetched categories:", fetchedCategories);
      setCategories(fetchedCategories);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setCategories([
        { id: 1, name: 'books', code: 'BK' },
        { id: 2, name: 'amulets', code: 'AM' },
        { id: 3, name: 'bracelets', code: 'BR' }
      ]);
    }
  };

  const generateProductCode = (categoryId) => {
    if (!categoryId) return '';
    
    const category = categories.find(cat => cat.id === parseInt(categoryId));
    if (!category) return '';
    
    const prefix = category.code || category.name.substring(0, 2).toUpperCase();
    
    const existingProducts = products.filter(p => p.category_id === parseInt(categoryId));
    const nextNumber = (existingProducts.length + 1).toString().padStart(3, '0');
    
    return `${prefix}${nextNumber}`;
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
    
    if (type === 'number' || name === 'category_id') {
      setCurrentProduct({
        ...currentProduct,
        [name]: value === '' ? '' : Number(value)
      });
      
      // Generate product code if category changes
      if (name === 'category_id' && !isEditing && value !== '') {
        const newProductCode = generateProductCode(Number(value));
        setCurrentProduct(prev => ({
          ...prev,
          [name]: Number(value),
          product_code: newProductCode
        }));
      }
      return;
    }
    
    setCurrentProduct({
      ...currentProduct,
      [name]: value
    });
  };

  const handleImageChange = (e) => {
    if (e.target.files) {
      setNewProductImages(Array.from(e.target.files));
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setCurrentProduct({
      name: '',
      description: '',
      price: '',
      category_id: '',
      stock: '',
      is_best_seller: false,
      is_flash_deal: false,
      flash_deal_end: '',
      discount_percentage: '',
      images: [],
      product_code: ''
    });
    setNewProductImages([]);
    setIsModalOpen(false);
    setDeleteInProgress(false);
  };

  const handleAddNewClick = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleEditClick = useCallback(async (productId) => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/products/${productId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch product details for editing');
      }
      const productData = await response.json();

      let formattedProduct = { ...productData };
      
      // Format date for datetime-local input
      if (productData.flash_deal_end) {
        const date = new Date(productData.flash_deal_end);
        if (!isNaN(date.getTime())) {
          const year = date.getFullYear();
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const day = date.getDate().toString().padStart(2, '0');
          const hours = date.getHours().toString().padStart(2, '0');
          const minutes = date.getMinutes().toString().padStart(2, '0');
          formattedProduct.flash_deal_end = `${year}-${month}-${day}T${hours}:${minutes}`;
        } else {
          formattedProduct.flash_deal_end = '';
        }
      } else {
        formattedProduct.flash_deal_end = '';
      }
      
      // Ensure images array
      formattedProduct.images = Array.isArray(productData.images) ? productData.images : [];
      
      // Ensure product_code is set
      formattedProduct.product_code = productData.product_code || '';
      
      // Make sure category_id is set properly
      formattedProduct.category_id = productData.category_id || '';

      setCurrentProduct(formattedProduct);
      setIsEditing(true);
      setNewProductImages([]);
      setIsModalOpen(true);
      setError(null);
    } catch (err) {
      setError('Error fetching product details: ' + err.message);
      console.error('Error fetching product details:', err);
    } finally {
      setLoading(false);
    }
  }, [setLoading, setCurrentProduct, setIsEditing, setNewProductImages, setIsModalOpen, setError]);

  // Add a direct test function
  const testDirectApiCall = async () => {
    try {
      const testData = {
        name: "Test Product",
        price: 10.99,
        category_id: 1,
        description: "Test description",
        stock: 5,
        is_best_seller: false,
        is_flash_deal: false,
        product_code: "TEST001"
      };
      
      console.log("Making direct test API call with:", testData);
      
      const response = await fetch('http://localhost:5000/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testData)
      });
      
      console.log("Test API Response Status:", response.status);
      const responseText = await response.text();
      console.log("Test API Response:", responseText);
      
      return responseText;
    } catch (error) {
      console.error("Test API call failed:", error);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!currentProduct.name || !currentProduct.price || !currentProduct.category_id) {
      const missingFields = [];
      if (!currentProduct.name) missingFields.push('Name');
      if (!currentProduct.price) missingFields.push('Price');
      if (!currentProduct.category_id) missingFields.push('Category');
      setError(`Please fill in all required fields: ${missingFields.join(', ')}`);
      return;
    }
    
    try {
      const formData = new FormData();
      
      // Ensure category_id is a number before appending
      const categoryIdNum = parseInt(currentProduct.category_id);
      if (isNaN(categoryIdNum)) {
        console.error("Invalid Category ID before sending:", currentProduct.category_id);
        setError("Invalid Category ID selected. Please select a valid category.");
        return;
      }
      
      // Create a temporary product data object to avoid sending the complex 'images' array
      const productDataToSend = { ...currentProduct };
      delete productDataToSend.images; // Remove existing images array from payload
      productDataToSend.category_id = categoryIdNum; // Ensure numeric ID is used

      // Append product data fields to FormData
      for (const key in productDataToSend) {
        // Handle boolean values correctly for FormData
        if (typeof productDataToSend[key] === 'boolean') {
          formData.append(key, productDataToSend[key] ? 'true' : 'false');
        } else if (productDataToSend[key] !== null && productDataToSend[key] !== undefined) {
          formData.append(key, productDataToSend[key]);
        }
      }

      // Append NEW product images
      if (newProductImages && newProductImages.length > 0) {
        newProductImages.forEach((file) => {
          formData.append('productImages', file, file.name);
        });
        console.log(`Appending ${newProductImages.length} new images.`);
      }

      // Determine endpoint and method
      const url = isEditing 
        ? `http://localhost:5000/api/products/${currentProduct.product_id}` 
        : 'http://localhost:5000/api/products';
      const method = isEditing ? 'PUT' : 'POST';

      console.log(`Sending ${method} request to: ${url} with FormData`);
      // Log FormData entries for debugging (optional, can be verbose)
      // for (let pair of formData.entries()) {
      //   console.log(pair[0]+ ': '+ pair[1]); 
      // }

      const response = await fetch(url, {
        method,
        body: formData, // Send FormData object
        // No 'Content-Type' header needed; browser sets it for FormData
      });

      const responseText = await response.text();
      console.log('Response status:', response.status);
      console.log('Response text:', responseText);

      if (!response.ok) {
        let errorMessage = `Failed to save product (${response.status})`;
        try {
          // Try to parse error message if server sends JSON error
          if (responseText.trim().startsWith('{')) {
            const errorData = JSON.parse(responseText);
            errorMessage = errorData.message || (errorData.errors && errorData.errors[0]?.msg) || errorMessage;
          }
        } catch (parseError) {
          // Keep generic error message if parsing fails
          console.error('Could not parse error response JSON:', parseError);
        }
        throw new Error(errorMessage);
      }

      // Parse success response
      let result;
      try {
        result = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error('Error parsing success response:', parseError);
        throw new Error(`Product saved, but server response was invalid JSON: ${responseText.slice(0, 100)}...`);
      }
      
      console.log('Parsed success result:', result);

      setSuccessMessage(result.message || (isEditing ? 'Product updated successfully!' : 'Product created successfully!'));
      fetchProducts();
      resetForm();
      setTimeout(() => setSuccessMessage(''), 3000);

    } catch (err) {
      setError('Error saving product: ' + err.message);
      console.error('Error submitting product:', err);
    }
  };

  const handleDeleteImage = async (imageIdToDelete) => {
    if (!currentProduct.product_id || !imageIdToDelete) {
      console.error("Missing product ID or image ID for deletion.");
      setError("Cannot delete image: missing ID.");
      return;
    }
    if (!window.confirm('Are you sure you want to delete this image permanently?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/products/images/${imageIdToDelete}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to delete image' }));
        throw new Error(errorData.message || 'Server failed to delete image');
      }

      setCurrentProduct(prev => ({
        ...prev,
        images: prev.images.filter(img => img.id !== imageIdToDelete)
      }));

      setSuccessMessage('Image deleted successfully!');
       setTimeout(() => {
          setSuccessMessage('');
      }, 3000);

    } catch (err) {
      setError('Error deleting image: ' + err.message);
      console.error('Error deleting image:', err);
    }
  };

  const handleDelete = useCallback(async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
        return;
    }
    setError(null);
    setSuccessMessage('');
    setDeleteInProgress(true);

    try {
        const response = await fetch(`http://localhost:5000/api/products/${id}`, {
            method: 'DELETE'
        });

        console.log('Delete Response Status:', response.status);

        if (!response.ok) {
            let errorMsg = 'Failed to delete product';
            try {
                 const errorData = await response.json();
                 errorMsg = errorData.message || errorMsg;
                 console.error('Delete Error Data:', errorData);
            } catch (e) {
                 console.error('Could not parse error response:', e);
            }
            throw new Error(errorMsg);
        }

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            const result = await response.json();
            console.log('Delete Success Data:', result);
            setSuccessMessage(result.message || 'Product deleted successfully!');
        } else {
            console.log('Delete successful (no content in response).');
            setSuccessMessage('Product deleted successfully!');
        }

        fetchProducts();
        
        setIsEditing(false);
        setCurrentProduct({
          name: '',
          description: '',
          price: '',
          category_id: '',
          stock: '',
          is_best_seller: false,
          is_flash_deal: false,
          flash_deal_end: '',
          discount_percentage: '',
          images: [],
          product_code: ''
        });
        setNewProductImages([]);
        setIsModalOpen(false);
        
        setTimeout(() => {
            setSuccessMessage('');
            setDeleteInProgress(false);
        }, 3000);
        
        return;

    } catch (err) {
        setError('Error deleting product: ' + err.message);
        console.error('Error deleting product:', err);
        setDeleteInProgress(false);
    }
  }, [setError, setSuccessMessage, setDeleteInProgress, fetchProducts, setIsEditing, setCurrentProduct, setNewProductImages, setIsModalOpen]);

  const formatPrice = useCallback((price) => {
    if (price === null || price === undefined) return 'N/A';
    return `₱${Number(price).toFixed(2)}`;
  }, []);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString();
    } catch (e) {
      return 'Invalid Date';
    }
  }, []);

  const calculateDiscountedPrice = useCallback((price, discount) => {
    if (!discount || price === null || price === undefined) return price;
    return (price - (price * discount / 100)).toFixed(2);
  }, []);

  const getCategoryPlaceholder = useCallback((category) => {
    switch(category) {
      case 'books':
        return '/placeholder-book.jpg';
      case 'amulets':
        return '/placeholder-amulet.jpg';
      case 'bracelets':
        return '/placeholder-bracelet.jpg';
      default:
        return '/placeholder-product.jpg';
    }
  }, []);

  const getPrimaryImageUrl = useCallback((images) => {
    if (!Array.isArray(images) || images.length === 0) {
      return null;
    }
    const primary = images.find(img => img.order === 0) || images[0]; 
    return primary.url; 
  }, []);

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
            
            <form 
              onSubmit={handleSubmit} 
              className="product-form" 
              noValidate 
              autoComplete="off"
            >
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
                  id="category_id"
                  name="category_id"
                  value={currentProduct.category_id || ''}
                  onChange={(e) => {
                    const numericId = parseInt(e.target.value);
                    console.log('Category selected:', e.target.value, typeof e.target.value);
                    console.log('Converted to number:', numericId, typeof numericId);
                    
                    // Update state with numeric ID
                    setCurrentProduct(prev => {
                      const updated = {
                        ...prev,
                        category_id: numericId
                      };
                      
                      // Generate code if needed
                      if (!isEditing && !isNaN(numericId)) {
                        // Find the category using the correct ID field
                        const selectedCategory = categories.find(cat => cat.category_id === numericId);
                        const prefix = selectedCategory ? 
                          (selectedCategory.code || selectedCategory.name.substring(0, 3).toUpperCase()) : 
                          'PRD';
                        updated.product_code = `${prefix}${new Date().getTime().toString().slice(-4)}`;
                      }
                      
                      console.log('Updated product state:', updated);
                      return updated;
                    });
                  }}
                  required
                >
                  <option key="placeholder" value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.category_id} value={category.category_id}>
                      {category.name}
                    </option>
                  ))}
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

              <div className="form-group">
                <label htmlFor="product_code">Product Code</label>
                <input
                  type="text"
                  id="product_code"
                  name="product_code"
                  value={currentProduct.product_code || ''}
                  readOnly
                  className="read-only-field"
                />
                <small>Automatically generated based on category</small>
              </div>

              <div className="form-group full-width">
                <label htmlFor="productImages">Product Images</label>
                <input
                  type="file"
                  id="productImages"
                  name="productImages"
                  onChange={handleImageChange}
                  accept="image/*"
                  multiple
                />
                <small>Upload new images. Existing images will be kept unless deleted below.</small>
              </div>

              {isEditing && currentProduct.images && currentProduct.images.length > 0 && (
                <div className="existing-images-section full-width">
                  <p>Current Images:</p>
                  <div className="existing-images-grid">
                    {currentProduct.images.map((img) => (
                      <div key={img.id} className="existing-image-item">
                        <img
                          src={img.url}
                          alt={img.alt || 'Product image'}
                          className="existing-image-thumbnail"
                        />
                        <button
                          type="button"
                          className="btn btn-delete btn-delete-image"
                          onClick={() => handleDeleteImage(img.id)}
                          title="Delete this image"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="form-buttons">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={resetForm}
                  onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={!currentProduct.name || !currentProduct.price || !currentProduct.category_id}
                  onClick={() => setUserInitiatedSubmit(true)}
                >
                  {isEditing ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
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
                  <th>Product Code</th>
                  <th>Description</th>
                  <th>Tags</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(products) && products.map((product) => (
                  <ProductRow
                    key={product.product_id}
                    product={product}
                    handleEditClick={handleEditClick}
                    handleDelete={handleDelete}
                    deleteInProgress={deleteInProgress}
                    getPrimaryImageUrl={getPrimaryImageUrl}
                    getCategoryPlaceholder={getCategoryPlaceholder}
                    formatPrice={formatPrice}
                    calculateDiscountedPrice={calculateDiscountedPrice}
                    formatDate={formatDate}
                  />
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