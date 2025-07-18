import React, { useEffect, useState } from 'react';
import './PromoModal.css';

const PROMO_MODAL_KEY = 'promoModalLastShown';
const PROMO_MODAL_SHOP_CLICKED = 'promoModalShopClicked';
const PROMO_MODAL_DELAY = 3 * 60 * 60 * 1000; // 3 hours

const DEFAULT_IMAGE = '/Carousel-1.jpg';

const PromoModal = ({
  title = 'Special Offer!',
  message = 'Get an exclusive voucher for your next purchase!',
  ctaText = 'Get Voucher',
  ctaLink = '/shop',
  image = DEFAULT_IMAGE,
  onClose: externalOnClose,
  isLoggedIn = false, // <-- pass this prop from parent
  currentPath = '',   // <-- pass current route path from parent
}) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) return; // Only show if logged in

    const lastShown = localStorage.getItem(PROMO_MODAL_KEY);
    const shopClicked = localStorage.getItem(PROMO_MODAL_SHOP_CLICKED);
    const now = Date.now();

    // Don't show on shop page if user already clicked shop
    if (currentPath.startsWith('/shop') && shopClicked === 'true') return;

    if (!lastShown || now - parseInt(lastShown, 10) > PROMO_MODAL_DELAY) {
      setShow(true);
      localStorage.setItem(PROMO_MODAL_KEY, now.toString());
    }
  }, [isLoggedIn, currentPath]);

  const handleClose = () => {
    setShow(false);
    if (externalOnClose) externalOnClose();
  };

  const handleCtaClick = () => {
    // Mark that user clicked shop
    localStorage.setItem(PROMO_MODAL_SHOP_CLICKED, 'true');
    handleClose();
    // Optionally, navigate to shop if not using <a>
  };

  if (!show) return null;

  return (
    <div className="promo-modal-overlay" onClick={handleClose}>
      <div className="promo-modal" onClick={e => e.stopPropagation()}>
        <div className="promo-modal-image-container">
          <img
            src={image}
            alt="Promo"
            className="promo-modal-image"
            onError={e => { e.target.onerror = null; e.target.src = DEFAULT_IMAGE; }}
          />
          <button
            className="promo-modal-close"
            onClick={handleClose}
            aria-label="Close promo modal"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="promo-modal-content">
          <h2 className="promo-modal-title">{title}</h2>
          <p className="promo-modal-message">{message}</p>
          <a
            href={ctaLink}
            className="promo-modal-cta"
            onClick={handleCtaClick}
          >
            {ctaText}
          </a>
        </div>
      </div>
    </div>
  );
};

export default PromoModal; 