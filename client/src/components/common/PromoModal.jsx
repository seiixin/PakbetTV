import React, { useEffect, useState } from 'react';
import './PromoModal.css'; // Use the new dedicated CSS file

const PROMO_MODAL_KEY = 'promoModalLastShown';
// const PROMO_MODAL_DELAY = 60 * 60 * 1000; // 1 hour in milliseconds
const PROMO_MODAL_DELAY = 1000; // 1 second in milliseconds

const DEFAULT_IMAGE = '/Carousel-1.jpg'; // Use an existing image from public as a default

const PromoModal = ({
  title = 'Special Offer!',
  message = 'Get an exclusive voucher for your next purchase!',
  ctaText = 'Get Voucher',
  ctaLink = '/shop',
  image = DEFAULT_IMAGE,
  onClose: externalOnClose,
}) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const lastShown = localStorage.getItem(PROMO_MODAL_KEY);
    const now = Date.now();
    if (!lastShown || now - parseInt(lastShown, 10) > PROMO_MODAL_DELAY) {
      setShow(true);
      localStorage.setItem(PROMO_MODAL_KEY, now.toString());
    }
  }, []);

  const handleClose = () => {
    setShow(false);
    if (externalOnClose) externalOnClose();
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
          >
            {ctaText}
          </a>
        </div>
      </div>
    </div>
  );
};

export default PromoModal; 