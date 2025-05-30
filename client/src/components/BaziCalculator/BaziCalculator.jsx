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

  return (
    <>
      <NavBar />
      <div className="bazi-calculator-container">
        <div className="bazi-header">
          <h1>Mini BaZi Calculator</h1>
          <p className="bazi-description">
            Discover your BaZi (Four Pillars of Destiny) chart. This ancient Chinese divination method 
            reveals your personality traits, strengths, and life path based on your birth date and time.
          </p>
        </div>
        
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
        
        <div className="bazi-info">
          <h2>About BaZi Reading</h2>
          <div className="info-grid">
            <div className="info-card">
              <h3>Four Pillars</h3>
              <p>Year, Month, Day, and Hour pillars represent different aspects of your life and personality.</p>
            </div>
            <div className="info-card">
              <h3>Five Elements</h3>
              <p>Wood, Fire, Earth, Metal, and Water elements show your natural strengths and weaknesses.</p>
            </div>
            <div className="info-card">
              <h3>Luck Periods</h3>
              <p>10-year cycles that influence different phases of your life journey.</p>
            </div>
            <div className="info-card">
              <h3>Element Balance</h3>
              <p>Understanding your element balance helps in making better life decisions.</p>
            </div>
          </div>
        </div>
      </div>
      <Footer forceShow={false} />
    </>
  );
};

export default BaziCalculator; 