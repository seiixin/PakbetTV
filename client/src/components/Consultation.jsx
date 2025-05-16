import React from 'react';
import { Link } from 'react-router-dom';
import NavBar from './NavBar';
import Footer from './Footer';
import './Consultation.css';

export const Consultation = () => {
  // Temporary consultation services data
  const consultationServices = [
    {
      id: 1,
      title: "Personal Feng Shui Assessment",
      description: "Get a personalized assessment of your living space and discover how to optimize energy flow for prosperity, health, and happiness.",
      price: "₱2,500.00",
      duration: "60 minutes",
      image: "/consultation-personal.jpg"
    },
    {
      id: 2,
      title: "Home Feng Shui Consultation",
      description: "A comprehensive analysis of your home to identify energy blockages and provide actionable recommendations for improvement.",
      price: "₱5,000.00",
      duration: "90 minutes",
      image: "/consultation-home.jpg"
    },
    {
      id: 3,
      title: "Business Feng Shui Consultation",
      description: "Enhance productivity, employee well-being, and business success through expert feng shui arrangement of your office or business space.",
      price: "₱8,000.00",
      duration: "120 minutes",
      image: "/consultation-business.jpg"
    },
    {
      id: 4,
      title: "Virtual Feng Shui Assessment",
      description: "Remote consultation via video call where our experts will guide you through feng shui principles and offer personalized advice.",
      price: "₱1,800.00",
      duration: "45 minutes",
      image: "/consultation-virtual.jpg"
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
            <h3>Enhance Relationships</h3>
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
                <button className="book-button">Book Consultation</button>
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
          <button className="cta-button">Contact Us Now</button>
        </div>
      </div>
      
      <Footer forceShow={false} />
    </div>
  );
};

export default Consultation;