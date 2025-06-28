import React, { useRef, useState, useEffect } from "react";
import Swal from "sweetalert2";
import NavBar from "./NavBar";
import Footer from "./Footer";
import { useAuth } from "../context/AuthContext";
import API_BASE_URL from "../config";
import axios from "axios";
import "./Contact.css";

const ContactForm = () => {
  const form = useRef();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-fill form with user data if logged in
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName || '',
        email: user.email || ''
      }));
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const sendMessage = async (e) => {
    e.preventDefault();

    if (!form.current.checkValidity()) {
      form.current.reportValidity();
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/email/contact`, formData);
      
      if (response.data.success) {
        Swal.fire({
          icon: "success",
          title: "Message Sent!",
          text: response.data.message,
          confirmButtonColor: "#8B0000",
        });
        
        // Reset form
        setFormData({
          name: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.firstName || '',
          email: user?.email || '',
          phone: '',
          message: ''
        });
      }
    } catch (error) {
      console.error('Contact form error:', error);
      const errorMessage = error.response?.data?.message || "Something went wrong. Please try again later.";
      
      Swal.fire({
        icon: "error",
        title: "Failed to send",
        text: errorMessage,
        confirmButtonColor: "#8B0000",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <NavBar />
      <div className="contact-hero-section">
        <div className="contact-hero-content">
          <h1>Contact Us</h1>
          <p>Get in touch with us for any questions or concerns</p>
        </div>
      </div>

      <div className="contact-container">
        <div className="contact-form-wrapper">
          <form ref={form} onSubmit={sendMessage} className="contact-form" noValidate>
            {/* Name */}
            <div className="form-group">
              <label htmlFor="name" className="form-label">
                Name *
              </label>
              <div className="input-wrapper">
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="form-input"
                />
              </div>
            </div>

            {/* Email */}
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email *
              </label>
              <div className="input-wrapper">
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="form-input"
                />
              </div>
            </div>

            {/* Phone */}
            <div className="form-group">
              <label htmlFor="phone" className="form-label">
                Phone *
              </label>
              <div className="input-wrapper">
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="09123456789"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  className="form-input"
                />
              </div>
            </div>

            {/* Message */}
            <div className="form-group">
              <label htmlFor="message" className="form-label">
                Message *
              </label>
              <div className="input-wrapper">
                <textarea
                  id="message"
                  name="message"
                  rows="5"
                  placeholder="Type your message here..."
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                  className="form-textarea"
                ></textarea>
              </div>
            </div>

            {/* Submit */}
            <div className="submit-wrapper">
              <button type="submit" className="submit-button" disabled={isSubmitting}>
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </form>
        </div>
      </div>
      <Footer forceShow={false} />
    </>
  );
};

export default ContactForm;
