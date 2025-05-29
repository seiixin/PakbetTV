import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getFullImageUrl } from '../utils/imageUtils';
import { getCart, setCart, removeCart, getAuthToken } from '../utils/cookies';
import axios from 'axios';

const createOrder = async (userId, { address, payment_method }) => {
  try {
    const selectedItems = cartItems.filter(item => item.selected);
    if (selectedItems.length === 0) {
      throw new Error('No items selected for order');
    }

    const orderData = {
      user_id: userId,
      items: selectedItems,
      total_amount: getTotalPrice(),
      address,
      payment_method
    };

    const token = getAuthToken(); // Get token from cookies instead of localStorage
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.post('/api/orders', orderData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    // Clear selected items from cart after successful order creation
    setCartItems(prevItems => prevItems.filter(item => !item.selected));
    
    return response.data;
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
}; 