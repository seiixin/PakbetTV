import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';
import API_BASE_URL from '../config';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

// Utility function to ensure consistent image URL handling
const getFullImageUrl = (url) => {
  if (!url) return '/placeholder-product.jpg';
  
  // Handle case where url is an object (e.g., from database BLOB)
  if (typeof url === 'object') {
    if (url.data) {
      // Handle Buffer or Uint8Array data
      if (url.data instanceof Uint8Array || Buffer.isBuffer(url.data)) {
        return `data:${url.type || 'image/jpeg'};base64,${Buffer.from(url.data).toString('base64')}`;
      }
      // Handle base64 string data
      if (typeof url.data === 'string') {
        return `data:${url.type || 'image/jpeg'};base64,${url.data}`;
      }
    }
    console.warn('Invalid image object format:', url);
    return '/placeholder-product.jpg';
  }
  
  // Handle string URLs
  if (typeof url === 'string') {
    // Handle base64 encoded images (longblob from database)
    if (url.startsWith('data:')) {
      return url; // Already a full data URL
    }
    
    // Handle absolute URLs
    if (url.startsWith('http')) {
      return url;
    }
    
    // Handle uploads paths
    if (url.startsWith('/uploads/')) {
      return `${API_BASE_URL}${url}`;
    }
    
    // Handle other relative paths
    if (url.startsWith('/')) {
      return `${API_BASE_URL}${url}`;
    }
    
    // Any other format
    return `${API_BASE_URL}/uploads/${url}`;
  }
  
  console.warn('Invalid image URL type:', typeof url);
  return '/placeholder-product.jpg';
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth() || {}; 

  // Load cart from localStorage whenever user changes
  useEffect(() => {
    const loadCart = () => {
      try {
        // Use a storage key based on user ID if logged in, or 'guest' if not
        const storageKey = user?.id ? `cart_${user.id}` : 'cart_guest';
        console.log('Loading cart from localStorage:', storageKey);
        
        const savedCart = localStorage.getItem(storageKey);
        if (savedCart) {
          const parsedCart = JSON.parse(savedCart);
          setCartItems(parsedCart);
          console.log('Cart loaded successfully:', parsedCart.length, 'items');
        } else {
          setCartItems([]);
          console.log('No saved cart found');
        }
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
        setCartItems([]);
      }
    };
    
    loadCart();
  }, [user]); 

  // Save cart to localStorage whenever cartItems or user changes
  useEffect(() => {
    try {
      const storageKey = user?.id ? `cart_${user.id}` : 'cart_guest';
      console.log('Saving cart to localStorage:', storageKey, cartItems.length, 'items');
      localStorage.setItem(storageKey, JSON.stringify(cartItems));
      
      // Also save to a common cartItems key for easier access from checkout
      localStorage.setItem('cartItems', JSON.stringify(cartItems));
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
    }
  }, [cartItems, user]);

  const addToCart = (product, quantity = 1) => {
    // Ensure image URL is properly formatted before adding to cart
    const productWithProperImageUrl = {
      ...product,
      image_url: product.image_url ? getFullImageUrl(product.image_url) : '/placeholder-product.jpg'
    };
    
    setCartItems(prevItems => {
      const existingItemIndex = prevItems.findIndex(item => {
        if (product.variant_id && item.variant_id) {
          return item.variant_id === product.variant_id;
        }
        return item.id === product.id;
      });
      
      let updatedItems;
      if (existingItemIndex >= 0) {
        updatedItems = [...prevItems];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + quantity,
          selected: true
        };
      } else {
        updatedItems = [...prevItems, { ...productWithProperImageUrl, quantity, selected: true }];
      }
      
      // Also save to common cartItems key for checkout access
      try {
        localStorage.setItem('cartItems', JSON.stringify(updatedItems));
      } catch (err) {
        console.error('Failed to save cart to localStorage on add:', err);
      }
      
      return updatedItems;
    });
  };

  const removeFromCart = (productId, variantId = null) => {
    setCartItems(prevItems => {
      const updatedItems = prevItems.filter(item => {
        if (variantId && item.variant_id) {
          return item.variant_id !== variantId;
        }
        return item.id !== productId;
      });
      
      // Also save to common cartItems key for checkout access
      try {
        localStorage.setItem('cartItems', JSON.stringify(updatedItems));
      } catch (err) {
        console.error('Failed to save cart to localStorage on remove:', err);
      }
      
      return updatedItems;
    });
  };

  const updateQuantity = (productId, quantity, variantId = null) => {
    if (quantity <= 0) {
      removeFromCart(productId, variantId);
      return;
    }
    
    setCartItems(prevItems => {
      const updatedItems = prevItems.map(item => {
        if (variantId && item.variant_id) {
          return item.variant_id === variantId ? { ...item, quantity } : item;
        }
        return item.id === productId ? { ...item, quantity } : item;
      });
      
      // Also save to common cartItems key for checkout access
      try {
        localStorage.setItem('cartItems', JSON.stringify(updatedItems));
      } catch (err) {
        console.error('Failed to save cart to localStorage on update:', err);
      }
      
      return updatedItems;
    });
  };

  const toggleItemSelection = (productId, variantId = null) => {
    setCartItems(prevItems => 
      prevItems.map(item => {
        if (variantId && item.variant_id) {
          return item.variant_id === variantId ? { ...item, selected: !item.selected } : item;
        }
        return item.id === productId ? { ...item, selected: !item.selected } : item;
      })
    );
  };

  const toggleSelectAll = (selectAll) => {
    setCartItems(prevItems => 
      prevItems.map(item => ({ ...item, selected: selectAll }))
    );
  };

  const clearCart = () => {
    setCartItems([]);
    // Clear from localStorage too
    try {
      localStorage.removeItem('cartItems');
      const storageKey = user?.id ? `cart_${user.id}` : 'cart_guest';
      localStorage.removeItem(storageKey);
    } catch (err) {
      console.error('Failed to clear cart from localStorage:', err);
    }
  };

  // Merge guest cart with user cart when logging in
  const mergeGuestCartWithUserCart = () => {
    if (!user?.id) {
      console.log('Cannot merge carts: user not logged in');
      return; 
    }
    
    try {
      const guestCart = JSON.parse(localStorage.getItem('cart_guest') || '[]');
      console.log(`Merging guest cart (${guestCart.length} items) with user cart (${cartItems.length} items)`);
      
      if (guestCart.length > 0) {
        guestCart.forEach(item => {
          addToCart(item, item.quantity);
        });
        localStorage.removeItem('cart_guest');
        console.log('Guest cart merged and removed');
      }
    } catch (error) {
      console.error('Error merging guest cart with user cart:', error);
    }
  };

  const getTotalPrice = () => {
    return cartItems
      .filter(item => item.selected)
      .reduce((total, item) => {
        const price = item.is_flash_deal && item.discount_percentage
          ? item.price - (item.price * item.discount_percentage / 100)
          : item.price;
        return total + (price * item.quantity);
      }, 0);
  };

  const getSelectedCount = () => {
    return cartItems.filter(item => item.selected).length;
  };

  const getTotalCount = () => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  };

  const createOrder = async (userId) => {
    const selectedItems = cartItems.filter(item => item.selected);
    if (selectedItems.length === 0) {
      throw new Error('No items selected');
    }
    setLoading(true);
    try {
      const orderData = {
        user_id: userId,
        total_amount: getTotalPrice(),
        items: selectedItems.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          price: item.is_flash_deal && item.discount_percentage
            ? (item.price - (item.price * item.discount_percentage / 100))
            : item.price,
          variant_id: item.variant_id || null,
          variant_attributes: item.variant_attributes || null
        }))
      };
      const response = await fetch(`${API_BASE_URL}/api/transactions/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(orderData)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create order');
      }
      const result = await response.json();
      setCartItems(prevItems => prevItems.filter(item => !item.selected));
      return result;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const processPayment = async (orderId, email) => {
    setLoading(true);
    try {
      const paymentData = {
        order_id: orderId,
        payment_method: 'dragonpay',
        payment_details: {
          email: email
        }
      };
      const response = await fetch(`${API_BASE_URL}/api/transactions/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(paymentData)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Payment processing failed');
      }
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error processing payment:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const removeSelectedItems = () => {
    setCartItems(prevItems => prevItems.filter(item => !item.selected));
  };

  const value = {
    cartItems,
    loading,
    addToCart,
    removeFromCart,
    removeSelectedItems,
    updateQuantity,
    toggleItemSelection,
    toggleSelectAll,
    clearCart,
    getTotalPrice,
    getSelectedCount,
    getTotalCount,
    createOrder,
    processPayment,
    mergeGuestCartWithUserCart
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}; 