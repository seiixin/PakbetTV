import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth() || {}; // Get user from AuthContext
  
  // Load cart from localStorage on initial render or when user changes
  useEffect(() => {
    const loadCart = () => {
      try {
        // Get cart data based on user status
        const storageKey = user ? `cart_${user.id}` : 'cart_guest';
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
        // Don't remove the cart from localStorage here, it might be valid on next load
      }
    };
    
    loadCart();
  }, [user]); // Reload cart when user changes (login/logout)
  
  // Save cart to localStorage whenever it changes
  useEffect(() => {
    const storageKey = user ? `cart_${user.id}` : 'cart_guest';
    console.log('Saving cart to localStorage:', storageKey, cartItems.length, 'items');
    localStorage.setItem(storageKey, JSON.stringify(cartItems));
  }, [cartItems, user]);
  
  // Add item to cart
  const addToCart = (product, quantity = 1) => {
    setCartItems(prevItems => {
      // Check if item already exists in cart
      const existingItemIndex = prevItems.findIndex(item => item.id === product.id);
      
      if (existingItemIndex >= 0) {
        // Update quantity if item exists
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + quantity,
          selected: true
        };
        return updatedItems;
      } else {
        // Add new item
        return [...prevItems, { ...product, quantity, selected: true }];
      }
    });
  };
  
  // Remove item from cart
  const removeFromCart = (productId) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== productId));
  };
  
  // Update item quantity
  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    setCartItems(prevItems => 
      prevItems.map(item => 
        item.id === productId ? { ...item, quantity } : item
      )
    );
  };
  
  // Toggle item selection
  const toggleItemSelection = (productId) => {
    setCartItems(prevItems => 
      prevItems.map(item => 
        item.id === productId ? { ...item, selected: !item.selected } : item
      )
    );
  };
  
  // Select/deselect all items
  const toggleSelectAll = (selectAll) => {
    setCartItems(prevItems => 
      prevItems.map(item => ({ ...item, selected: selectAll }))
    );
  };
  
  // Clear cart
  const clearCart = () => {
    setCartItems([]);
  };
  
  // Merge guest cart with user cart during login
  const mergeGuestCartWithUserCart = () => {
    if (!user) return; // Only proceed if user is logged in
    
    try {
      // Get the guest cart
      const guestCart = JSON.parse(localStorage.getItem('cart_guest') || '[]');
      
      // If guest cart has items, add them to the user's cart
      if (guestCart.length > 0) {
        // For each item in guest cart, add to user cart
        guestCart.forEach(item => {
          addToCart(item, item.quantity);
        });
        
        // Clear the guest cart
        localStorage.removeItem('cart_guest');
      }
    } catch (error) {
      console.error('Error merging guest cart with user cart:', error);
    }
  };
  
  // Get total price of selected items
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
  
  // Get count of selected items
  const getSelectedCount = () => {
    return cartItems.filter(item => item.selected).length;
  };
  
  // Get total count of items in cart
  const getTotalCount = () => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  };
  
  // Create order from selected items
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
          product_id: item.product_id || item.id, // Use product_id if available, otherwise fall back to id
          quantity: item.quantity,
          price: item.is_flash_deal && item.discount_percentage
            ? (item.price - (item.price * item.discount_percentage / 100))
            : item.price
        }))
      };
      
      const response = await fetch('http://localhost:5000/api/transactions/orders', {
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
      
      // Remove purchased items from cart
      setCartItems(prevItems => prevItems.filter(item => !item.selected));
      
      return result;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  // Process payment
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
      
      const response = await fetch('http://localhost:5000/api/transactions/payment', {
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
  
  const value = {
    cartItems,
    loading,
    addToCart,
    removeFromCart,
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