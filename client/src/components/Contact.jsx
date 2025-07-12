import React, { useRef, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import NavBar from "./NavBar";
import Footer from "./Footer";
import GoogleMap from "./common/GoogleMap";
import { useAuth } from "../context/AuthContext";
import API_BASE_URL from "../config";
import axios from "axios";
import { authService } from "../services/api";
import "./Contact.css";

const ContactForm = () => {
  const form = useRef();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: location.state?.prefilledMessage || '',
    subject: location.state?.subject || ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const fetchUserProfile = async () => {
    try {
      const [profileResponse, shippingResponse] = await Promise.all([
        authService.getProfile(),
        authService.getShippingAddresses()
      ]);
      
      const profileData = profileResponse.data;
      const addresses = shippingResponse.data;
      const defaultAddress = addresses && addresses.length > 0 ? 
        (addresses.find(addr => addr.is_default) || addresses[0]) : null;

      setFormData(prev => ({
        ...prev,
        name: profileData.firstName && profileData.lastName ? 
          `${profileData.firstName} ${profileData.lastName}` : 
          profileData.firstName || '',
        email: profileData.email || '',
        phone: defaultAddress?.phone || profileData.phone || '',
      }));
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  // Fetch user profile on mount and when auth state changes
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchUserProfile();
    }
  }, [user, isAuthenticated]);

  // Handle location state changes separately
  useEffect(() => {
    if (location.state?.prefilledMessage || location.state?.subject) {
      setFormData(prev => ({
        ...prev,
        message: location.state.prefilledMessage || prev.message,
        subject: location.state.subject || prev.subject
      }));
    }
  }, [location.state]);

  // Add navigation prompt
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasChanges]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setHasChanges(true);
  };

  const handleNavigationAttempt = (to) => {
    if (hasChanges) {
      Swal.fire({
        title: 'Unsaved Changes',
        text: 'You have unsaved changes. Are you sure you want to leave?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#8B0000',
        cancelButtonColor: '#6B7280',
        confirmButtonText: 'Leave',
        cancelButtonText: 'Stay'
      }).then((result) => {
        if (result.isConfirmed) {
          navigate(to);
        }
      });
      return false;
    }
    return true;
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
        setHasChanges(false);
        Swal.fire({
          icon: "success",
          title: "Message Sent!",
          text: response.data.message,
          confirmButtonColor: "#8B0000",
        });
        
        // Clear form but keep user info
        setFormData(prev => ({
          ...prev,
          message: '',
          subject: ''
        }));
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
      <NavBar onNavigate={handleNavigationAttempt} />
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
      <Footer forceShow={false} onNavigate={handleNavigationAttempt} />
    </>
  );
};

export default ContactForm;
