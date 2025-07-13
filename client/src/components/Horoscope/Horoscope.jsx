import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import NavBar from '../NavBar';
import Footer from '../Footer';
import './Horoscope.css';

const Horoscope = () => {
  const [selectedSign, setSelectedSign] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);
  const [readings, setReadings] = useState({ daily: '', weekly: '', monthly: '' });

  const zodiacSigns = [
    { id: 'rat', name: 'Rat', years: [1924,1936,1948,1960,1972,1984,1996,2008,2020], image: '/Prosper-1.png' },
    { id: 'ox', name: 'Ox', years: [1925,1937,1949,1961,1973,1985,1997,2009,2021], image: '/Prosper-2.png' },
    { id: 'tiger', name: 'Tiger', years: [1926,1938,1950,1962,1974,1986,1998,2010,2022], image: '/Prosper-3.png' },
    { id: 'rabbit', name: 'Rabbit', years: [1927,1939,1951,1963,1975,1987,1999,2011,2023], image: '/Prosper-4.png' },
    { id: 'dragon', name: 'Dragon', years: [1928,1940,1952,1964,1976,1988,2000,2012,2024], image: '/Prosper-5.png' },
    { id: 'snake', name: 'Snake', years: [1929,1941,1953,1965,1977,1989,2001,2013], image: '/Prosper-6.png' },
    { id: 'horse', name: 'Horse', years: [1930,1942,1954,1966,1978,1990,2002,2014], image: '/Prosper-7.png' },
    { id: 'goat', name: 'Goat', years: [1931,1943,1955,1967,1979,1991,2003,2015], image: '/Prosper-8.png' },
    { id: 'monkey', name: 'Monkey', years: [1932,1944,1956,1968,1980,1992,2004,2016], image: '/Prosper-9.png' },
    { id: 'rooster', name: 'Rooster', years: [1933,1945,1957,1969,1981,1993,2005,2017], image: '/Prosper-10.png' },
    { id: 'dog', name: 'Dog', years: [1934,1946,1958,1970,1982,1994,2006,2018], image: '/Prosper-11.png' },
    { id: 'pig', name: 'Pig', years: [1935,1947,1959,1971,1983,1995,2007,2019], image: '/Prosper-12.png' }
  ];

  const handleSignClick = async (signId) => {
    try {
      const res = await fetch(`/api/cms/zodiacs/${signId}`);
      const data = await res.json();

      setReadings({
        daily: data.daily || '',
        weekly: data.weekly || '',
        monthly: data.monthly || ''
      });

      if (data.is_updated && !data.is_read) {
        setShowAnimation(true);
        setTimeout(() => {
          setShowAnimation(false);
          setSelectedSign(signId);
          setShowResults(true);
        }, 4000);
      } else {
        setSelectedSign(signId);
        setShowResults(true);
      }
    } catch (err) {
      console.error('Failed to fetch horoscope', err);
      setSelectedSign(signId);
      setShowResults(true);
    }
  };

  return (
    <div className="horoscope-page">
      <NavBar />

      <section className="blog-hero">
        <div className="blog-hero-text">Daily Chinese Horoscope</div>
        <p>Discover your fortune today with our daily horoscope!</p>
      </section>

      <div className="horoscope-container">
        {!showResults ? (
          <div className="horoscope-selection">
            <div className="selection-method">
              <h3>Select Your Chinese Zodiac Sign</h3>
              <div className="zodiac-grid">
                {zodiacSigns.map(sign => (
                  <div
                    key={sign.id}
                    className="zodiac-item"
                    onClick={() => handleSignClick(sign.id)}
                  >
                    <img src={sign.image} alt={sign.name} className="zodiac-icon" />
                    <p className="zodiac-name">{sign.name}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="horoscope-results">
            <div className="zodiac-profile">
              <img
                src={zodiacSigns.find(z => z.id === selectedSign)?.image || ''}
                alt={selectedSign}
                className="zodiac-result-icon"
              />
              <h3>{zodiacSigns.find(z => z.id === selectedSign)?.name || ''}</h3>
              <p className="years-text">
                Birth Years: {zodiacSigns.find(z => z.id === selectedSign)?.years.join(', ') || ''}
              </p>
              <button
                onClick={() => {
                  setShowResults(false);
                  setSelectedSign('');
                  setReadings({ daily: '', weekly: '', monthly: '' });
                }}
                className="back-btn"
              >
                Choose Different Sign
              </button>
              <Link to={`/prosper-guide/${selectedSign}`} className="prosper-link">
                View Full Prosper Guide
              </Link>
            </div>
            <div className="horoscope-readings">
              <div className="reading-section">
                <h3>Today's Horoscope</h3>
                <div className="reading-content">
                  <p>{readings.daily}</p>
                </div>
              </div>
              <div className="reading-section">
                <h3>Weekly Forecast</h3>
                <div className="reading-content">
                  <p>{readings.weekly}</p>
                </div>
              </div>
              <div className="reading-section">
                <h3>Monthly Outlook</h3>
                <div className="reading-content">
                  <p>{readings.monthly}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showAnimation && (
        <div className="fullscreen-animation">
          <video
            src="/treasureChestAnimation.mp4"
            autoPlay
            muted
            playsInline
          />
        </div>
      )}

      <Footer forceShow={false} />
    </div>
  );
};

export default Horoscope;
