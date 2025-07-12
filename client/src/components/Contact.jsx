import React, { useRef, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import NavBar from "./NavBar";
import Footer from "./Footer";
import GoogleMap from "./common/GoogleMap";
import { useAuth } from "../context/AuthContext";
import API_BASE_URL from "../config";
import axios from "axios";
import { authService } from "../services/api";
import "./Contact.css";

const CONTACT_FORM_STORAGE_KEY = 'contactFormData';

const ContactForm = () => {
  const form = useRef();
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const [formData, setFormData] = useState(() => {
    // Initialize from localStorage if available
    const savedData = localStorage.getItem(CONTACT_FORM_STORAGE_KEY);
    return savedData ? JSON.parse(savedData) : {
      name: '',
      email: '',
      phone: '',
      message: '',
      subject: ''
    };
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUserProfile = async () => {
    try {
      console.log('Fetching user profile and shipping data...');
      const [profileResponse, shippingResponse] = await Promise.all([
        authService.getProfile(),
        authService.getShippingAddresses()
      ]);
      
      console.log('Profile Response:', profileResponse.data);
      console.log('Shipping Response:', shippingResponse.data);
      
      const profileData = profileResponse.data;
      const addresses = shippingResponse.data;
      const defaultAddress = addresses && addresses.length > 0 ? 
        (addresses.find(addr => addr.is_default) || addresses[0]) : null;

      console.log('Default Address:', defaultAddress);
      console.log('Profile Phone:', profileData.phone);
      console.log('Address Phone:', defaultAddress?.phone);

      const userInfo = {
        name: profileData.firstName && profileData.lastName ? 
          `${profileData.firstName} ${profileData.lastName}` : 
          profileData.firstName || '',
        email: profileData.email || '',
        phone: defaultAddress?.phone || profileData.phone || '',
        message: location.state?.prefilledMessage || formData.message || '',
        subject: location.state?.subject || formData.subject || ''
      };
      
      console.log('Setting form data with:', userInfo);
      setFormData(userInfo);
      localStorage.setItem(CONTACT_FORM_STORAGE_KEY, JSON.stringify(userInfo));
    } catch (error) {
      console.error('Error fetching user profile:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data
      });
    }
  };

  // Pre-fill form with user data and consultation booking info if available
  useEffect(() => {
    console.log('useEffect triggered with:', {
      isAuthenticated,
      hasUser: !!user,
      userData: user
    });
    
    if (isAuthenticated && user) {
      fetchUserProfile();
    }
  }, [user, isAuthenticated, location.state]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    console.log('Input changed:', { field: name, value });
    const updatedFormData = {
      ...formData,
      [name]: value
    };
    setFormData(updatedFormData);
    localStorage.setItem(CONTACT_FORM_STORAGE_KEY, JSON.stringify(updatedFormData));
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
        
        // Clear form and localStorage after successful submission
        const emptyForm = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          message: '',
          subject: ''
        };
        setFormData(emptyForm);
        localStorage.setItem(CONTACT_FORM_STORAGE_KEY, JSON.stringify(emptyForm));
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
        <div className="contact-content">
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
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    className="form-input"
                  />
                </div>
              </div>

              {/* Subject - Only show if we have a subject */}
              {formData.subject && (
                <div className="form-group">
                  <label htmlFor="subject" className="form-label">
                    Subject
                  </label>
                  <div className="input-wrapper">
                    <input
                      id="subject"
                      name="subject"
                      type="text"
                      value={formData.subject}
                      readOnly
                      className="form-input"
                    />
                  </div>
                </div>
              )}

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

          <div className="contact-map-wrapper">
            <div className="map-container">
              <GoogleMap />
            </div>
            <div className="contact-info">
              <h2>Get in Touch</h2>
              <div className="contact-info-item">
                <strong>Address</strong>
                <p>Pakbet TV - Feng Shui</p>
                <p>Unit 1004 Cityland Shaw Tower Corner St. Francis, Shaw Blvd. Mandaluyong City, Philippines</p>
              </div>
              <div className="contact-info-item">
                <strong>Email</strong>
                <p>hello@michaeldemesa.com</p>
              </div>
              <div className="contact-info-item">
                <strong>Phone</strong>
                <p>0981-194-9999</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer forceShow={false} />
    </>
  );
};

export default ContactForm;
