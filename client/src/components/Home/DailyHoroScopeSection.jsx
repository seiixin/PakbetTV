import React, { useState, useEffect } from 'react';
import './DailyHoroScopeSection.css';

const slides = [
  { title: 'Daily Horoscope', subtitle: '19 July 2025', content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam interdum feugiat purus, vitae finibus eros convallis id.' },
  { title: 'Master Michael', subtitle: 'Feng Shui Blogs', content: 'Tips and advice for harmonizing your home and workspace.' },
  { title: 'Ka-PakBet', subtitle: 'Testimonials', content: 'Mga kwento ng tagumpay mula sa ating mga loyal clients.' },
  { title: 'Lucky Colors', subtitle: 'for Today', content: 'Red and white bring fortune and protection today.' },
  { title: 'Zodiac Compatibility', subtitle: 'Leo & Gemini', content: 'Leo’s fire blends well with Gemini’s air—expect good synergy.' },
  { title: 'Feng Shui Tips', subtitle: 'Main Door Energy', content: 'Keep your entrance clean and well-lit to attract prosperity.' },
  { title: 'Crystal of the Day', subtitle: 'Citrine', content: 'Boosts wealth and self-confidence—carry it with you.' },
  { title: 'Do’s & Don’ts', subtitle: 'July 19, 2025', content: 'Avoid arguments, donate today if you can.' },
  { title: 'Spiritual Guidance', subtitle: 'Angel Number 111', content: 'New beginnings and positive energy await you.' },
];

const groupSlides = (items, size) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) =>
    items.slice(i * size, i * size + size)
  );

const DailyHoroScopeSection = () => {
  const groupedSlides = groupSlides(slides, 3);
  const [activeGroup, setActiveGroup] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveGroup((prev) => (prev + 1) % groupedSlides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [groupedSlides.length]);

  return (
    <div>
      {/* Hero Section */}
      <section className="herosection" aria-label="Daily horoscope banner">
        <video
          className="hero-video-bg"
          src="/HomeHeroVideo.mp4"
          autoPlay
          muted
          loop
          playsInline
        />
<div
  className="hero-content"
  style={{
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 2,
    userSelect: 'none',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    padding: '1rem',
    textAlign: 'left',
    maxWidth: '600px', // optional: limits text width
  }}
>
  <h1
    className="hero-title"
    style={{
      fontSize: '2.2rem',
      fontWeight: 750,
      color: 'white',
      margin: 0,
      lineHeight: 1.2,
      textShadow: '1px 1px 4px rgba(0,0,0,0.5)',
      textAlign: 'left', // ensure it's not center
    }}
  >
    Daily Horoscope by<br />
    Master <span className="highlight">Michael De Mesa</span>
  </h1>
</div>


        {/* Carousel Dots */}
        <div className="carousel-dots" aria-label="Carousel navigation dots">
          {groupedSlides.map((_, i) => (
            <button
              key={i}
              className={`carousel-dot ${i === activeGroup ? 'active' : ''}`}
              aria-current={i === activeGroup ? 'true' : undefined}
              onClick={() => setActiveGroup(i)}
              aria-label={`Group ${i + 1}`}
            />
          ))}
        </div>
      </section>

      {/* Content Cards */}
      <section className="content-section" aria-label="Daily horoscope cards">
        {groupedSlides[activeGroup].map((slide, i) => (
          <article
            key={i}
            className="content-box"
            role="button"
            aria-expanded="true"
          >
            <div className="content-header active">
              <span className="plus">+</span>
              <span>
                <strong>
                  {slide.title}
                  <br />
                  {slide.subtitle}
                </strong>
              </span>
            </div>
            <p className="content-text open">{slide.content}</p>
          </article>
        ))}
      </section>
    </div>
  );
};

export default DailyHoroScopeSection;
