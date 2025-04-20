import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import axios from 'axios';
import { FaEdit, FaTrash, FaPlus, FaTimes } from 'react-icons/fa';
import './Admin.css';
import styled from 'styled-components';
import { toast } from 'react-toastify';
import { API_URL } from '../../config';
import './ProductManagement.css';

const ModalContent = styled.div`
  .read-only-field {
    background-color: #f0f0f0;
    color: #555;
    cursor: not-allowed;
  }
`;

// Helper function to format price (moved outside for potential reuse, but kept useCallback for now if used internally)
const formatPrice = (price) => {
  if (price === null || price === undefined) return 'N/A';
  if (typeof price === 'string' && price.includes('-')) {
    const [min, max] = price.split('-');
    return `₱${Number(min).toFixed(2)} - ₱${Number(max).toFixed(2)}`;
  }
  return `₱${Number(price).toFixed(2)}`;
};

// Helper function to format date (moved outside for potential reuse)
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

// Moved getPrimaryImageUrl outside the component
const getPrimaryImageUrl = (product) => {
  try {
    // Check product images first
    if (Array.isArray(product.images) && product.images.length > 0) {
      const primary = product.images.find(img => img.order === 0) || product.images[0];
      if (primary && primary.url) {
        // Ensure URL is properly formatted
        if (!primary.url.startsWith('http') && !primary.url.startsWith('/')) {
          return `${API_URL}/${primary.url}`;
        }
        return primary.url;
      }
    }
    
    // If no product image, check variant images
    if (Array.isArray(product.variants) && product.variants.length > 0) {
      const firstVariantWithImage = product.variants.find(v => v.image_url);
      if (firstVariantWithImage && firstVariantWithImage.image_url) {
        // Ensure URL is properly formatted
        if (!firstVariantWithImage.image_url.startsWith('http') && !firstVariantWithImage.image_url.startsWith('/')) {
          return `${API_URL}/${firstVariantWithImage.image_url}`;
        }
        return firstVariantWithImage.image_url;
      }
    }
  } catch (error) {
    console.error('Error getting primary image URL:', error);
  }
  
  // If no images found anywhere
  return null;
};

