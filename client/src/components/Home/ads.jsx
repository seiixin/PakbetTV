// client/src/components/Home/ads.jsx
import React, { useState, useEffect, useRef } from "react";
import "./ads.css";

const Ads = () => {
  const slides = ["/ads1.jpg", "/ads2.jpg", "/ads3.jpg", "/ads4.jpg", "/ads5.jpg"];
  const [index, setIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const timeoutRef = useRef(null);

  const extendedSlides = [...slides, slides[0]]; // duplicate first slide

  const goToSlide = (slideIndex) => {
    setIndex(slideIndex);
    setIsTransitioning(true);
  };

  useEffect(() => {
    timeoutRef.current = setInterval(() => {
      setIndex((prev) => prev + 1);
    }, 2000);

    return () => clearInterval(timeoutRef.current);
  }, []);

  useEffect(() => {
    if (index === slides.length) {
      // Jump to first slide without flicker
      const timeout = setTimeout(() => {
        setIsTransitioning(false);
        setIndex(0);
        setTimeout(() => setIsTransitioning(true), 20);
      }, 500); // same as transition speed
      return () => clearTimeout(timeout);
    }
  }, [index, slides.length]);

  return (
    <section className="home-ad-banner">
      <div
        className="ad-banner-inner"
        style={{
          transform: `translateX(-${index * 100}%)`,
          transition: isTransitioning ? "transform 0.5s ease-in-out" : "none"
        }}
      >
        {extendedSlides.map((src, i) => (
          <div
            key={i}
            className="ad-slide"
            style={{ backgroundImage: `url(${src})` }}
          />
        ))}
      </div>

      {/* Dots */}
      <div className="ad-dots">
        {slides.map((_, i) => (
          <span
            key={i}
            className={`ad-dot ${i === index % slides.length ? "active" : ""}`}
            onClick={() => goToSlide(i)}
          />
        ))}
      </div>
    </section>
  );
};

export default Ads;
