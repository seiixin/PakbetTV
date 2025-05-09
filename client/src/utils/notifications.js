import { toast } from 'react-toastify';

const defaultConfig = {
  position: "top-right",
  autoClose: 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
};

export const notify = {
  success: (message) => {
    toast.success(message, {
      ...defaultConfig,
      icon: "🎉"
    });
  },
  error: (message) => {
    toast.error(message, {
      ...defaultConfig,
      icon: "❌",
      autoClose: 4000
    });
  },
  warning: (message) => {
    toast.warning(message, {
      ...defaultConfig,
      icon: "⚠️"
    });
  },
  info: (message) => {
    toast.info(message, {
      ...defaultConfig,
      icon: "ℹ️"
    });
  }
};

// Helper function to handle API errors
export const handleApiError = (error) => {
  console.error('API Error:', error);
  
  if (error.response) {
    // Server responded with error
    const message = error.response.data?.message || 'An error occurred. Please try again.';
    notify.error(message);
  } else if (error.request) {
    // Request made but no response
    notify.error('Unable to connect to the server. Please check your internet connection.');
  } else {
    // Other errors
    notify.error('An unexpected error occurred. Please try again.');
  }
}; 