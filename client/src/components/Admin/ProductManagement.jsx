import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import axios from 'axios';
import { FaEdit, FaTrash, FaPlus, FaTimes } from 'react-icons/fa';
import './Admin.css';
import styled from 'styled-components';
import { toast } from 'react-toastify';
import './ProductManagement.css';
import API_BASE_URL from '../../config';
const ModalContent = styled.div`
  .read-only-field {
    background-color: #f0f0f0;
    color: #555;
    cursor: not-allowed;
  }
`;
const formatPrice = (price) => {
  if (price === null || price === undefined) return 'N/A';
  if (typeof price === 'string' && price.includes('-')) {
    const [min, max] = price.split('-');
    return `₱${Number(min).toFixed(2)} - ₱${Number(max).toFixed(2)}`;
  }
  return `₱${Number(price).toFixed(2)}`;
};
const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString();
  } catch (e) {
    return 'Invalid Date';
  }
};
const getPrimaryImageUrl = (product) => {
  try {
    if (Array.isArray(product.images) && product.images.length > 0) {
      const primary = product.images.find(img => img.order === 0) || product.images[0];
      if (primary && primary.url) {
        if (!primary.url.startsWith('http') && !primary.url.startsWith('/')) {
          return `${API_URL}/${primary.url}`;
        }
        return primary.url;
      }
    }
    if (Array.isArray(product.variants) && product.variants.length > 0) {
      const firstVariantWithImage = product.variants.find(v => v.image_url);
      if (firstVariantWithImage && firstVariantWithImage.image_url) {
        if (!firstVariantWithImage.image_url.startsWith('http') && !firstVariantWithImage.image_url.startsWith('/')) {
          return `${API_URL}/${firstVariantWithImage.image_url}`;
        }
        return firstVariantWithImage.image_url;
      }
    }
  } catch (error) {
    console.error('Error getting primary image URL:', error);
  }
  return null;
};
const ProductRow = memo(({ product, onEdit, onDelete }) => {
  const [imageError, setImageError] = useState(false);
  const imageUrl = getPrimaryImageUrl(product);
  const handleImageError = () => {
    setImageError(true);
  };
  return (
    <tr>
      <td>
        {imageUrl && !imageError ? (
          <img 
            src={imageUrl} 
            alt={product.name}
            className="product-thumbnail"
            onError={handleImageError}
          />
        ) : (
          <div className="no-image-placeholder">No Image</div>
        )}
      </td>
      <td>{product.product_code}</td>
      <td>{product.name}</td>
      <td>{product.category_name}</td>
      <td>{formatPrice(product.price)}</td>
      <td>{product.stock}</td>
      <td>{formatDate(product.created_at)}</td>
      <td>
        <button 
          type="button" 
          className="btn btn-sm btn-primary" 
          onClick={() => onEdit(product)}
        >
          Edit
        </button>
        <button 
          type="button" 
          className="btn btn-sm btn-danger ms-2" 
          onClick={onDelete}
        >
          Delete
        </button>
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [categories, setCategories] = useState([]);
  const [includeVariants, setIncludeVariants] = useState(false);
  const [variants, setVariants] = useState([]);
  const [variantAttributes, setVariantAttributes] = useState([]); 
  const [newAttributeName, setNewAttributeName] = useState(''); 
  const [currentVariant, setCurrentVariant] = useState({ 
    price: '',
    stock: '',
    image: null,
    preview: null,
    attributes: {} 
  });
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
  const [showModal, setShowModal] = useState(false);
  const [confirmDeleteProduct, setConfirmDeleteProduct] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  useEffect(() => {
    resetForm();
    fetchProducts();
    fetchCategories();
  }, []);
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/products`);
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
      const response = await fetch(`${API_URL}/api/categories`);
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
    console.log('[generateProductCode] Received categoryId:', categoryId, typeof categoryId);
    if (!categoryId || isNaN(categoryId)) { 
      console.log('[generateProductCode] Invalid or missing categoryId.');
      return '';
    } 
    console.log('[generateProductCode] Categories available:', categories);
    const category = categories.find(cat => cat.category_id === categoryId); 
    console.log('[generateProductCode] Found category:', category);
    if (!category) {
      console.log('[generateProductCode] Category object not found.');
      return '';
    } 
    const prefix = category.code || category.name.substring(0, 3).toUpperCase(); 
    console.log('[generateProductCode] Calculated prefix:', prefix);
    console.log('[generateProductCode] Existing products state:', products);
    const existingProducts = products.filter(p => parseInt(p.category_id) === categoryId);
    console.log('[generateProductCode] Filtered existing products in category:', existingProducts);
    const nextNumber = (existingProducts.length + 1).toString().padStart(3, '0');
    console.log('[generateProductCode] Calculated next number:', nextNumber);
    const finalCode = `${prefix}${nextNumber}`;
    console.log('[generateProductCode] Returning final code:', finalCode);
    return finalCode;
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
      setCurrentProduct(prev => {
        const numericValue = value === '' ? '' : Number(value);
        console.log(`Input change - Name: ${name}, Raw Value: ${value}, Parsed Value: ${numericValue}, Type: ${typeof numericValue}`); 
        const updated = {
          ...prev,
          [name]: numericValue
        };
        if (name === 'category_id' && !isEditing && !isNaN(numericValue)) {
          const newProductCode = generateProductCode(numericValue);
          updated.product_code = newProductCode;
        }
        console.log('Updated product state:', updated);
        return updated;
      });
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
    setIsEditing(false);
    setIsModalOpen(false);
    setError(null);
    setSuccessMessage('');
    setUserInitiatedSubmit(false);
    setIncludeVariants(false);
    setVariants([]);
    setVariantAttributes([]); 
    setNewAttributeName(''); 
    setCurrentVariant({ 
        price: '',
        stock: '',
        image: null,
        preview: null,
        attributes: {}
    });
  };
  const handleAddNewClick = () => {
    resetForm();
    setIsModalOpen(true);
  };
  const handleEditClick = useCallback(async (product) => {
    try {
      resetForm(); 
      setIsEditing(true); 
      setSuccessMessage('');
      setError('');
      const response = await fetch(`${API_URL}/api/products/${product.product_id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch product details');
      }
      const productDetails = await response.json();
      console.log('Product details for editing:', productDetails);
      setCurrentProduct({
        product_id: productDetails.product_id,
        product_code: productDetails.product_code,
        name: productDetails.name,
        description: productDetails.description,
        price: productDetails.price, 
        stock: productDetails.stock_quantity, 
        category_id: productDetails.category_id,
        is_featured: productDetails.is_featured || false,
        images: productDetails.images || []
      });
      setNewProductImages([]); 
      if (Array.isArray(productDetails.variants) && productDetails.variants.length > 0) {
        setIncludeVariants(true);
        const attributeKeys = new Set();
        productDetails.variants.forEach(variant => {
          if (variant.attributes) {
            Object.keys(variant.attributes).forEach(key => attributeKeys.add(key));
          }
        });
        const definedAttributes = Array.from(attributeKeys);
        setVariantAttributes(definedAttributes); 
        console.log('Determined variant attributes for editing:', definedAttributes);
        const formattedVariants = productDetails.variants.map(variant => ({
          variant_id: variant.variant_id,
          price: variant.price || 0,
          stock: variant.stock || 0,
          sku: variant.sku || '', 
          image_url: variant.image_url || null, 
          attributes: variant.attributes || {}, 
          image: null, 
          preview: null 
        }));
        setVariants(formattedVariants);
        console.log('Formatted variants for editing:', formattedVariants);
      } else {
        setIncludeVariants(false);
        setVariants([]);
        setVariantAttributes([]);
      }
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error fetching product details for editing:', error);
      setError('Failed to load product details for editing. Please try again.');
      setIsModalOpen(false); 
      setIsEditing(false); 
    }
  }, [API_URL, resetForm]); 
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
      const response = await fetch(`${API_BASE_URL}/api/products`, {
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
  const handleVariantInputChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (type === 'file') {
      if (files && files.length > 0) {
        setCurrentVariant({
          ...currentVariant,
          [name]: files[0]
        });
      }
    } else {
      setCurrentVariant({
        ...currentVariant,
        [name]: type === 'checkbox' ? checked : 
               (type === 'number' ? (value === '' ? '' : Number(value)) : value)
      });
    }
  };
  const handleAddVariant = () => {
    const initialAttributes = variantAttributes.reduce((acc, attr) => {
        acc[attr] = ''; 
        return acc;
    }, {});
    const newVariant = {
      price: '',
      stock: '',
      image: null,
      preview: null,
      attributes: initialAttributes 
    };
    setVariants([...variants, newVariant]);
  };
  const handleRemoveVariant = (index) => {
    setVariants(variants.filter((_, i) => i !== index));
  };
  const handleVariantChange = (index, field, value) => {
    const updatedVariants = [...variants];
    const currentVariant = updatedVariants[index];
    if (field === 'price' || field === 'stock') {
      currentVariant[field] = (field === 'price' || field === 'stock') ? (value === '' ? '' : Number(value)) : value;
    } else {
      currentVariant.attributes = {
        ...currentVariant.attributes,
        [field]: value 
      };
    }
    setVariants(updatedVariants);
  };
  const handleVariantImageChange = (index, e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const preview = URL.createObjectURL(file);
      const updatedVariants = [...variants];
      updatedVariants[index] = {
        ...updatedVariants[index],
        image: file,
        preview: preview
      };
      setVariants(updatedVariants);
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError('');
      const isPriceRequired = !includeVariants;
      if (!currentProduct.name || (isPriceRequired && !currentProduct.price) || !currentProduct.category_id) {
        let missingFields = [];
        if (!currentProduct.name) missingFields.push('Name');
        if (isPriceRequired && !currentProduct.price) missingFields.push('Price');
        if (!currentProduct.category_id) missingFields.push('Category');
        setError(`${missingFields.join(', ')} ${missingFields.length > 1 ? 'are' : 'is'} required.`);
        setIsSubmitting(false);
        return;
      }
      if (isNaN(parseInt(currentProduct.category_id))) {
        setError('Invalid category selection.');
        setIsSubmitting(false);
        return;
      }
      const formData = new FormData();
      formData.append('name', currentProduct.name);
      formData.append('description', currentProduct.description);
      formData.append('price', currentProduct.price);
      formData.append('stock', currentProduct.stock);
      formData.append('category_id', currentProduct.category_id);
      formData.append('is_featured', currentProduct.is_featured || false);
      if (Array.isArray(newProductImages) && newProductImages.length > 0) {
        newProductImages.forEach(image => {
          if (image instanceof File) {
            formData.append('productImages', image);
          }
        });
      }
      if (variants.length > 0) {
        formData.append('include_variants', 'true');
        const timestamp = Date.now(); 
        const randomString = Math.random().toString(36).substring(2, 6);
        const variantsToSend = variants.map((variant, index) => {
          const variantNumber = index + 1;
          const baseCode = currentProduct.product_code || `TEMP-${timestamp}`;
          const sku = `${baseCode}-${variantNumber}-${randomString}`;
          return {
            price: variant.price || 0, 
            stock: variant.stock || 0, 
            sku,
            attributes: variant.attributes || {}, 
            has_image: !!variant.image 
          };
        });
        formData.append('variants', JSON.stringify(variantsToSend)); 
        variants.forEach((variant) => {
          if (variant.image && variant.image instanceof File) {
            formData.append('variantImages', variant.image);
          }
        });
      }
      const endpoint = isEditing 
        ? `${API_URL}/api/products/${currentProduct.product_id}`
        : `${API_URL}/api/products`;
      const method = isEditing ? 'PUT' : 'POST';
      const response = await fetch(endpoint, {
        method,
        body: formData
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save product');
      }
      const responseData = await response.json();
      setSuccessMessage(isEditing ? 'Product updated successfully!' : 'Product created successfully!');
      setTimeout(() => {
        setIsModalOpen(false);
        fetchProducts();
      }, 1500);
    } catch (error) {
      console.error('Error saving product:', error);
      setError(error.message || 'An error occurred while saving the product.');
    } finally {
      setIsSubmitting(false);
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
      const response = await fetch(`${API_URL}/api/product-images/${imageIdToDelete}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to delete image' }));
        throw new Error(errorData.message || 'Server failed to delete image');
      }
      setCurrentProduct(prev => ({
        ...prev,
        images: prev.images.filter(img => img.image_id !== imageIdToDelete)
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
      const response = await fetch(`${API_URL}/api/products/${id}`, {
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
  const calculateDiscountedPrice = useCallback((price, discount) => {
    if (!discount || price === null || price === undefined) return price;
    if (typeof price === 'string' && price.includes('-')) {
      const [min, max] = price.split('-').map(p => Number(p));
      const discountedMin = (min - (min * discount / 100)).toFixed(2);
      const discountedMax = (max - (max * discount / 100)).toFixed(2);
      return `${discountedMin}-${discountedMax}`;
    }
    return (Number(price) - (Number(price) * discount / 100)).toFixed(2);
  }, []);
  const getCategoryPlaceholder = useCallback((category) => {
    const baseUrl = `${API_BASE_URL}/images`;
    switch(category && category.toLowerCase()) {
      case 'books':
        return `${baseUrl}/placeholder-book.jpg`;
      case 'amulets':
        return `${baseUrl}/placeholder-amulet.jpg`;
      case 'bracelets':
        return `${baseUrl}/placeholder-bracelet.jpg`;
      default:
        return `${baseUrl}/placeholder-product.jpg`;
    }
  }, []);
  const handleAddAttribute = () => {
    const trimmedName = newAttributeName.trim();
    if (trimmedName && !variantAttributes.includes(trimmedName)) {
      setVariantAttributes([...variantAttributes, trimmedName]);
      setVariants(prevVariants => prevVariants.map(v => ({
        ...v,
        attributes: { ...v.attributes, [trimmedName]: '' } 
      })));
    }
    setNewAttributeName(''); 
  };
  const handleRemoveAttribute = (attributeToRemove) => {
    setVariantAttributes(variantAttributes.filter(attr => attr !== attributeToRemove));
    setVariants(prevVariants => prevVariants.map(v => {
      const newAttributes = { ...v.attributes };
      delete newAttributes[attributeToRemove];
      return { ...v, attributes: newAttributes };
    }));
  };
  return (
    <div className="admin-container">
      <h1>Product Management</h1>
      {successMessage && (
        <div className="success-message">{successMessage}</div>
      )}
      {error && (
        <div className="error-message">
          {typeof error === 'object' 
            ? Object.values(error).join(', ')
            : error}
        </div>
      )}
      {submitError && (
          <div className="error-message">{submitError}</div>
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
                  disabled={includeVariants}
                  title={includeVariants ? "Price is calculated from variants when variants are enabled" : ""}
                  className={includeVariants ? "read-only-field" : ""}
                />
                {includeVariants && (
                  <small>Price will be calculated from variant prices</small>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="category">Category*</label>
                <select
                  id="category_id"
                  name="category_id"
                  value={currentProduct.category_id || ''}
                  onChange={handleInputChange}
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
                  disabled={includeVariants}
                  title={includeVariants ? "Stock is managed per variant when variants are enabled" : ""}
                  className={includeVariants ? "read-only-field" : ""}
                />
                {includeVariants && (
                  <small>Stock is managed per variant when variants are enabled</small>
                )}
              </div>
              <div className="form-group checkbox-group">
                <input
                  type="checkbox"
                  id="include_variants"
                  name="include_variants"
                  checked={includeVariants}
                  onChange={() => setIncludeVariants(!includeVariants)}
                />
                <label htmlFor="include_variants">Include Variants (e.g., Size, Color, Material)</label>
              </div>
              {}
              {includeVariants && (
                <div className="attribute-definition-section full-width">
                  <h5>Define Variant Attributes</h5>
                  <p className="text-muted small">Define the properties that differ between variants (e.g., Size, Color, Material).</p>
                  {}
                  {variantAttributes.length > 0 && (
                    <div className="defined-attributes-list">
                      <strong>Defined:</strong>
                      {variantAttributes.map(attr => (
                        <span key={attr} className="attribute-tag">
                          {attr}
                          <button 
                            type="button" 
                            onClick={() => handleRemoveAttribute(attr)}
                            className="remove-attribute-btn"
                            title="Remove this attribute"
                          >
                            &times;
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {}                  
                  <div className="add-attribute-input-group">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="New attribute name (e.g., Material)"
                      value={newAttributeName}
                      onChange={(e) => setNewAttributeName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddAttribute(); } }}
                    />
                    <button 
                      type="button" 
                      className="btn btn-primary"
                      onClick={handleAddAttribute}
                      disabled={!newAttributeName.trim()}
                    >
                      Add Attribute
                    </button>
                  </div>
                </div>
              )}
              {}
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
                <label htmlFor="productImages">
                  {includeVariants ? 'Product Images (Optional)' : 'Product Images'}
                </label>
                <input
                  type="file"
                  id="productImages"
                  name="productImages"
                  onChange={handleImageChange}
                  accept="image}
              {includeVariants && (
                <div className="variants-section full-width">
                  <h3>Product Variants</h3>
                  {variantAttributes.length > 0 ? (
                    <p className="text-muted small">Add variants with specific values for each attribute defined above.</p>
                  ) : (
                    <div className="alert alert-warning">
                      <i className="fas fa-info-circle me-2"></i>
                      Please define at least one variant attribute above before adding variants.
                    </div>
                  )}
                  {variants.map((variant, index) => (
                    <div key={index} className="variant-form">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6 className="m-0"><strong>Variant {index + 1}</strong></h6>
                        <button 
                          type="button" 
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleRemoveVariant(index)}
                        >
                          <i className="fas fa-times me-1"></i> Remove
                        </button>
                      </div>
                      {}                      
                      <div className="row">
                        {variantAttributes.map(attrName => (
                          <div key={`${index}-${attrName}`} className="col-md-6">
                            <div className="mb-3">
                              <label htmlFor={`variant-${index}-${attrName}`} className="form-label">{attrName}</label>
                              <input
                                type="text"
                                className="form-control"
                                id={`variant-${index}-${attrName}`}
                                value={variant.attributes[attrName] || ''} 
                                onChange={(e) => handleVariantChange(index, attrName, e.target.value)} 
                                placeholder={`Enter ${attrName}`}
                              />
                            </div>
                          </div>
                        ))}
                      </div> 
                      {}                      
                      <div className="row">
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label htmlFor={`variant-price-${index}`} className="form-label">Price*</label>
                            <div className="input-group">
                              <span className="input-group-text">₱</span>
                              <input
                                type="number"
                                className="form-control"
                                id={`variant-price-${index}`}
                                value={variant.price || ''}
                                onChange={(e) => handleVariantChange(index, 'price', e.target.value)}
                                placeholder="0.00"
                                required 
                              />
                            </div>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label htmlFor={`variant-stock-${index}`} className="form-label">Stock</label>
                            <input
                              type="number"
                              className="form-control"
                              id={`variant-stock-${index}`}
                              value={variant.stock || ''}
                              onChange={(e) => handleVariantChange(index, 'stock', e.target.value)}
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>
                      {}                      
                      <div className="mb-3">
                        <label htmlFor={`variant-image-${index}`} className="form-label">Variant Image (Optional)</label>
                        <input
                          type="file"
                          className="form-control"
                          id={`variant-image-${index}`}
                          onChange={(e) => handleVariantImageChange(index, e)}
                          accept="image}
                        {(variant.preview || (variant.image_url && !variant.preview)) && (
                          <div className="mt-2 variant-image-preview">
                            <img 
                              src={variant.preview || `${API_URL}/${variant.image_url}`} 
                              alt={`Variant ${index + 1} Preview`}
                              className="img-thumbnail" 
                              style={{ maxHeight: '100px', minHeight: '60px', minWidth: '60px' }} 
                              onError={(e) => { 
                                console.log("Image error");
                                e.target.src = '/placeholder-product.jpg'; 
                                e.target.onerror = null; 
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {}                  
                  {variantAttributes.length > 0 && (
                    <div className="d-flex justify-content-center my-4">
                      <button 
                        type="button" 
                        className="btn btn-success"
                        onClick={handleAddVariant}
                      >
                        <i className="fas fa-plus me-2"></i> Add Variant
                      </button>
                    </div>
                  )}
                </div>
              )}
              {}
              {}
              <div className="form-buttons">
                <button 
                  type="button" 
                  className="btn btn-outline-secondary" 
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className={`btn ${isEditing ? 'btn-warning' : 'btn-success'}`}
                  disabled={
                    !currentProduct.name || 
                    !currentProduct.category_id || 
                    (includeVariants ? variants.length === 0 : !currentProduct.price) ||
                    isSubmitting
                  }
                >
                  {isSubmitting ? (
                    <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Saving...</>
                  ) : (
                    isEditing ? <><i className="fas fa-save me-2"></i>Update Product</> : <><i className="fas fa-plus me-2"></i>Create Product</>
                  )}
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
                  <th>Product Code</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(products) && products.map((product) => (
                  <ProductRow
                    key={product.product_id}
                    product={product}
                    onEdit={handleEditClick}
                    onDelete={() => handleDelete(product.product_id)}
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