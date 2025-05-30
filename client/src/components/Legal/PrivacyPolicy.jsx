import React from 'react';
import { useLocation } from 'react-router-dom';
import './Legal.css';

export const PrivacyPolicy = () => {
  const location = useLocation();
  const isStandalone = location.pathname === '/privacy-policy';

  const content = (
    <>
      <div className="privacy-policy-header">
        <h1>Privacy Policy for PakBet TV - Feng Shui by Michael De Mesa</h1>
        <p className="effective-date">Effective Date: January 01, 2025</p>
      </div>

      <div className="privacy-policy-sections">
        <section className="privacy-section">
          <h2>1. Introduction</h2>
          <div className="section-content">
            <p>
              Welcome to PakBet TV - Feng Shui by Michael De Mesa. We value your privacy and are committed to protecting your personal information. 
              This Privacy Policy outlines how we collect, use, disclose, and safeguard your information when you visit our website and use our services.
            </p>
          </div>
        </section>

        <section className="privacy-section">
          <h2>2. Information We Collect</h2>
          <div className="section-content">
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
          </div>
        </section>

        <section className="privacy-section">
          <h2>3. How We Use Your Information</h2>
          <div className="section-content">
            <p>We use the information we collect for various purposes, including:</p>
            <ul>
              <li>To provide and maintain our services</li>
              <li>To process your transactions and manage your orders</li>
              <li>To communicate with you, including sending you updates, promotional materials, and customer support</li>
              <li>To improve our website and services based on user feedback and usage patterns</li>
              <li>To comply with legal obligations and protect our rights</li>
            </ul>
          </div>
        </section>

        <section className="privacy-section">
          <h2>4. Data Deletion Requests</h2>
          <div className="section-content">
            <p>
              In compliance with Facebook's policies, users can request the deletion of their personal data. 
              If you wish to delete your account and all associated data, please contact us at{' '}
              <a href="mailto:admin@pakbettv.com">
                admin@pakbettv.com
              </a>. 
              We will process your request in accordance with applicable laws.
            </p>
          </div>
        </section>

        <section className="privacy-section">
          <h2>5. Sharing Your Information</h2>
          <div className="section-content">
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
          </div>
        </section>

        <section className="privacy-section">
          <h2>6. Security of Your Information</h2>
          <div className="section-content">
            <p>
              We take the security of your personal information seriously and implement reasonable measures to protect it. 
              However, no method of transmission over the internet or method of electronic storage is 100% secure. 
              Therefore, we cannot guarantee its absolute security.
            </p>
          </div>
        </section>

        <section className="privacy-section">
          <h2>7. Links to Other Websites</h2>
          <div className="section-content">
            <p>
              Our website may contain links to other sites that are not operated by us. If you click on a third-party link, 
              you will be directed to that third party's site. We strongly advise you to review the Privacy Policy and terms 
              of service of any site you visit.
            </p>
          </div>
        </section>

        <section className="privacy-section">
          <h2>8. Changes to This Privacy Policy</h2>
          <div className="section-content">
            <p>
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy 
              Policy on this page. You are advised to review this Privacy Policy periodically for any changes.
            </p>
          </div>
        </section>

        <section className="privacy-section">
          <h2>9. Contact Us</h2>
          <div className="section-content">
            <p>If you have any questions about this Privacy Policy, please contact us:</p>
            <ul>
              <li>
                Email:{' '}
                <a href="mailto:admin@pakbettv.com">
                  admin@pakbettv.com
                </a>
              </li>
              <li>Address: Unit 1004 Cityland Shaw Tower,Corner St. Francis, Shaw Blvd. Mandaluyong City, Philippines</li>
            </ul>
          </div>
        </section>
      </div>
    </>
  );

  if (isStandalone) {
    return (
      <div className="privacy-policy-container">
        <div className="privacy-policy-content">
          {content}
        </div>
      </div>
    );
  }

  return content;
};

export default PrivacyPolicy; 