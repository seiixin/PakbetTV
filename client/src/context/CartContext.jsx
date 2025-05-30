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
  const [cartItems, setCartItems] = useState(() => {
    // Initialize cart items from storage on mount
    try {
      const userId = user?.id || 'guest';
      console.log('[CartContext] Initializing cart for user:', userId);
      const savedCart = getCart(userId);
      console.log('[CartContext] Initial cart data:', savedCart);
      return savedCart || [];
    } catch (error) {
      console.error('[CartContext] Error initializing cart:', error);
      return [];
    }
  });

  // Load cart from storage whenever user changes
  useEffect(() => {
    const loadCart = () => {
      try {
        const userId = user?.id || 'guest';
        console.log('[CartContext] Loading cart for user:', userId);
        const savedCart = getCart(userId);
        console.log('[CartContext] Loaded cart data:', savedCart);
        
        if (Array.isArray(savedCart) && savedCart.length > 0) {
          console.log('[CartContext] Setting cart items:', savedCart.length, 'items');
          setCartItems(savedCart);
        } else {
          console.log('[CartContext] No valid cart data found');
        }
      } catch (error) {
        console.error('[CartContext] Error loading cart:', error);
      }
    };
    
    loadCart();
  }, [user]);

  // Save cart to storage whenever cartItems changes
  useEffect(() => {
    try {
      const userId = user?.id || 'guest';
      console.log('[CartContext] Saving cart for user:', userId, 'Items:', cartItems);
      
      if (Array.isArray(cartItems)) {
        setCart(cartItems, userId);
        console.log('[CartContext] Cart saved successfully');
      } else {
        console.warn('[CartContext] Invalid cart data, not saving:', cartItems);
      }
    } catch (error) {
      console.error('[CartContext] Error saving cart:', error);
    }
  }, [cartItems, user]);

  const addToCart = (product, quantity = 1) => {
    console.log('[CartContext] Adding to cart:', { product, quantity });
    
    // Ensure image URL is properly formatted before adding to cart
    const productWithProperImageUrl = {
      ...product,
      image_url: product.image_url ? getFullImageUrl(product.image_url) : '/placeholder-product.jpg'
    };
    
    setCartItems(prevItems => {
      // Ensure prevItems is always an array
      const currentItems = Array.isArray(prevItems) ? prevItems : [];
      
      const existingItemIndex = currentItems.findIndex(item => {
        if (product.variant_id && item.variant_id) {
          return item.variant_id === product.variant_id;
        }
        return item.id === product.id;
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
        updatedItems = [...currentItems, { ...productWithProperImageUrl, quantity, selected: true }];
      }
      
      console.log('[CartContext] Updated cart items:', updatedItems);
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
      return updatedItems;
    });
  };

  const removeSelectedItems = () => {
    setCartItems(prevItems => prevItems.filter(item => !item.selected));
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
    // Clear from cookies too
    try {
      const userId = user?.id || 'guest';
      removeCart(userId);
    } catch (err) {
      console.error('Failed to clear cart from cookies:', err);
    }
  };

  // Merge guest cart with user cart when logging in
  const mergeGuestCartWithUserCart = () => {
    if (!user?.id) {
      console.log('Cannot merge carts: user not logged in');
      return; 
    }
    
    try {
      const guestCart = getCart('guest');
      console.log(`Merging guest cart (${guestCart.length} items) with user cart (${cartItems.length} items)`);
      
      if (guestCart.length > 0) {
        guestCart.forEach(item => {
          addToCart(item, item.quantity);
        });
        removeCart('guest');
        console.log('Guest cart merged and removed');
      }
    } catch (error) {
      console.error('Error merging guest cart with user cart:', error);
    }
  };

  // Create order function - using the transactions API instead of orders
  const createOrder = async (userId) => {
    try {
      const selectedItems = cartItems.filter(item => item.selected);
      if (selectedItems.length === 0) {
        throw new Error('No items selected for order');
      }

      // Transform cart items for the backend
      const orderItems = selectedItems.map(item => ({
        product_id: item.id || item.product_id,
        variant_id: item.variant_id || null,
        quantity: item.quantity,
        price: item.price,
        variant_attributes: item.variant_attributes || {}
      }));

      const orderData = {
        user_id: userId,
        items: orderItems,
        total_amount: getTotalPrice()
      };

      const token = getAuthToken(); // Get token from cookies
      if (!token) {
        throw new Error('No authentication token found');
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
      throw error;
    }
  };

  // Process payment with DragonPay
  const processPayment = async (orderId, userEmail) => {
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const paymentData = {
        order_id: orderId,
        payment_method: 'dragonpay',
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

      console.log('[CartContext] Payment processing response:', response.data);

      // Clear selected items from cart after successful payment initiation
      setCartItems(prevItems => prevItems.filter(item => !item.selected));
      
      return response.data;
    } catch (error) {
      console.error('[CartContext] Error processing payment:', error);
      throw error;
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

  return (
    <CartContext.Provider value={{
      cartItems,
      addToCart,
      removeFromCart,
      removeSelectedItems,
      updateQuantity,
      clearCart,
      getTotalPrice,
      getTotalCount,
      toggleItemSelection,
      toggleSelectAll,
      getSelectedCount,
      mergeGuestCartWithUserCart,
      createOrder,
      processPayment
    }}>
      {children}
    </CartContext.Provider>
  );
}; 