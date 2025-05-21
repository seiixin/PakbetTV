import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getFullImageUrl } from '../utils/imageUtils';
import { getCart, setCart, removeCart } from '../utils/cookies';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState([]);

  // Load cart from cookies whenever user changes
  useEffect(() => {
    const loadCart = () => {
      try {
        // Use a storage key based on user ID if logged in, or 'guest' if not
        const storageKey = user?.id ? `cart_${user.id}` : 'cart_guest';
        console.log('Loading cart from cookies:', storageKey);
        
        const savedCart = getCart(user?.id || 'guest');
        if (savedCart && savedCart.length > 0) {
          setCartItems(savedCart);
          console.log('Cart loaded successfully:', savedCart.length, 'items');
        } else {
          setCartItems([]);
          console.log('No saved cart found');
        }
      } catch (error) {
        console.error('Error loading cart from cookies:', error);
        setCartItems([]);
      }
    };
    
    loadCart();
  }, [user]); 

  // Save cart to cookies whenever cartItems or user changes
  useEffect(() => {
    try {
      const userId = user?.id || 'guest';
      console.log('Saving cart to cookies:', userId, cartItems.length, 'items');
      setCart(cartItems, userId);
    } catch (error) {
      console.error('Error saving cart to cookies:', error);
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
      updateQuantity,
      clearCart,
      getTotalPrice,
      getTotalCount,
      toggleItemSelection,
      toggleSelectAll,
      getSelectedCount,
      mergeGuestCartWithUserCart
    }}>
      {children}
    </CartContext.Provider>
  );
}; 