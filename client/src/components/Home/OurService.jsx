import React, { useState, useMemo, useEffect } from 'react';
import './OurServices.css';
import FeaturedProducts from './FeaturedProducts';

const services = [
  {
    title: 'House Feng Shui Audit',
    subtitle: 'With Master Michael De Mesa',
    image: '/Consultation-1.jpg',
  },
  {
    title: 'Bazi Reading',
    subtitle: 'With Master Michael De Mesa',
    image: '/Consultation-2.jpg',
  },
  {
    title: 'Auspicious Date Selection',
    subtitle: 'With Master Michael De Mesa',
    image: '/Consultation-3.jpg',
  },
  {
    title: 'Yearly Residential Feng Shui Analysis',
    subtitle: 'With Master Michael De Mesa',
    image: '/Consultation-4.jpg',
  },
];

const OurService = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleArrow = (dir) => {
    const nextIndex =
      dir === 'left'
        ? (currentIndex - 1 + services.length) % services.length
        : (currentIndex + 1) % services.length;
    setCurrentIndex(nextIndex);
  };

  // ✅ Auto-slide every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % services.length);
    }, 5000);

    return () => clearInterval(interval); // Cleanup
  }, []);

  const visibleServices = useMemo(() => {
    const visible = [];
    for (let i = -1; i <= 1; i++) {
      const index = (currentIndex + i + services.length) % services.length;
      visible.push({
        ...services[index],
        position: i,
        index: index,
      });
    }
    return visible;
  }, [currentIndex]);

  return (
    <>
      <section className="our-service-section">
        <div className="gradient-overlay"></div>
        <h1 className="our-service-title">Our Services</h1>

        <div className="our-service-slider-wrapper">
          <div className="our-service-slider">
            {visibleServices.map((service) => {
              const isCenter = service.position === 0;

              if (isCenter) {
                return (
<div className="our-service-slider-wrapper">
  <button
    className="slider-btn left"
    onClick={() => handleArrow('left')}
    aria-label="Previous"
  ></button>

  <div className="our-service-slider">
    {visibleServices.map((service) => {
      const isCenter = service.position === 0;
      return (
        <div
          key={service.index}
          className={`service-card ${isCenter ? 'center' : 'side'}`}
          style={{
            transition: 'transform 0.5s ease-in-out',
            transform: isCenter ? 'scale(1)' : 'scale(0.9)',
            opacity: isCenter ? 1 : 0.5,
          }}
        >
          <img
            src={service.image}
            alt={service.title}
            className="service-img"
          />
        </div>
      );
    })}
  </div>

  <button
    className="slider-btn right"
    onClick={() => handleArrow('right')}
    aria-label="Next"
  ></button>
</div>
                );
              }

            })}
          </div>
        </div>
      </section>

      <section className="featured-products-section">
        <FeaturedProducts />
      </section>
    </>
  );
};

export default OurService;