// Define the memoized ProductRow component
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
  
  // --- NEW State for Dynamic Attributes ---
  const [variantAttributes, setVariantAttributes] = useState([]); // Stores attribute names ['Size', 'Color']
  const [newAttributeName, setNewAttributeName] = useState(''); // Input for adding new attribute
  // --- END NEW State ---
  
  const [currentVariant, setCurrentVariant] = useState({ // Base structure for adding new variant row
    price: '',
    stock: '',
    image: null,
    preview: null,
    attributes: {} // Initialize with empty attributes object
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
    // Reset all form state when component mounts
    resetForm();
    // Then fetch products and categories
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
    if (!categoryId || isNaN(categoryId)) { // Ensure it's a valid number
      console.log('[generateProductCode] Invalid or missing categoryId.');
      return '';
    } 
    
    console.log('[generateProductCode] Categories available:', categories);
    const category = categories.find(cat => cat.category_id === categoryId); // Use category_id
    console.log('[generateProductCode] Found category:', category);
    if (!category) {
      console.log('[generateProductCode] Category object not found.');
      return '';
    } 
    
    const prefix = category.code || category.name.substring(0, 3).toUpperCase(); // Use 3 chars for prefix
    console.log('[generateProductCode] Calculated prefix:', prefix);
    
    console.log('[generateProductCode] Existing products state:', products);
    // Ensure category_id comparison is correct (both should be numbers)
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
        console.log(`Input change - Name: ${name}, Raw Value: ${value}, Parsed Value: ${numericValue}, Type: ${typeof numericValue}`); // Log price/stock changes
        
        const updated = {
          ...prev,
          [name]: numericValue
        };
        
        // Generate product code if category changes
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
    setVariantAttributes([]); // Reset defined attributes
    setNewAttributeName(''); // Reset attribute input
    setCurrentVariant({ // Reset template for adding variants
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
      // Reset form state first
      resetForm(); 

      // NOW set editing to true
      setIsEditing(true); 
      setSuccessMessage('');
      setError('');
      
      // Fetch full product details including variants
      const response = await fetch(`${API_URL}/api/products/${product.product_id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch product details');
      }
      
      const productDetails = await response.json();
      console.log('Product details for editing:', productDetails);
      
      // --- MODIFIED: Set product state (remove legacy fields if they existed) ---
      setCurrentProduct({
        product_id: productDetails.product_id,
        product_code: productDetails.product_code,
        name: productDetails.name,
        description: productDetails.description,
        // Base price/stock are less relevant when editing variants, keep for consistency?
        price: productDetails.price, 
        stock: productDetails.stock_quantity, 
        category_id: productDetails.category_id,
        // Remove weight, height, width, length if they are now in attributes
        // weight: productDetails.weight || 0, 
        // height: productDetails.height || 0,
        // width: productDetails.width || 0,
        // length: productDetails.length || 0, 
        is_featured: productDetails.is_featured || false,
        images: productDetails.images || []
      });
      
      setNewProductImages([]); // Reset new image uploads
      
      // --- NEW: Load variants and determine attributes ---
      if (Array.isArray(productDetails.variants) && productDetails.variants.length > 0) {
        setIncludeVariants(true);

        // Extract unique attribute keys from all variants
        const attributeKeys = new Set();
        productDetails.variants.forEach(variant => {
          if (variant.attributes) {
            Object.keys(variant.attributes).forEach(key => attributeKeys.add(key));
          }
        });
        const definedAttributes = Array.from(attributeKeys);
        setVariantAttributes(definedAttributes); // Set the defined attribute names
        console.log('Determined variant attributes for editing:', definedAttributes);

        // Format variants for the state, ensuring attributes object exists
        const formattedVariants = productDetails.variants.map(variant => ({
          variant_id: variant.variant_id,
          price: variant.price || 0,
          stock: variant.stock || 0,
          sku: variant.sku || '', // Keep SKU if needed for updates
          image_url: variant.image_url || null, // Existing image URL
          attributes: variant.attributes || {}, // Use parsed attributes from API
          image: null, // For potential new image upload
          preview: null // For new image preview
        }));
        setVariants(formattedVariants);
        console.log('Formatted variants for editing:', formattedVariants);

      } else {
        // No variants from API
        setIncludeVariants(false);
        setVariants([]);
        setVariantAttributes([]);
      }
      // --- END NEW --- 
      
      // Open the modal
      setIsModalOpen(true);
      
    } catch (error) {
      console.error('Error fetching product details for editing:', error);
      setError('Failed to load product details for editing. Please try again.');
      // Ensure modal doesn't open on error
      setIsModalOpen(false); 
      setIsEditing(false); // Also reset isEditing on error
    }
  }, [API_URL, resetForm]); // Added resetForm to dependency array

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
    // Initialize new variant with keys based on currently defined attributes
    const initialAttributes = variantAttributes.reduce((acc, attr) => {
        acc[attr] = ''; // Start with empty string for each defined attribute
        return acc;
    }, {});

    const newVariant = {
      price: '',
      stock: '',
      image: null,
      preview: null,
      attributes: initialAttributes // Use generated initial attributes
    };
    
    setVariants([...variants, newVariant]);
  };

  const handleRemoveVariant = (index) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const handleVariantChange = (index, field, value) => {
    const updatedVariants = [...variants];
    const currentVariant = updatedVariants[index];

    // Check if the field is a standard one or a dynamic attribute
    if (field === 'price' || field === 'stock') {
      // Handle standard fields (convert to number if appropriate)
      currentVariant[field] = (field === 'price' || field === 'stock') ? (value === '' ? '' : Number(value)) : value;
    } else {
      // Assume it's a dynamic attribute
      currentVariant.attributes = {
        ...currentVariant.attributes,
        [field]: value // Use field name as the key in the attributes object
      };
    }

    setVariants(updatedVariants);
  };

  const handleVariantImageChange = (index, e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Create a preview URL for display
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
      
      // Validate required fields
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
      
      // Validate that category_id is a valid integer
      if (isNaN(parseInt(currentProduct.category_id))) {
        setError('Invalid category selection.');
        setIsSubmitting(false);
        return;
      }
      
      // Create FormData to handle file uploads
      const formData = new FormData();
      
      // Append basic product data
      formData.append('name', currentProduct.name);
      formData.append('description', currentProduct.description);
      formData.append('price', currentProduct.price);
      formData.append('stock', currentProduct.stock);
      formData.append('category_id', currentProduct.category_id);
      // REMOVED weight, height, width, length - handle via attributes if needed
      // formData.append('weight', currentProduct.weight || 0);
      // formData.append('height', currentProduct.height || 0);
      // formData.append('width', currentProduct.width || 0);
      // formData.append('length', currentProduct.length || 0);
      formData.append('is_featured', currentProduct.is_featured || false);
      
      // Handle product images
      if (Array.isArray(newProductImages) && newProductImages.length > 0) {
        newProductImages.forEach(image => {
          if (image instanceof File) {
            formData.append('productImages', image);
          }
        });
      }
      
      // Handle variants with dynamic attributes and image handling
      if (variants.length > 0) {
        formData.append('include_variants', 'true');
        
        const timestamp = Date.now(); 
        const randomString = Math.random().toString(36).substring(2, 6);
        
        // --- MODIFIED: Map variants to include attributes object --- 
        const variantsToSend = variants.map((variant, index) => {
          const variantNumber = index + 1;
          // Generate SKU (ensure product_code exists or fallback)
          const baseCode = currentProduct.product_code || `TEMP-${timestamp}`;
          const sku = `${baseCode}-${variantNumber}-${randomString}`;
            
          // Return the structure expected by the backend
          return {
            price: variant.price || 0, // Ensure price has a default
            stock: variant.stock || 0, // Ensure stock has a default
            sku,
            attributes: variant.attributes || {}, // Send the dynamic attributes object
            has_image: !!variant.image // Flag if a new image file is present
          };
        });
        
        formData.append('variants', JSON.stringify(variantsToSend)); // Send the structured data
        // --- END MODIFICATION --- 
        
        // Append each variant image file separately (logic remains the same)
        variants.forEach((variant) => {
          if (variant.image && variant.image instanceof File) {
            formData.append('variantImages', variant.image);
          }
        });
      }
      
      // Determine endpoint (create or update)
      const endpoint = isEditing 
        ? `${API_URL}/api/products/${currentProduct.product_id}`
        : `${API_URL}/api/products`;
      
      const method = isEditing ? 'PUT' : 'POST';
      
      // Send request
      const response = await fetch(endpoint, {
        method,
        body: formData
      });
      
      // Check if response is ok
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save product');
      }
      
      const responseData = await response.json();
      
      // Show success message
      setSuccessMessage(isEditing ? 'Product updated successfully!' : 'Product created successfully!');
      
      // Close modal and reset form after delay
      setTimeout(() => {
        setIsModalOpen(false);

        // Refresh product list
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
    
    // Handle price ranges
    if (typeof price === 'string' && price.includes('-')) {
      const [min, max] = price.split('-').map(p => Number(p));
      const discountedMin = (min - (min * discount / 100)).toFixed(2);
      const discountedMax = (max - (max * discount / 100)).toFixed(2);
      return `${discountedMin}-${discountedMax}`;
    }
    
    // Handle single price
    return (Number(price) - (Number(price) * discount / 100)).toFixed(2);
  }, []);

  const getCategoryPlaceholder = useCallback((category) => {
    // Define base URL for static assets
    const baseUrl = 'http://localhost:5000/images';
    
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

  // --- NEW: Handler to Add a Variant Attribute Definition ---
  const handleAddAttribute = () => {
    const trimmedName = newAttributeName.trim();
    // Prevent adding empty or duplicate attributes
    if (trimmedName && !variantAttributes.includes(trimmedName)) {
      setVariantAttributes([...variantAttributes, trimmedName]);
      // Also update existing variants to include this new attribute key
      setVariants(prevVariants => prevVariants.map(v => ({
        ...v,
        attributes: { ...v.attributes, [trimmedName]: '' } // Initialize with empty string
      })));
    }
    setNewAttributeName(''); // Clear input field
  };

  // --- NEW: Handler to Remove a Variant Attribute Definition ---
  const handleRemoveAttribute = (attributeToRemove) => {
    setVariantAttributes(variantAttributes.filter(attr => attr !== attributeToRemove));
    // Also remove the attribute key from all existing variants
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
              
              {/* --- MODIFIED/NEW: Variant Attribute Definition Section --- */}
              {includeVariants && (
                <div className="attribute-definition-section full-width">
                  <h5>Define Variant Attributes</h5>
                  <p className="text-muted small">Define the properties that differ between variants (e.g., Size, Color, Material).</p>
                  
                  {/* Display existing attributes with remove buttons */}
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

                  {/* Input to add new attribute */}                  
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
              {/* --- END Attribute Definition Section --- */}
              
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
                  accept="image/*"
                  multiple
                />
                <small>
                  {includeVariants 
                   ? 'You can upload product images here or use variant-specific images.' 
                   : 'Upload new images. Existing images will be kept unless deleted below.'}
                </small>
              </div>
              
              {isEditing && currentProduct.images && currentProduct.images.length > 0 && (
                <div className="existing-images-section full-width">
                  <p>Current Images:</p>
                  <div className="existing-images-grid">
                    {currentProduct.images.map((img) => {
                      // Smarter URL construction
                      let imageUrl = img.url;
                      if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('/')) {
                        // If it's just a path like 'uploads/products/...', prepend API_URL
                        imageUrl = `${API_URL}/${imageUrl}`;
                      } else if (imageUrl && imageUrl.startsWith('/')){
                        // If it starts with '/', just prepend the origin part of API_URL
                        const origin = new URL(API_URL).origin;
                        imageUrl = `${origin}${imageUrl}`;
                      }
                      // If it starts with 'http', use it as is.
                      // If img.url is null/empty, handle potential errors
                      
                      return (
                        <div key={img.image_id || img.id} className="existing-image-item">
                          <img
                            src={imageUrl || '/placeholder-product.jpg'} // Fallback placeholder
                            alt={img.alt || 'Product image'}
                            className="existing-image-thumbnail"
                            onError={(e) => { e.target.onerror = null; e.target.src='/placeholder-product.jpg'}}
                          />
                          <button
                            type="button"
                            className="btn btn-delete btn-delete-image"
                            onClick={() => handleDeleteImage(img.image_id || img.id)} // Use image_id or id
                            title="Delete this image"
                          >
                            &times;
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* --- MODIFIED: Variant Input Section --- */}
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
                      
                      {/* Dynamically render inputs for defined attributes */}                      
                      <div className="row">
                        {variantAttributes.map(attrName => (
                          <div key={`${index}-${attrName}`} className="col-md-6">
                            <div className="mb-3">
                              <label htmlFor={`variant-${index}-${attrName}`} className="form-label">{attrName}</label>
                              <input
                                type="text"
                                className="form-control"
                                id={`variant-${index}-${attrName}`}
                                value={variant.attributes[attrName] || ''} // Access nested attribute value
                                onChange={(e) => handleVariantChange(index, attrName, e.target.value)} // Pass attrName as field
                                placeholder={`Enter ${attrName}`}
                              />
                            </div>
                          </div>
                        ))}
                      </div> 
                      
                      {/* Price and Stock for the variant */}                      
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
                                required // Price per variant is required
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
                      
                      {/* Variant Image */}                      
                      <div className="mb-3">
                        <label htmlFor={`variant-image-${index}`} className="form-label">Variant Image (Optional)</label>
                        <input
                          type="file"
                          className="form-control"
                          id={`variant-image-${index}`}
                          onChange={(e) => handleVariantImageChange(index, e)}
                          accept="image/*"
                        />
                        {/* Show preview image if available */}
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
                  
                  {/* Add Variant Button - Disable if no attributes are defined */}                  
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
              {/* --- END Variant Input Section --- */}
              
              {/* Form Buttons */}
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