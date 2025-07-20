import React, { useRef, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import NavBar from "./NavBar";
import Footer from "./Footer";
import { useAuth } from "../context/AuthContext";
import API_BASE_URL from "../config";
import axios from "axios";
import { authService } from "../services/api";
import "./Appointment.css";

const AppointmentForm = () => {
  const form = useRef();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: location.state?.prefilledMessage || '',
    subject: location.state?.subject || 'Appointment Request'
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
        phone: defaultAddress?.phone || profileData.phone || ''
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

  const sendAppointmentRequest = async (e) => {
    e.preventDefault();

    if (!form.current.checkValidity()) {
      form.current.reportValidity();
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/email/appointment`, formData);
      
      if (response.data.success) {
        setHasChanges(false);
        Swal.fire({
          icon: "success",
          title: "Appointment Request Sent!",
          text: "We've received your appointment request. We'll get back to you soon with available schedules.",
          confirmButtonColor: "#8B0000",
        });
        
        // Clear form but keep user info
        setFormData(prev => ({
          ...prev,
          message: '',
          subject: 'Appointment Request'
        }));
      }
    } catch (error) {
      console.error('Appointment request error:', error);
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
      <div className="appointment-hero-section">
        <div className="appointment-hero-content">
          <h1>Book Your Consultation</h1>
          <p>Schedule your Feng Shui consultation with Mr. Michael De Mesa</p>
        </div>
      </div>

      <div className="appointment-container">
        <div className="appointment-content">
          <div className="appointment-form-wrapper">
            <form ref={form} onSubmit={sendAppointmentRequest} className="appointment-form" noValidate>
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
                  Contact Number *
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
                    placeholder="Please describe your consultation needs and preferred schedule..."
                  ></textarea>
                </div>
              </div>

              {/* Submit */}
              <div className="submit-wrapper">
                <button type="submit" className="submit-button" disabled={isSubmitting}>
                  {isSubmitting ? 'Sending...' : 'Send Appointment Request'}
                </button>
              </div>
            </form>
          </div>


        </div>
      </div>
      <Footer forceShow={false} onNavigate={handleNavigationAttempt} />
    </>
  );
};

export default AppointmentForm; 