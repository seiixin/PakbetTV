import Cookies from 'js-cookie';

const COOKIE_OPTIONS = {
  expires: 7, // 7 days
  secure: true, // Only sent over HTTPS
  sameSite: 'strict' // Protect against CSRF
};

export const setCookie = (name, value) => {
  Cookies.set(name, value, COOKIE_OPTIONS);
};

export const getCookie = (name) => {
  return Cookies.get(name);
};

export const removeCookie = (name) => {
  Cookies.remove(name);
};

// Helper functions for common operations
export const setAuthToken = (token) => {
  setCookie('token', token);
};

export const getAuthToken = () => {
  return getCookie('token');
};

export const removeAuthToken = () => {
  removeCookie('token');
};

export const setUser = (user) => {
  setCookie('user', JSON.stringify(user));
};

export const getUser = () => {
  const userStr = getCookie('user');
  try {
    return userStr ? JSON.parse(userStr) : null;
  } catch (e) {
    console.error('Error parsing user cookie:', e);
    return null;
  }
};

export const removeUser = () => {
  removeCookie('user');
};

export const setCart = (cart, userId = 'guest') => {
  setCookie(`cart_${userId}`, JSON.stringify(cart));
};

export const getCart = (userId = 'guest') => {
  const cartStr = getCookie(`cart_${userId}`);
  try {
    return cartStr ? JSON.parse(cartStr) : [];
  } catch (e) {
    console.error('Error parsing cart cookie:', e);
    return [];
  }
};

export const removeCart = (userId = 'guest') => {
  removeCookie(`cart_${userId}`);
}; 