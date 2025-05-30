import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import NavBar from '../NavBar';
import Footer from '../Footer';
import API_BASE_URL from '../../config';
import './ProsperGuide.css';

const ProsperGuide = () => {
  const { sign } = useParams();
  const [guideData, setGuideData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // The zodiacID in the database has first letter capitalized: 'Rat', 'Ox', etc.
  const formattedSign = sign ? sign.charAt(0).toUpperCase() + sign.slice(1).toLowerCase() : '';

  useEffect(() => {
    if (!formattedSign) {
      setError('Invalid zodiac sign provided.');
      setLoading(false);
      return;
    }

    const fetchGuideData = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log(`Fetching data for sign: ${formattedSign}`);
        
        // This endpoint will only return published guides
        const response = await axios.get(`${API_BASE_URL}/api/cms/zodiacs/${formattedSign}`);
        
        if (response.data) {
          setGuideData(response.data);
          console.log("Data fetched successfully:", response.data);
        } else {
          setError(`Prosper guide not found for ${formattedSign}.`);
          console.log(`No data found for ${formattedSign}`);
        }
      } catch (err) {
        console.error(`Error fetching prosper guide for ${formattedSign}:`, err);
        
        if (err.response) {
          console.log("Error response status:", err.response.status);
          console.log("Error response data:", err.response.data);
          
          if (err.response.status === 404) {
            // The guide might exist but not be published
            setError(`Prosper guide for "${formattedSign}" is not currently published. Please check back later.`);
          } else {
            setError(`Error (${err.response.status}): ${err.response.data?.error || 'Unknown error'}`);
          }
        } else if (err.request) {
          // Request was made but no response received
          setError('Network error. Please check your connection and try again.');
        } else {
          setError(`Error: ${err.message}`);
        }
        
        setGuideData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchGuideData();
  }, [formattedSign]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="prosper-guide">
          <NavBar />
          <div className="loading-container">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p>Loading guide...</p>
          </div>
          <Footer />
        </div>
      );
    }
    if (error) {
      return (
        <div className="error-container">
          <div className="error-message">{error}</div>
          <div className="error-actions">
            <Link to="/" className="error-link">Return to Home</Link>
          </div>
        </div>
      );
    }
    if (!guideData) {
      return <div className="error-message">No guide data available for {formattedSign}.</div>;
    }

    return (
      <div className="prosper-guide-sections">
        <div className="guide-section">
          <h3>Overview</h3>
          <div className="section-content">
            <p>{guideData.overview || 'Not available.'}</p>
          </div>
        </div>
        <div className="guide-section">
          <h3>Career</h3>
          <div className="section-content">
            <p>{guideData.career || 'Not available.'}</p>
          </div>
        </div>
        <div className="guide-section">
          <h3>Health</h3>
          <div className="section-content">
            <p>{guideData.health || 'Not available.'}</p>
          </div>
        </div>
        <div className="guide-section">
          <h3>Love</h3>
          <div className="section-content">
            <p>{guideData.love || 'Not available.'}</p>
          </div>
        </div>
        <div className="guide-section">
          <h3>Wealth</h3>
          <div className="section-content">
            <p>{guideData.wealth || 'Not available.'}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="prosper-guide-page">
      <NavBar />
      <div className="prosper-guide-container">
        <div className="prosper-guide-content">
          <div className="prosper-guide-header">
            <h1>{formattedSign || 'Zodiac Guide'}</h1>
            <h2>PROSPER GUIDE FORECAST</h2>
          </div>
          {renderContent()}
        </div>
      </div>
      <Footer forceShow={false} />
    </div>
  );
};

export default ProsperGuide; 