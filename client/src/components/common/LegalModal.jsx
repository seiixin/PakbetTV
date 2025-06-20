import React from 'react';
import './LegalModal.css';

const LegalModal = ({ 
  isOpen, 
  onClose, 
  type = 'terms' // 'terms' or 'refund'
}) => {
  if (!isOpen) return null;

  const termsContent = (
    <div className="legal-content">
      <h2>Terms and Conditions</h2>
      <p className="effective-date">Effective Date: January 01, 2025</p>
      
      <section className="legal-section">
        <h3>1. Acceptance of Terms</h3>
        <p>
          By accessing and using the Feng Shui by PakBet TV website and services, you accept and agree to be bound by the terms and provision of this agreement.
        </p>
      </section>

      <section className="legal-section">
        <h3>2. Use License</h3>
        <p>
          Permission is granted to temporarily download one copy of the materials on Feng Shui by PakBet TV's website for personal, non-commercial transitory viewing only.
        </p>
        <ul>
          <li>This is the grant of a license, not a transfer of title</li>
          <li>Under this license you may not modify or copy the materials</li>
          <li>Use the materials for any commercial purpose or for any public display</li>
          <li>Attempt to reverse engineer any software contained on the website</li>
        </ul>
      </section>

      <section className="legal-section">
        <h3>3. Product Information</h3>
        <p>
          All products are subject to availability. We reserve the right to discontinue any product at any time. 
          Product images are for illustration purposes only and may not be exactly as shown.
        </p>
      </section>

      <section className="legal-section">
        <h3>4. Orders and Payment</h3>
        <p>
          All orders are subject to acceptance and availability. Payment must be made in full before items are shipped. 
          We accept payments through our secure payment partner DragonPay.
        </p>
      </section>

      <section className="legal-section">
        <h3>5. Shipping and Delivery</h3>
        <p>
          Delivery times are estimates only and may vary. We are not responsible for delays caused by shipping carriers or circumstances beyond our control.
        </p>
      </section>

      <section className="legal-section">
        <h3>6. Limitation of Liability</h3>
        <p>
          In no event shall Feng Shui by PakBet TV or its suppliers be liable for any damages arising out of the use or inability to use the materials on our website.
        </p>
      </section>

      <section className="legal-section">
        <h3>7. Contact Information</h3>
        <p>
          For questions regarding these terms and conditions, please contact us at:
        </p>
        <ul>
          <li>Email: admin@pakbettv.com</li>
          <li>Phone: 0976 120 3535</li>
          <li>Address: Unit 1004 Cityland Shaw Tower, Corner St. Francis, Shaw Blvd. Mandaluyong City, Philippines</li>
        </ul>
      </section>
    </div>
  );

  const refundContent = (
    <div className="legal-content">
      <h2>Refund Policy</h2>
      <p className="effective-date">Effective Date: January 01, 2025</p>
      
      <section className="legal-section">
        <h3>1. Return Window</h3>
        <p>
          We accept returns within 7 days of delivery. Items must be in their original condition, unused, and in original packaging.
        </p>
      </section>

      <section className="legal-section">
        <h3>2. Eligible Items for Return</h3>
        <ul>
          <li>Items in original, unused condition</li>
          <li>Items with original packaging and tags</li>
          <li>Items that are not damaged or altered</li>
        </ul>
      </section>

      <section className="legal-section">
        <h3>3. Non-Returnable Items</h3>
        <ul>
          <li>Personalized or customized items</li>
          <li>Items damaged by misuse or normal wear</li>
          <li>Items without original packaging</li>
          <li>Perishable goods or items with limited shelf life</li>
        </ul>
      </section>

      <section className="legal-section">
        <h3>4. Return Process</h3>
        <p>
          To initiate a return:
        </p>
        <ol>
          <li>Contact our customer service at admin@pakbettv.com within 7 days of delivery</li>
          <li>Provide your order number and reason for return</li>
          <li>Wait for return authorization and instructions</li>
          <li>Package items securely and ship to our return address</li>
        </ol>
      </section>

      <section className="legal-section">
        <h3>5. Refund Processing</h3>
        <p>
          Once we receive and inspect your returned item(s):
        </p>
        <ul>
          <li>Approved refunds will be processed within 5-7 business days</li>
          <li>Refunds will be issued to the original payment method</li>
          <li>Shipping costs are non-refundable unless the return is due to our error</li>
          <li>Customers are responsible for return shipping costs</li>
        </ul>
      </section>

      <section className="legal-section">
        <h3>6. Exchanges</h3>
        <p>
          We offer exchanges for different sizes or colors, subject to availability. 
          Contact us to arrange an exchange following the same process as returns.
        </p>
      </section>

      <section className="legal-section">
        <h3>7. Damaged or Defective Items</h3>
        <p>
          If you receive a damaged or defective item, contact us immediately at admin@pakbettv.com. 
          We will provide a prepaid return label and full refund or replacement at no cost to you.
        </p>
      </section>

      <section className="legal-section">
        <h3>8. Contact for Returns</h3>
        <p>
          For return inquiries, please contact:
        </p>
        <ul>
          <li>Email: admin@pakbettv.com</li>
          <li>Phone: 0976 120 3535</li>
          <li>Address: Unit 1004 Cityland Shaw Tower, Corner St. Francis, Shaw Blvd. Mandaluyong City, Philippines</li>
        </ul>
      </section>
    </div>
  );

  return (
    <div className="legal-modal-overlay" onClick={onClose}>
      <div className="legal-modal" onClick={e => e.stopPropagation()}>
        <div className="legal-modal-header">
          <button className="legal-modal-close" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="legal-modal-body">
          {type === 'terms' ? termsContent : refundContent}
        </div>
        <div className="legal-modal-footer">
          <button className="legal-modal-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default LegalModal; 