import React from 'react';
import './LegalModal.css';

const LegalModal = ({ 
  isOpen, 
  onClose, 
  type = 'terms' // 'terms', 'refund', or 'privacy'
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
          <li>Phone: 0981-194-9999</li>
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
          <li>Phone: 0981-194-9999</li>
          <li>Address: Unit 1004 Cityland Shaw Tower, Corner St. Francis, Shaw Blvd. Mandaluyong City, Philippines</li>
        </ul>
      </section>
    </div>
  );

  const privacyContent = (
    <div className="legal-content">
      <h2>Privacy Policy for PakBet TV - Feng Shui by Michael De Mesa</h2>
      <p className="effective-date">Effective Date: January 01, 2025</p>
      
      <section className="legal-section">
        <h3>1. Introduction</h3>
        <p>
          Welcome to PakBet TV - Feng Shui by Michael De Mesa. We value your privacy and are committed to protecting your personal information. 
          This Privacy Policy outlines how we collect, use, disclose, and safeguard your information when you visit our website and use our services.
        </p>
      </section>

      <section className="legal-section">
        <h3>2. Information We Collect</h3>
        <p>We may collect the following types of information:</p>
        <ul>
          <li>
            <strong>Personal Information:</strong> When you create an account, we collect personal information such as your name, 
            email address, phone number, and shipping address.
          </li>
          <li>
            <strong>Authentication Data:</strong> If you choose to log in using social media accounts (e.g., Facebook), 
            we may collect information from your social media profile, including your name, email address, and profile picture.
          </li>
          <li>
            <strong>Payment Information:</strong> We do not store your payment information. All payment transactions are 
            processed through secure third-party payment processors.
          </li>
          <li>
            <strong>Usage Data:</strong> We collect information about your interactions with our website, including your 
            IP address, browser type, pages visited, and the time and date of your visits.
          </li>
        </ul>
      </section>

      <section className="legal-section">
        <h3>3. How We Use Your Information</h3>
        <p>We use the information we collect for various purposes, including:</p>
        <ul>
          <li>To provide and maintain our services</li>
          <li>To process your transactions and manage your orders</li>
          <li>To communicate with you, including sending you updates, promotional materials, and customer support</li>
          <li>To improve our website and services based on user feedback and usage patterns</li>
          <li>To comply with legal obligations and protect our rights</li>
        </ul>
      </section>

      <section className="legal-section">
        <h3>4. Data Deletion Requests</h3>
        <p>
          In compliance with Facebook's policies, users can request the deletion of their personal data. 
          If you wish to delete your account and all associated data, please contact us at{' '}
          <a href="mailto:admin@pakbettv.com">admin@pakbettv.com</a>. 
          We will process your request in accordance with applicable laws.
        </p>
      </section>

      <section className="legal-section">
        <h3>5. Sharing Your Information</h3>
        <p>
          We do not sell or rent your personal information to third parties. We may share your information with:
        </p>
        <ul>
          <li>
            <strong>Service Providers:</strong> We may employ third-party companies and individuals to facilitate our services, 
            provide the service on our behalf, or assist us in analyzing how our services are used.
          </li>
          <li>
            <strong>Legal Compliance:</strong> We may disclose your information if required to do so by law or in response 
            to valid requests by public authorities.
          </li>
        </ul>
      </section>

      <section className="legal-section">
        <h3>6. Security of Your Information</h3>
        <p>
          We take the security of your personal information seriously and implement reasonable measures to protect it. 
          However, no method of transmission over the internet or method of electronic storage is 100% secure. 
          Therefore, we cannot guarantee its absolute security.
        </p>
      </section>

      <section className="legal-section">
        <h3>7. Links to Other Websites</h3>
        <p>
          Our website may contain links to other sites that are not operated by us. If you click on a third-party link, 
          you will be directed to that third party's site. We strongly advise you to review the Privacy Policy and terms 
          of service of any site you visit.
        </p>
      </section>

      <section className="legal-section">
        <h3>8. Changes to This Privacy Policy</h3>
        <p>
          We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy 
          Policy on this page. You are advised to review this Privacy Policy periodically for any changes.
        </p>
      </section>

      <section className="legal-section">
        <h3>9. Contact Us</h3>
        <p>If you have any questions about this Privacy Policy, please contact us:</p>
        <ul>
          <li>Email: <a href="mailto:admin@pakbettv.com">admin@pakbettv.com</a></li>
          <li>Phone: 0981-194-9999</li>
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
          {type === 'terms' ? termsContent : type === 'refund' ? refundContent : privacyContent}
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