import React, { useEffect, useRef } from 'react';
import NavBar from '../NavBar';
import Footer from '../Footer';
import './BaziCalculator.css';

const BaziCalculator = () => {
  const calculatorRef = useRef(null);

  useEffect(() => {
    // Load the calculator HTML content into the component
    if (calculatorRef.current) {
      // Since we're using React, we'll embed the calculator content directly
      // This is safer than using dangerouslySetInnerHTML for the entire content
    }
  }, []);

  // Hero Component
  const Hero = () => {
    return (
      <section className="blog-hero" role="banner" tabIndex="0">
        <div className="blog-hero-text">
          Mini BaZi Calculator
        </div>
        <p>Discover your Four Pillars of Destiny and unlock the secrets of your birth chart!</p>
      </section>
    );
  };

  return (
    <>
      <NavBar />
      <Hero />
      <div className="bazi-calculator-container">
        
        <div className="calculator-iframe-container">
          <iframe 
            src="/MiniBaziCalculator.html"
            title="Mini BaZi Calculator"
            width="100%"
            frameBorder="0"
            loading="lazy"
            allow="fullscreen"
          />
        </div>
      </div>
      <Footer forceShow={false} />
    </>
  );
};

export default BaziCalculator; 