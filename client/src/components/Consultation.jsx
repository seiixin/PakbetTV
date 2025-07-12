import React, { useRef, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from "sweetalert2";
import NavBar from './NavBar';
import Footer from './Footer';
import { useAuth } from "../context/AuthContext";
import API_BASE_URL from "../config";
import axios from "axios";
import { authService } from "../services/api";
import './Consultation.css';

export const Consultation = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const form = useRef();
  const [showModal, setShowModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    address: '',
    phone: '',
    message: '',
    subject: ''
  });

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
        address: defaultAddress
          ? [
              defaultAddress.address1,
              defaultAddress.address2,
              defaultAddress.city_municipality || defaultAddress.city,
              defaultAddress.province,
              defaultAddress.postcode,
              defaultAddress.country === 'PH' ? 'Philippines' : 
              defaultAddress.country === 'SG' ? 'Singapore' : 
              defaultAddress.country === 'US' ? 'United States' : 
              defaultAddress.country === 'CA' ? 'Canada' :
              defaultAddress.country === 'GB' ? 'United Kingdom' :
              defaultAddress.country === 'AU' ? 'Australia' :
              defaultAddress.country
            ].filter(Boolean).join(', ')
          : ''
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

  const handleBookConsultation = (service) => {
    setSelectedService(service);
    
    // Pre-fill the message with service details
    const message = `Hi, I would like to book a ${service.title} consultation.

Service Details:
- Service: ${service.title}
- Duration: ${service.duration}
- Price: ${service.price}

Please let me know the available schedule. Thank you!`;
    
    setFormData(prev => ({
      ...prev,
      message: message,
      subject: `Book ${service.title} Consultation`
    }));
    
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setHasChanges(true);
  };

  const handleCloseModal = () => {
    if (hasChanges) {
      Swal.fire({
        title: 'Unsaved Changes',
        text: 'You have unsaved changes. Are you sure you want to close?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#8B0000',
        cancelButtonColor: '#6B7280',
        confirmButtonText: 'Close',
        cancelButtonText: 'Stay'
      }).then((result) => {
        if (result.isConfirmed) {
          setShowModal(false);
          setSelectedService(null);
          setHasChanges(false);
        }
      });
    } else {
      setShowModal(false);
      setSelectedService(null);
    }
  };

  const sendConsultationRequest = async (e) => {
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
          title: "Consultation Request Sent!",
          text: "We've received your consultation request. We'll get back to you soon with available schedules.",
          confirmButtonColor: "#8B0000",
        });
        
        setShowModal(false);
        setSelectedService(null);
        
        // Clear form but keep user info
        setFormData(prev => ({
          ...prev,
          message: '',
          subject: ''
        }));
      }
    } catch (error) {
      console.error('Consultation request error:', error);
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

  // Temporary consultation services data
  const consultationServices = [
    {
      id: 1,
      title: "FENG SHUI DATE SELECTION",
      description: "Ang Date Selection ay proseso ng pagpili ng pinaka-auspicious na araw batay sa Chinese Almanac, Feng Shui, at birth dates upang matiyak ang tamang timing para sa mga mahahalagang hakbang sa buhay at mapataas ang tsansa ng tagumpay.",
      price: "₱2,500.00",
      duration: "60 minutes",
      image: "/Consultation-1.jpg"
    },
    {
      id: 2,
      title: "Home Feng Shui Consultation",
      description: "Napapaisip ka ba, Ka-PakBet, kung bakit parang laging may tensyon o kulang sa swerte sa bahay mo? Baka kailangan mo na ng House Feng Shui Audit mula kay Master Michael De Mesa para maibalik ang maayos na energy flow at mapasok ulit ang blessings sa buhay mo.",
      price: "₱5,000.00",
      duration: "120 minutes",
      image: "/Consultation-2.jpg"
    },
    {
      id: 3,
      title: "Bazi Reading Consultation",
      description: "Ka-Pakbet, kung napapatanong ka kung saan ka patungo sa buhay, baka panahon na para ipa-BaZi mo na 'yan at matuklasan ang mas malinaw na direksyon gamit ang iyong kapanganakan chart.",
      price: "₱8,000.00",
      duration: "180 minutes",
      image: "/Consultation-3.jpg"
    },
    {
      id: 4,
      title: "Yearly Residential Feng Shui Analysis",
      description: "Book a Yearly Residential Feng Shui Analysis with Master Michael De Mesa to activate your home's lucky sectors, attract positivity, and boost your family's overall luck and harmony this 2023.",
      price: "₱10,000.00",
      duration: "240 minutes",
      image: "/Consultation-4.jpg"
    }
  ];

  return (
    <div className="consultation-page">
      <NavBar />
      
      {/* Hero Section */}
      <section className="blog-hero" role="banner" tabIndex={0}>
        <div className="blog-hero-text">
          Bring the auspicious into your life today!
        </div>
        <Link to="/shop">
          <button className="blog-hero-button" type="button" tabIndex={0}>
            SHOP NOW
          </button>
        </Link>
      </section>

      {/* Consultation Services Section */}
      <div className="consultation-container">
        <div className="consultation-header">
          <h1>Feng Shui Consultation Services</h1>
          <p>Expert guidance to harmonize your space and enhance your well-being</p>
        </div>

        <div className="consultation-benefits">
          <div className="benefit-item">
            <i className="fas fa-home"></i>
            <h3>Improve Energy Flow</h3>
            <p>Optimize chi energy throughout your space</p>
          </div>
          <div className="benefit-item">
            <i className="fas fa-heart"></i>
            <h3>Build harmony</h3>
            <p>Create harmony in your personal connections</p>
          </div>
          <div className="benefit-item">
            <i className="fas fa-coins"></i>
            <h3>Boost Prosperity</h3>
            <p>Attract wealth and abundance into your life</p>
          </div>
          <div className="benefit-item">
            <i className="fas fa-balance-scale"></i>
            <h3>Achieve Balance</h3>
            <p>Find equilibrium between work and personal life</p>
          </div>
        </div>

        <div className="consultation-services">
          {consultationServices.map(service => (
            <div className="service-card" key={service.id}>
              <div className="service-image">
                <img src={service.image} alt={service.title} onError={(e) => {e.target.onerror = null; e.target.src = "/placeholder-consultation.jpg"}} />
              </div>
              <div className="service-details">
                <h3>{service.title}</h3>
                <p className="service-description">{service.description}</p>
                <div className="service-meta">
                  <span className="service-duration"><i className="far fa-clock"></i> {service.duration}</span>
                  <span className="service-price">{service.price}</span>
                </div>
                <button 
                  className="book-button"
                  onClick={() => handleBookConsultation(service)}
                >
                  Book Consultation
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="consultation-process">
          <h2>Our Consultation Process</h2>
          <div className="process-steps">
            <div className="process-step">
              <div className="step-number">1</div>
              <h3>Initial Assessment</h3>
              <p>We evaluate your space and understand your specific needs and goals.</p>
            </div>
            <div className="process-step">
              <div className="step-number">2</div>
              <h3>Detailed Analysis</h3>
              <p>Our experts analyze the energy flow and identify areas for improvement.</p>
            </div>
            <div className="process-step">
              <div className="step-number">3</div>
              <h3>Recommendations</h3>
              <p>We provide personalized recommendations and actionable steps.</p>
            </div>
            <div className="process-step">
              <div className="step-number">4</div>
              <h3>Implementation</h3>
              <p>Guidance on implementing changes to transform your space.</p>
            </div>
          </div>
        </div>

        <div className="consultation-cta">
          <h2>Ready to transform your space?</h2>
          <p>Schedule a consultation with our Feng Shui experts today</p>
          <Link to="/contact" className="cta-button">Contact Us Now</Link>
        </div>
      </div>

      {/* Consultation Booking Modal */}
      {showModal && (
        <div className="consultation-modal-overlay" onClick={handleCloseModal}>
          <div className="consultation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="consultation-modal-header">
              <h2>Book Consultation</h2>
              <button className="consultation-modal-close" onClick={handleCloseModal}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="consultation-modal-content">
              {selectedService && (
                <div className="consultation-selected-service-info">
                  <h3>{selectedService.title}</h3>
                  <div className="consultation-service-details-modal">
                    <span><i className="far fa-clock"></i> {selectedService.duration}</span>
                    <span><i className="fas fa-tag"></i> {selectedService.price}</span>
                  </div>
                </div>
              )}

              <form ref={form} onSubmit={sendConsultationRequest} className="consultation-booking-form" noValidate>
                {/* Name */}
                <div className="consultation-form-group">
                  <label htmlFor="consultation-name" className="consultation-form-label">
                    Name *
                  </label>
                  <div className="consultation-input-wrapper">
                    <input
                      id="consultation-name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="consultation-form-input"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="consultation-form-group">
                  <label htmlFor="consultation-email" className="consultation-form-label">
                    Email *
                  </label>
                  <div className="consultation-input-wrapper">
                    <input
                      id="consultation-email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="consultation-form-input"
                    />
                  </div>
                </div>

                {/* Address */}
                <div className="consultation-form-group">
                  <label htmlFor="consultation-address" className="consultation-form-label">
                    Address *
                  </label>
                  <div className="consultation-input-wrapper">
                    <textarea
                      id="consultation-address"
                      name="address"
                      rows="3"
                      value={formData.address}
                      onChange={handleInputChange}
                      required
                      className="consultation-form-textarea"
                    ></textarea>
                  </div>
                </div>

                {/* Phone */}
                <div className="consultation-form-group">
                  <label htmlFor="consultation-phone" className="consultation-form-label">
                    Contact Number *
                  </label>
                  <div className="consultation-input-wrapper">
                    <input
                      id="consultation-phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                      className="consultation-form-input"
                    />
                  </div>
                </div>

                {/* Message */}
                <div className="consultation-form-group">
                  <label htmlFor="consultation-message" className="consultation-form-label">
                    Message *
                  </label>
                  <div className="consultation-input-wrapper">
                    <textarea
                      id="consultation-message"
                      name="message"
                      rows="5"
                      value={formData.message}
                      onChange={handleInputChange}
                      required
                      className="consultation-form-textarea"
                    ></textarea>
                  </div>
                </div>

                {/* Submit */}
                <div className="consultation-submit-wrapper">
                  <button type="submit" className="consultation-submit-button" disabled={isSubmitting}>
                    {isSubmitting ? 'Sending...' : 'Send Consultation Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
      <Footer forceShow={false} />
    </div>
  );
};

export default Consultation;