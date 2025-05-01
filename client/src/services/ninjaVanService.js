import axios from 'axios';
import API_BASE_URL from '../config';

class NinjaVanService {
  async createDeliveryOrder(orderData) {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/delivery/ninjavan/create-order`, orderData);
      return response.data;
    } catch (error) {
      console.error('Error creating NinjaVan delivery order:', error);
      throw error;
    }
  }

  async getTrackingInfo(trackingId) {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/delivery/ninjavan/tracking/${trackingId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching NinjaVan tracking info:', error);
      throw error;
    }
  }

  async generateWaybill(trackingId) {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/delivery/ninjavan/waybill/${trackingId}`, {
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
      const response = await axios.delete(`${API_BASE_URL}/api/delivery/ninjavan/orders/${trackingId}`);
      return response.data;
    } catch (error) {
      console.error('Error cancelling NinjaVan order:', error);
      throw error;
    }
  }
}

export default new NinjaVanService(); 