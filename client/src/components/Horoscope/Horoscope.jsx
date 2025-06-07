import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import NavBar from '../NavBar';
import Footer from '../Footer';
import './Horoscope.css';

const Horoscope = () => {
  const [selectedSign, setSelectedSign] = useState('');
  const [birth, setBirth] = useState({ month: '', day: '', year: '' });
  const [showResults, setShowResults] = useState(false);

  // Hero Component (same as blog page)
  const Hero = () => {
    return (
      <section className="blog-hero" role="banner" tabIndex="0">
        <div className="blog-hero-text">
        Daily Chinese Horoscope
        </div>
        <p>Discover your fortune today with our daily horoscope!</p>
      </section>
    );
  };

  const zodiacSigns = [
    { id: 'rat', name: 'Rat', years: [1924, 1936, 1948, 1960, 1972, 1984, 1996, 2008, 2020], image: '/Prosper-1.png' },
    { id: 'ox', name: 'Ox', years: [1925, 1937, 1949, 1961, 1973, 1985, 1997, 2009, 2021], image: '/Prosper-2.png' },
    { id: 'tiger', name: 'Tiger', years: [1926, 1938, 1950, 1962, 1974, 1986, 1998, 2010, 2022], image: '/Prosper-3.png' },
    { id: 'rabbit', name: 'Rabbit', years: [1927, 1939, 1951, 1963, 1975, 1987, 1999, 2011, 2023], image: '/Prosper-4.png' },
    { id: 'dragon', name: 'Dragon', years: [1928, 1940, 1952, 1964, 1976, 1988, 2000, 2012, 2024], image: '/Prosper-5.png' },
    { id: 'snake', name: 'Snake', years: [1929, 1941, 1953, 1965, 1977, 1989, 2001, 2013], image: '/Prosper-6.png' },
    { id: 'horse', name: 'Horse', years: [1930, 1942, 1954, 1966, 1978, 1990, 2002, 2014], image: '/Prosper-7.png' },
    { id: 'goat', name: 'Goat', years: [1931, 1943, 1955, 1967, 1979, 1991, 2003, 2015], image: '/Prosper-8.png' },
    { id: 'monkey', name: 'Monkey', years: [1932, 1944, 1956, 1968, 1980, 1992, 2004, 2016], image: '/Prosper-9.png' },
    { id: 'rooster', name: 'Rooster', years: [1933, 1945, 1957, 1969, 1981, 1993, 2005, 2017], image: '/Prosper-10.png' },
    { id: 'dog', name: 'Dog', years: [1934, 1946, 1958, 1970, 1982, 1994, 2006, 2018], image: '/Prosper-11.png' },
    { id: 'pig', name: 'Pig', years: [1935, 1947, 1959, 1971, 1983, 1995, 2007, 2019], image: '/Prosper-12.png' },
  ];

  // Demo horoscope data
  const horoscopeReadings = {
    daily: {
      rat: "Today brings a wave of creative energy. Trust your intuition and embrace new opportunities. A small financial gain may come your way through unexpected means.",
      ox: "Your persistence will be rewarded today. Take time to listen to those around you, as valuable information might come from an unexpected source.",
      tiger: "Today is ideal for taking initiative. Your natural leadership will shine, bringing positive attention from superiors. Watch your spending, however.",
      rabbit: "A peaceful day awaits you. Focus on nurturing relationships and self-care. Avoid rushing important decisions, especially regarding finances.",
      dragon: "Your confidence will attract opportunities today. Don't be afraid to showcase your talents. A short trip may bring unexpected joy.",
      snake: "Trust your intuition today, especially in professional matters. A thoughtful approach to communication will prevent misunderstandings.",
      horse: "Energy levels are high today. Channel this into productive activities rather than impulsive actions. Financial prospects look favorable.",
      goat: "Seek harmony in your surroundings today. Creative endeavors are especially favored. An old friend may reach out with interesting news.",
      monkey: "Your quick thinking saves the day. Watch for opportunities to showcase your problem-solving skills. Romance may blossom unexpectedly.",
      rooster: "Attention to detail will serve you well today. Take time to organize your space for better energy flow. Financial planning brings peace of mind.",
      dog: "Loyalty will be appreciated today. Stand by your principles, even if challenged. A small investment in your well-being pays dividends.",
      pig: "Generosity brings unexpected returns today. Social gatherings prove beneficial for networking. Listen more than you speak for valuable insights."
    },
    weekly: {
      rat: "This week emphasizes personal growth and financial planning. Wednesday and Thursday are particularly favorable for important meetings. Watch for signs directing you toward a new opportunity that aligns with your long-term goals.",
      ox: "A productive week awaits, especially in career matters. Your methodical approach will be appreciated by colleagues. Take time to nurture personal relationships this weekend, as they may have been neglected recently.",
      tiger: "Excitement marks this week, with unexpected developments midweek. Channel your natural courage toward constructive endeavors. Sunday brings a moment of clarity regarding a personal matter that's been troubling you.",
      rabbit: "Harmony in relationships is highlighted this week. Your diplomatic skills will be needed to navigate a potentially tense situation at work. The weekend offers a chance for meaningful connection with loved ones.",
      dragon: "Leadership opportunities arise this week. Your vision will inspire others, but be mindful of imposing your will too forcefully. Financial prospects improve toward the weekend.",
      snake: "Intuition guides your decisions this week. Trust your inner wisdom, especially regarding business partnerships. A quiet weekend allows for necessary reflection and rejuvenation.",
      horse: "Energy flows abundantly this week. Direct it toward completing long-standing projects rather than starting new ones. Travel plans may need adjustment due to unforeseen circumstances.",
      goat: "Creativity peaks this week. Artistic endeavors are especially favored, bringing both satisfaction and potential recognition. Family matters require attention this weekend.",
      monkey: "Your adaptability will be tested this week. Embrace changes rather than resisting them, as they lead to unexpected opportunities. Watch communication carefully to avoid misunderstandings.",
      rooster: "Organization and planning bring success this week. Your attention to detail helps solve a persistent problem. The weekend favors social gatherings that expand your network.",
      dog: "Stand firm in your principles this week, even if challenged. Loyalty will be rewarded, though perhaps not immediately. Take time for self-care over the weekend to maintain balance.",
      pig: "Generosity marks your week, but ensure you're not overextending yourself. Wednesday through Friday favor financial decisions. The weekend brings joyful social connections."
    },
    monthly: {
      rat: "This month brings opportunities for intellectual growth and career advancement. Financial prospects improve after the 15th. Pay attention to health matters, particularly those related to stress and rest. A long-standing personal issue reaches resolution.",
      ox: "Steady progress in professional endeavors marks this month. Your persistence will be recognized by those in authority. Family matters require attention mid-month. Consider investing in property or home improvements.",
      tiger: "A dynamic month awaits with unexpected opportunities for advancement. Travel is favored, especially for business purposes. Watch your impulsivity in financial matters. Relationships benefit from your increased confidence and charm.",
      rabbit: "Harmony and balance are your themes this month. Diplomatic skills help navigate workplace challenges. Creative pursuits bring satisfaction and possible recognition. Pay attention to subtle signs regarding health matters.",
      dragon: "Leadership opportunities abound this month. Your natural charisma attracts both supporters and opportunities. Financial prospects improve through partnerships. Take time for self-reflection around the full moon.",
      snake: "Strategic thinking brings advantages this month. Trust your intuition, especially regarding business partnerships. A private matter requires discreet handling. Health improves with attention to proper nutrition.",
      horse: "Energy and enthusiasm characterize your month. Channel this positively to avoid restlessness. Travel is favored, especially for pleasure. Financial matters require careful scrutiny around the 20th.",
      goat: "Creativity flows abundantly this month. Artistic endeavors receive positive recognition. Family relationships strengthen through honest communication. Consider investing in your personal development.",
      monkey: "Adaptability serves you well this month. Unexpected changes lead to favorable outcomes. Communication skills bring professional advantages. Watch spending tendencies during the third week.",
      rooster: "Organization and planning bring success this month. Your methodical approach solves a persistent problem. Relationships benefit from straightforward communication. Health improves with consistent routines.",
      dog: "Loyalty and principles guide your month. Standing firm in your values attracts like-minded allies. Financial matters improve gradually. Take time for rest and rejuvenation during the last week.",
      pig: "Generosity and social connections highlight your month. Networking brings unexpected opportunities. Financial prospects improve through collaborative ventures. Pay attention to emotional well-being and maintain healthy boundaries."
    }
  };

  const renderYearOptions = () => {
    const years = [];
    for (let year = 2024; year >= 1940; year--) {
      years.push(<option key={year} value={year}>{year}</option>);
    }
    return years;
  };

  const renderMonthOptions = () => {
    const months = [
      { value: '1', name: 'January' },
      { value: '2', name: 'February' },
      { value: '3', name: 'March' },
      { value: '4', name: 'April' },
      { value: '5', name: 'May' },
      { value: '6', name: 'June' },
      { value: '7', name: 'July' },
      { value: '8', name: 'August' },
      { value: '9', name: 'September' },
      { value: '10', name: 'October' },
      { value: '11', name: 'November' },
      { value: '12', name: 'December' }
    ];
    return months.map(month => (
      <option key={month.value} value={month.value}>{month.name}</option>
    ));
  };

  const renderDayOptions = () => {
    const days = [];
    for (let day = 1; day <= 31; day++) {
      days.push(<option key={day} value={day}>{day}</option>);
    }
    return days;
  };

  const handleSignSelection = (sign) => {
    setSelectedSign(sign);
    setShowResults(true);
  };

  const handleBirthDateSubmit = (e) => {
    e.preventDefault();
    if (birth.year) {
      // Find Chinese zodiac based on birth year
      for (const sign of zodiacSigns) {
        if (sign.years.includes(parseInt(birth.year))) {
          setSelectedSign(sign.id);
          setShowResults(true);
          return;
        }
      }
    }
  };

  const getZodiacData = (sign) => {
    return zodiacSigns.find(zodiac => zodiac.id === sign);
  };

  return (
    <div className="horoscope-page">
      <NavBar />
      <Hero />
      <div className="horoscope-container">

        {!showResults ? (
          <div className="horoscope-selection">
            <div className="selection-method">
              <h3>Select Your Chinese Zodiac Sign</h3>
              <div className="zodiac-grid">
                {zodiacSigns.map((sign) => (
                  <div 
                    key={sign.id} 
                    className="zodiac-item" 
                    onClick={() => handleSignSelection(sign.id)}
                  >
                    <img src={sign.image} alt={sign.name} className="zodiac-icon" />
                    <p className="zodiac-name">{sign.name}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="selection-method">
              <h3>Or Enter Your Birth Date</h3>
              <form onSubmit={handleBirthDateSubmit} className="birth-date-form">
                <div className="form-group">
                  <label htmlFor="month">Month:</label>
                  <select 
                    id="month"
                    value={birth.month}
                    onChange={(e) => setBirth({...birth, month: e.target.value})}
                  >
                    <option value="">--Select--</option>
                    {renderMonthOptions()}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="day">Day:</label>
                  <select 
                    id="day"
                    value={birth.day}
                    onChange={(e) => setBirth({...birth, day: e.target.value})}
                  >
                    <option value="">--Select--</option>
                    {renderDayOptions()}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="year">Year:</label>
                  <select 
                    id="year"
                    value={birth.year}
                    onChange={(e) => setBirth({...birth, year: e.target.value})}
                    required
                  >
                    <option value="">--Select--</option>
                    {renderYearOptions()}
                  </select>
                </div>

                <button type="submit" className="submit-btn">Find My Sign</button>
              </form>
            </div>
          </div>
        ) : (
          <div className="horoscope-results">
            {selectedSign && (
              <>
                <div className="zodiac-profile">
                  <img 
                    src={getZodiacData(selectedSign).image} 
                    alt={getZodiacData(selectedSign).name} 
                    className="zodiac-result-icon" 
                  />
                  <h3>{getZodiacData(selectedSign).name}</h3>
                  <p className="years-text">
                    Birth Years: {getZodiacData(selectedSign).years.join(', ')}
                  </p>
                  <button 
                    onClick={() => {
                      setShowResults(false);
                      setSelectedSign('');
                    }} 
                    className="back-btn"
                  >
                    Choose Different Sign
                  </button>
                  <Link 
                    to={`/prosper-guide/${selectedSign}`} 
                    className="prosper-link"
                  >
                    View Full Prosper Guide
                  </Link>
                </div>

                <div className="horoscope-readings">
                  <div className="reading-section">
                    <h3>Today's Horoscope</h3>
                    <div className="reading-content">
                      <p>{horoscopeReadings.daily[selectedSign]}</p>
                    </div>
                  </div>
                  
                  <div className="reading-section">
                    <h3>Weekly Forecast</h3>
                    <div className="reading-content">
                      <p>{horoscopeReadings.weekly[selectedSign]}</p>
                    </div>
                  </div>
                  
                  <div className="reading-section">
                    <h3>Monthly Outlook</h3>
                    <div className="reading-content">
                      <p>{horoscopeReadings.monthly[selectedSign]}</p>
                    </div>
                  </div>

                  <div className="reading-section">
                    <h3>Lucky Elements</h3>
                    <div className="reading-content lucky-elements">
                      <div className="lucky-item">
                        <h4>Lucky Colors:</h4>
                        <p>Red, Gold</p>
                      </div>
                      <div className="lucky-item">
                        <h4>Lucky Numbers:</h4>
                        <p>2, 8</p>
                      </div>
                      <div className="lucky-item">
                        <h4>Lucky Direction:</h4>
                        <p>Southeast</p>
                      </div>
                      <div className="lucky-item">
                        <h4>Lucky Months:</h4>
                        <p>February, October</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      <Footer forceShow={false} />
    </div>
  );
};

export default Horoscope; 