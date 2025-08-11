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

const heroImages = [
  '/HoroscopeBackground.jpg',
  '/HoroscopeBackground2.jpg',
  '/HoroscopeBackground3.jpg',
];

const groupSlides = (items, size) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) =>
    items.slice(i * size, i * size + size)
  );

const DailyHoroScopeSection = () => {
  const groupedSlides = groupSlides(slides, 3);
  const [activeGroup, setActiveGroup] = useState(0);
  const [nextGroup, setNextGroup] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      startSlide((activeGroup + 1) % groupedSlides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeGroup, groupedSlides.length]);

  const startSlide = (index) => {
    if (animating || index === activeGroup) return;
    setNextGroup(index);
    setAnimating(true);
    setTimeout(() => {
      setActiveGroup(index);
      setAnimating(false);
    }, 800); // match CSS animation duration
  };

  return (
    <div>
      <section className="herosection" aria-label="Daily horoscope banner">
        <div className="hero-image-wrapper">
          {/* Current visible image */}
          <img
            src={heroImages[activeGroup]}
            alt=""
            className="hero-image current"
          />
          {/* Incoming image */}
          {animating && (
            <img
              src={heroImages[nextGroup]}
              alt=""
              className="hero-image next slide-in"
            />
          )}
        </div>

        <div className="hero-content">
          <h1 className="hero-title">
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
              onClick={() => startSlide(i)}
              aria-label={`Group ${i + 1}`}
            />
          ))}
        </div>
      </section>

      {/* Content Cards */}
      <section className="content-section" aria-label="Daily horoscope cards">
        {groupedSlides[activeGroup].map((slide, i) => (
          <article key={i} className="content-box" role="button" aria-expanded="true">
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
