import api from './axiosConfig';
import API_BASE_URL from '../config';

class NinjaVanService {
  async createDeliveryOrder(orderData) {
    try {
      const response = await api.post('/delivery/ninjavan/create-order', orderData);
      return response.data;
    } catch (error) {
      console.error('Error creating NinjaVan delivery order:', error);
      throw error;
    }
  }

  async getTrackingInfo(trackingId) {
    try {
      const response = await api.get(`/delivery/ninjavan/tracking/${trackingId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching NinjaVan tracking info:', error);
      throw error;
    }
  }

  async generateWaybill(trackingId) {
    try {
      const response = await api.get(`/delivery/ninjavan/waybill/${trackingId}`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error generating NinjaVan waybill:', error);
      throw error;
    }
  }

  async cancelOrder(trackingId) {
    try {
      // Validate tracking ID
      if (!trackingId || typeof trackingId !== 'string' || trackingId.trim().length < 9) {
        throw new Error('Invalid tracking ID. Tracking ID must be at least 9 characters long.');
      }

      const cleanTrackingId = trackingId.trim();
      
      const response = await api.delete(`/delivery/ninjavan/orders/${cleanTrackingId}`);
      
      // Return standardized response
      return {
        success: true,
        message: response.data.message || 'Order cancelled successfully',
        data: response.data.data || response.data,
        trackingId: cleanTrackingId
      };
    } catch (error) {
      console.error('Error cancelling NinjaVan order:', error);
      
      // Handle different types of errors
      if (error.response) {
        // Server responded with an error status
        const { status, data } = error.response;
        
        switch (status) {
          case 400:
            throw new Error(data.details || data.message || 'Order cannot be cancelled. Please check the order status.');
          case 401:
            throw new Error('Authentication required. Please log in again.');
          case 403:
            throw new Error('You do not have permission to cancel this order.');
          case 404:
            throw new Error('Order not found. The tracking number may be incorrect or the order may have already been cancelled.');
          case 502:
            throw new Error('Service temporarily unavailable. Please try again later.');
          default:
            throw new Error(data.details || data.message || 'Failed to cancel order. Please try again or contact support.');
        }
      } else if (error.request) {
        // Network error
        throw new Error('Network error. Please check your connection and try again.');
      } else {
        // Client-side error or validation error
        throw new Error(error.message || 'An unexpected error occurred while cancelling the order.');
      }
    }
  }

  /**
   * Check if an order can be cancelled based on its status
   * @param {string} orderStatus - The current order status
   * @returns {boolean} Whether the order can be cancelled
   */
  canCancelOrder(orderStatus) {
    const cancelableStatuses = ['processing', 'for_packing', 'packed', 'for_shipping', 'pending'];
    return cancelableStatuses.includes(orderStatus?.toLowerCase());
  }

  /**
   * Get a user-friendly cancellation message based on order status
   * @param {string} orderStatus - The current order status
   * @returns {string} User-friendly message
   */
  getCancellationMessage(orderStatus) {
    if (this.canCancelOrder(orderStatus)) {
      return 'This order can be cancelled since it has not been picked up yet.';
    }
    
    const statusMessages = {
      'shipped': 'This order cannot be cancelled as it has already been shipped.',
      'picked_up': 'This order cannot be cancelled as it has been picked up for delivery.',
      'delivered': 'This order cannot be cancelled as it has already been delivered.',
      'completed': 'This order cannot be cancelled as it has been completed.',
      'cancelled': 'This order has already been cancelled.',
      'returned': 'This order has been returned and cannot be cancelled.'
    };
    
    return statusMessages[orderStatus?.toLowerCase()] || 'This order cannot be cancelled at this time.';
  }

  /**
   * Get shipping rate estimate from NinjaVan
   * @param {Object} addressData - Destination address and package details
   * @returns {Object} Shipping rate estimate
   */
  async getShippingEstimate(addressData) {
    try {
      const { address, weight, dimensions } = addressData;
      
      if (!address || !address.postcode || !address.city || !address.state) {
        throw new Error('Missing required address fields for shipping estimate');
      }

      const response = await api.post('/delivery/ninjavan/estimate', {
        ...addressData,
        toAddress: addressData.address
      });

      return response.data;
    } catch (error) {
      console.error('Error getting shipping estimate:', error);
      if (error.response?.status === 401) {
        throw new Error('Authentication required. Please log in again.');
      }
      return {
        success: false,
        error: error.message || 'Failed to get shipping estimate'
      };
    }
  }
}

export default new NinjaVanService(); 