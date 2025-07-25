import React from 'react';
import './DailyVideo.css';

const DailyVideo = () => {
  const videoLink = 'https://www.youtube.com/watch?v=HZXVQRdUReI';

  return (
    <section className="daily-container" aria-label="Feng Shui Daily Video Presentation">
      <aside className="daily-text-section">
        <p className="daily-subtitle">
          Feng Shui Daily<br />by Master Michael De Mesa | 19 July 2025
        </p>
        <h1 className="daily-main-title">
          Naniniwala ka ba <br />sa Feng Shui?
        </h1>
        <p className="daily-description">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam
          interdum feugiat purus, vitae finibus eros convallis id.
        </p>
        <a className="daily-btn-watch" href={videoLink} target="_blank"style={{ textDecoration: 'none' }}  rel="noopener noreferrer">
          Watch Now
        </a>
      </aside>

      <article className="daily-video-section" aria-label="Video featuring Master Michael De Mesa on Feng Shui">

<div className="daily-wrapper">
  <div className="daily-left">
    {/* Text content here */}
  </div>

  <div className="daily-right">
    <div className="daily-video-wrapper">
      <img
        src="https://img.youtube.com/vi/HZXVQRdUReI/maxresdefault.jpg"
        alt="Thumbnail"
      />
      <div className="gradient-overlay" />
      <div className="play-button" />
    </div>
  </div>
</div>
      </article>
    </section>
  );
};

export default DailyVideo;
