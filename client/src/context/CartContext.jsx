import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getFullImageUrl } from '../utils/imageUtils';
import { getCart, setCart, removeCart, getAuthToken } from '../utils/cookies';
import api from '../services/axiosConfig';
import API_BASE_URL from '../config';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load cart data based on user authentication status
  useEffect(() => {
    let isSubscribed = true;
    const loadCart = async () => {
      if (user?.id) {
        // User is logged in - fetch cart from database
        await fetchCartFromDatabase();
        // Only merge guest cart once per session
        const hasMerged = sessionStorage.getItem(`cart_merged_${user.id}`);
        if (!hasMerged) {
          await mergeGuestCartWithUserCart();
          sessionStorage.setItem(`cart_merged_${user.id}`, 'true');
        }
      } else {
        // User is not logged in - load from localStorage
        loadCartFromStorage();
      }
    };

    loadCart();
    return () => {
      isSubscribed = false;
    };
  }, [user]);

  // Add rate limiting for cart operations
  const rateLimitedOperation = (operation) => {
    const now = Date.now();
    const lastOperation = parseInt(sessionStorage.getItem('last_cart_operation') || '0');
    const minDelay = 500; // 500ms minimum delay between operations

    if (now - lastOperation < minDelay) {
      console.log('[CartContext] Operation throttled');
      return false;
    }

    sessionStorage.setItem('last_cart_operation', now.toString());
    return true;
  };

  // Fetch cart from database for authenticated users
  const fetchCartFromDatabase = async () => {
    if (!user?.id) return;
    
    if (!rateLimitedOperation('fetch')) return;
    
    setLoading(true);
    try {
      const response = await api.get('/cart');
      const dbCartItems = response.data.map(item => ({
        cart_id: item.cart_id,
        id: item.product_id,
        product_id: item.product_id,
        variant_id: item.variant_id,
        name: item.product_name,
        product_name: item.product_name,
        price: parseFloat(item.price),
        quantity: item.quantity,
        stock: item.stock,
        image_url: getFullImageUrl(item.image_url),
        size: item.size,
        color: item.color,
        sku: item.sku,
        selected: true // Default to selected
      }));
      
      // Validate cart items
      const validatedItems = dbCartItems.filter(item => {
        return (
          item.product_id && 
          typeof item.quantity === 'number' && 
          item.quantity > 0 &&
          typeof item.price === 'number' && 
          item.price >= 0
        );
      });
      
      console.log('[CartContext] Loaded cart from database:', validatedItems);
      setCartItems(validatedItems);
    } catch (error) {
      console.error('[CartContext] Error fetching cart from database:', error);
      // Fallback to localStorage on error
      loadCartFromStorage();
    } finally {
      setLoading(false);
    }
  };

  // Load cart from localStorage for guest users
  const loadCartFromStorage = () => {
    try {
      const userId = user?.id || 'guest';
      console.log('[CartContext] Loading cart from storage for user:', userId);
      const savedCart = getCart(userId);
      console.log('[CartContext] Loaded cart data from storage:', savedCart);
      
      if (Array.isArray(savedCart) && savedCart.length > 0) {
        setCartItems(savedCart);
      } else {
        setCartItems([]);
      }
    } catch (error) {
      console.error('[CartContext] Error loading cart from storage:', error);
      setCartItems([]);
    }
  };

  // Save cart to storage for guest users
  const saveCartToStorage = (items) => {
    if (user?.id) return; // Don't save to storage if user is logged in
    
    try {
      const userId = 'guest';
      setCart(items, userId);
      console.log('[CartContext] Cart saved to storage for guest user');
    } catch (error) {
      console.error('[CartContext] Error saving cart to storage:', error);
    }
  };

  // Add item to cart with rate limiting and validation
  const addToCart = async (product, quantity = 1) => {
    if (!rateLimitedOperation('add')) {
      return Promise.reject(new Error('Operation throttled'));
    }
    
    // Validate input
    if (!product?.id || typeof quantity !== 'number' || quantity <= 0) {
      console.error('[CartContext] Invalid product or quantity');
      return Promise.reject(new Error('Invalid product or quantity'));
    }

    console.log('[CartContext] Adding to cart:', { product, quantity });
    
    // Ensure image URL is properly formatted
    const productWithProperImageUrl = {
      ...product,
      image_url: product.image_url ? getFullImageUrl(product.image_url) : '/placeholder-product.jpg'
    };
    
    if (user?.id) {
      // User is logged in - sync with database
      try {
        setLoading(true);
        const response = await api.post('/cart', {
          product_id: product.id || product.product_id,
          variant_id: product.variant_id || null,
          quantity: quantity
        });
        
        console.log('[CartContext] Item added to database cart:', response.data);
        
        // Refresh cart from database
        await fetchCartFromDatabase();
        return Promise.resolve(response.data);
      } catch (error) {
        console.error('[CartContext] Error adding item to database cart:', error);
        // Don't fallback to local cart update on stock error
        if (error.response?.status === 400 && error.response?.data?.message === 'Not enough stock available') {
          return Promise.reject(error);
        }
        // Fallback to local cart update for other errors
        updateLocalCart(productWithProperImageUrl, quantity);
        return Promise.resolve();
      } finally {
        setLoading(false);
      }
    } else {
      // Guest user - update local cart
      // Check stock before updating local cart
      if (product.stock < quantity) {
        return Promise.reject(new Error('Not enough stock available'));
      }
      updateLocalCart(productWithProperImageUrl, quantity);
      return Promise.resolve();
    }
  };

  // Update local cart state
  const updateLocalCart = (product, quantity) => {
    setCartItems(prevItems => {
      const currentItems = Array.isArray(prevItems) ? prevItems : [];
      
      const existingItemIndex = currentItems.findIndex(item => {
        if (product.variant_id && item.variant_id) {
          return item.variant_id === product.variant_id;
        }
        return (item.id || item.product_id) === (product.id || product.product_id);
      });
      
      let updatedItems;
      if (existingItemIndex >= 0) {
        updatedItems = [...currentItems];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + quantity,
          selected: true
        };
      } else {
        updatedItems = [...currentItems, { 
          ...product, 
          quantity, 
          selected: true,
          id: product.id || product.product_id,
          product_id: product.id || product.product_id
        }];
      }
      
      // Save to storage for guest users
      if (!user?.id) {
        saveCartToStorage(updatedItems);
      }
      
      console.log('[CartContext] Updated local cart items:', updatedItems);
      return updatedItems;
    });
  };

  // Remove item from cart with database sync
  const removeFromCart = async (productId, variantId = null, cartId = null) => {
    if (user?.id && cartId) {
      // User is logged in - sync with database
      try {
        setLoading(true);
        await api.delete(`/cart/${cartId}`);
        console.log('[CartContext] Item removed from database cart');
        
        // Update local state
        setCartItems(prevItems => 
          prevItems.filter(item => item.cart_id !== cartId)
        );
      } catch (error) {
        console.error('[CartContext] Error removing item from database cart:', error);
        // Fallback to local removal
        removeFromLocalCart(productId, variantId);
      } finally {
        setLoading(false);
      }
    } else {
      // Guest user - update local cart
      removeFromLocalCart(productId, variantId);
    }
  };

  // Remove from local cart
  const removeFromLocalCart = (productId, variantId = null) => {
    setCartItems(prevItems => {
      const updatedItems = prevItems.filter(item => {
        if (variantId && item.variant_id) {
          return item.variant_id !== variantId;
        }
        return (item.id || item.product_id) !== productId;
      });
      
      // Save to storage for guest users
      if (!user?.id) {
        saveCartToStorage(updatedItems);
      }
      
      return updatedItems;
    });
  };

  // Remove selected items
  const removeSelectedItems = async () => {
    const selectedItems = cartItems.filter(item => item.selected);
    
    if (user?.id) {
      // User is logged in - remove from database
      try {
        setLoading(true);
        for (const item of selectedItems) {
          if (item.cart_id) {
            await api.delete(`/cart/${item.cart_id}`);
          }
        }
        
        // Update local state
        setCartItems(prevItems => prevItems.filter(item => !item.selected));
        console.log('[CartContext] Selected items removed from database cart');
      } catch (error) {
        console.error('[CartContext] Error removing selected items from database:', error);
        // Fallback to local removal
        const updatedItems = cartItems.filter(item => !item.selected);
        setCartItems(updatedItems);
        saveCartToStorage(updatedItems);
      } finally {
        setLoading(false);
      }
    } else {
      // Guest user - update local cart
      const updatedItems = cartItems.filter(item => !item.selected);
      setCartItems(updatedItems);
      saveCartToStorage(updatedItems);
    }
  };

  // Update quantity with database sync
  const updateQuantity = async (productId, quantity, variantId = null, cartId = null) => {
    if (quantity <= 0) {
      await removeFromCart(productId, variantId, cartId);
      return;
    }
    
    if (user?.id && cartId) {
      // User is logged in - sync with database
      try {
        setLoading(true);
        await api.put(`/cart/${cartId}`, { quantity });
        
        // Update local state
        setCartItems(prevItems => 
          prevItems.map(item => 
            item.cart_id === cartId ? { ...item, quantity } : item
          )
        );
        console.log('[CartContext] Quantity updated in database cart');
      } catch (error) {
        console.error('[CartContext] Error updating quantity in database:', error);
        // Fallback to local update
        updateLocalQuantity(productId, quantity, variantId);
      } finally {
        setLoading(false);
      }
    } else {
      // Guest user - update local cart
      updateLocalQuantity(productId, quantity, variantId);
    }
  };

  // Update local quantity
  const updateLocalQuantity = (productId, quantity, variantId = null) => {
    setCartItems(prevItems => {
      const updatedItems = prevItems.map(item => {
        if (variantId && item.variant_id) {
          return item.variant_id === variantId ? { ...item, quantity } : item;
        }
        return (item.id || item.product_id) === productId ? { ...item, quantity } : item;
      });
      
      // Save to storage for guest users
      if (!user?.id) {
        saveCartToStorage(updatedItems);
      }
      
      return updatedItems;
    });
  };

  // Toggle item selection (local only - no database sync needed)
  const toggleItemSelection = (productId, variantId = null, cartId = null) => {
    setCartItems(prevItems => {
      const updatedItems = prevItems.map(item => {
        if (cartId && item.cart_id === cartId) {
          return { ...item, selected: !item.selected };
        }
        if (variantId && item.variant_id) {
          return item.variant_id === variantId ? { ...item, selected: !item.selected } : item;
        }
        return (item.id || item.product_id) === productId ? { ...item, selected: !item.selected } : item;
      });
      
      // Save to storage for guest users
      if (!user?.id) {
        saveCartToStorage(updatedItems);
      }
      
      return updatedItems;
    });
  };

  // Toggle select all (local only - no database sync needed)
  const toggleSelectAll = (selectAll) => {
    setCartItems(prevItems => {
      const updatedItems = prevItems.map(item => ({ ...item, selected: selectAll }));
      
      // Save to storage for guest users
      if (!user?.id) {
        saveCartToStorage(updatedItems);
      }
      
      return updatedItems;
    });
  };

  // Clear cart with database sync
  const clearCart = async () => {
    if (user?.id) {
      // User is logged in - clear database cart
      try {
        setLoading(true);
        await api.delete('/cart');
        console.log('[CartContext] Database cart cleared');
      } catch (error) {
        console.error('[CartContext] Error clearing database cart:', error);
      } finally {
        setLoading(false);
      }
    } else {
      // Guest user - clear storage
      try {
        removeCart('guest');
      } catch (err) {
        console.error('Failed to clear cart from cookies:', err);
      }
    }
    
    setCartItems([]);
  };

  // Merge guest cart with user cart securely
  const mergeGuestCartWithUserCart = async () => {
    if (!user?.id) return;
    
    try {
      const guestCart = getCart('guest');
      console.log('Merging guest cart', guestCart?.length || 0, 'items) with user cart');
      
      if (!Array.isArray(guestCart) || guestCart.length === 0) {
        return;
      }

      // Validate guest cart items before merging
      const validGuestItems = guestCart.filter(item => {
        return (
          item.id &&
          typeof item.quantity === 'number' &&
          item.quantity > 0 &&
          typeof item.price === 'number' &&
          item.price >= 0
        );
      });

      // Add items to user cart with rate limiting
      for (const item of validGuestItems) {
        if (!rateLimitedOperation('merge')) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        await addToCart(item, item.quantity);
      }

      // Clear guest cart after successful merge
      removeCart('guest');
      console.log('[CartContext] Guest cart merged and cleared');
    } catch (error) {
      console.error('[CartContext] Error merging guest cart:', error);
    }
  };

  // Create order function - using the transactions API instead of orders
  const createOrder = async (userId, shippingFee = 0, shippingDetails = {}, paymentMethod = 'dragonpay') => {
    try {
      const selectedItems = cartItems.filter(item => item.selected);
      if (selectedItems.length === 0) {
        throw new Error('No items selected for order');
      }

      // Validate shipping details
      if (!shippingDetails.address || !shippingDetails.phone) {
        throw new Error('Shipping address and phone number are required');
      }

      // Transform cart items for the backend
      const orderItems = selectedItems.map(item => ({
        product_id: item.id || item.product_id,
        variant_id: item.variant_id || null,
        quantity: item.quantity,
        price: item.price,
        variant_attributes: item.variant_attributes || {}
      }));

      const subtotal = getTotalPrice();
      const totalAmount = subtotal + shippingFee;

      const orderData = {
        user_id: userId,
        items: orderItems,
        subtotal: subtotal,
        shipping_fee: shippingFee,
        total_amount: totalAmount,
        shipping_details: shippingDetails,
        payment_method: paymentMethod
      };

      const token = getAuthToken(); // Get token from cookies
      if (!token) {
        throw new Error('Please log in to place an order');
      }

      console.log('[CartContext] Creating order with data:', orderData);

      const response = await api.post('/transactions/orders', orderData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('[CartContext] Order created successfully:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('[CartContext] Error creating order:', error);
      
      // Handle specific error cases
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        const errorMessage = error.response.data?.message || error.message;
        
        if (errorMessage.includes('stock')) {
          throw new Error('Some items in your cart are no longer available in the requested quantity. Please update your cart.');
        } else if (errorMessage.includes('phone')) {
          throw new Error('Please provide a valid phone number (e.g., +63 912 345 6789 or 09123456789)');
        } else if (errorMessage.includes('shipping details')) {
          throw new Error('Please provide complete shipping details including address and contact information');
        } else {
          throw new Error(errorMessage);
        }
      } else if (error.request) {
        // The request was made but no response was received
        throw new Error('Unable to connect to the server. Please check your internet connection and try again.');
      } else {
        // Something happened in setting up the request
        throw new Error('An error occurred while creating your order. Please try again.');
      }
    }
  };

  // Process payment with selected payment method
  const processPayment = async (orderId, userEmail, paymentMethod = 'dragonpay') => {
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const paymentData = {
        order_id: orderId,
        payment_method: paymentMethod,
        payment_details: {
          email: userEmail
        }
      };

      console.log('[CartContext] Processing payment with data:', paymentData);

      const response = await api.post('/transactions/payment', paymentData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('[CartContext] Payment processed successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('[CartContext] Error processing payment:', error);
      throw error;
    }
  };

  // Calculate total price of selected items
  const getTotalPrice = () => {
    return cartItems
      .filter(item => item.selected)
      .reduce((total, item) => {
        return total + (parseFloat(item.price) * item.quantity);
      }, 0);
  };

  // Get count of selected items
  const getSelectedCount = () => {
    return cartItems.filter(item => item.selected).length;
  };

  // Get total count of all items
  const getTotalCount = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  // Context value with all cart functions and state
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
    mergeGuestCartWithUserCart,
    fetchCartFromDatabase,
    createOrder,
    processPayment,
    getTotalPrice,
    getSelectedCount,
    getTotalCount
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}; 