import React from 'react';
import './DailyVideo.css';

const DailyVideo = () => {
  const videoLink = 'https://www.youtube.com/watch?v=HZXVQRdUReI';

  return (
    <section className="daily-container">
      {/* Left Side: Text */}
      <aside className="daily-text-section">
        <div className="daily-text-content">
          <p className="daily-subtitle">
            Feng Shui Daily<br />by Master Michael De Mesa | 19 July 2025
          </p>
          <h1 className="daily-main-title">
            Naniniwala ka ba <br />sa Feng Shui?
          </h1>
          <p className="daily-description">
            Learn the basics of feng shui with Sir Michael De Mesa on PakBet TV. Discover simple tips to improve the flow of energy in your space. Attract positivity and balance into your home or workplace today.
          </p>
          <a className="daily-btn-watch" href={videoLink} target="_blank" rel="noopener noreferrer">
            Watch Now
          </a>
        </div>
      </aside>

      {/* Right Side: Full Height Video */}
      <article className="daily-video-section">
        <div className="daily-video-wrapper">
          <img
            src="https://img.youtube.com/vi/HZXVQRdUReI/maxresdefault.jpg"
            alt="Thumbnail"
          />
          <div className="gradient-overlay" />
          <div className="play-button" />
        </div>
      </article>
    </section>
  );
};

export default DailyVideo;
