// client/src/components/ContactUs.jsx
import React from 'react';
import './Contact.css';

const Contact = () => {
  return (
    <div className="contact-container">
      <h2 className="contact-title">Ask Anything! Contact Us</h2>
      <p className="contact-description">
        We aim to provide great customer service. For inquiries, technical support, and price quotation, here are all the ways you can contact us.
      </p>
      <form id="contact-form" className="contact-form" novalidate>
        <div>
          <label htmlFor="name" className="contact-label">Name *</label>
          <input id="name" name="user_name" type="text" placeholder="Enter your name" required className="contact-input" />
        </div>
        <div>
          <label htmlFor="email" className="contact-label">Email *</label>
          <input id="email" name="user_email" type="email" placeholder="Enter your email" required className="contact-input" />
        </div>
        <div>
          <label htmlFor="phone" className="contact-label">Phone *</label>
          <input id="phone" name="user_phone" type="tel" placeholder="Enter your phone number" required className="contact-input" />
        </div>
        <div>
          <label htmlFor="message" className="contact-label">Message *</label>
          <textarea id="message" name="message" rows="6" placeholder="Enter your message" required className="contact-textarea"></textarea>
        </div>
        <div className="flex justify-center">
          <button type="submit" className="contact-submit-button">Submit</button>
        </div>
      </form>
    </div>
  );
};

export default Contact;