// Facebook SDK Configuration
export const FACEBOOK_CONFIG = {
  appId: import.meta.env.VITE_FACEBOOK_APP_ID || '',
  cookie: true,
  xfbml: true,
  version: 'v18.0'
};

// Initialize Facebook SDK
export const initializeFacebookSDK = () => {
  return new Promise((resolve, reject) => {
    // Load the SDK asynchronously
    (function(d, s, id) {
      var js, fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) return resolve();
      js = d.createElement(s);
      js.id = id;
      js.src = "https://connect.facebook.net/en_US/sdk.js";
      js.crossOrigin = "anonymous";
      js.async = true;
      js.defer = true;
      js.onload = () => {
        window.fbAsyncInit = function() {
          window.FB.init(FACEBOOK_CONFIG);
          resolve();
        };
      };
      js.onerror = reject;
      fjs.parentNode.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));
  });
}; 