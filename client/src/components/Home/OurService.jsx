import React, { useState, useEffect, useMemo } from 'react';
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
    setCurrentIndex((prevIndex) =>
      dir === 'left'
        ? (prevIndex - 1 + services.length) % services.length
        : (prevIndex + 1) % services.length
    );
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % services.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const visibleServices = useMemo(() => {
    const output = [];
    for (let i = -1; i <= 1; i++) {
      const index = (currentIndex + i + services.length) % services.length;
      output.push({
        ...services[index],
        position: i,
        index,
      });
    }
    return output;
  }, [currentIndex]);

  return (
    <>
      <section className="our-service-section">
        <div className="gradient-overlay"></div>
        <h1 className="our-service-title">
          <span style={{ color: '#ffffff', fontWeight: 700 }}>Our</span>{' '}
          <span style={{ color: '#fdea18', fontWeight: 700 }}>Services</span>
        </h1>

        <div className="our-service-slider-wrapper">
          <div className="center-gradient-overlay"></div>

          {visibleServices.map((service) => {
            const isCenter = service.position === 0;

            if (isCenter) {
              return (
                <div key={service.index} className="center-container">
                  <button
                    className="slider-btn left"
                    onClick={() => handleArrow('left')}
                    aria-label="Previous"
                  ></button>

                  <div className="service-card center">
                    <img
                      src={service.image}
                      alt={service.title}
                      className="service-img"
                    />
                  </div>

                  <button
                    className="slider-btn right"
                    onClick={() => handleArrow('right')}
                    aria-label="Next"
                  ></button>
                </div>
              );
            }

            return (
              <div key={service.index} className="service-card side">
                <img
                  src={service.image}
                  alt={service.title}
                  className="service-img"
                />
              </div>
            );
          })}
        </div>
      </section>

      <section className="featured-products-section">
        <FeaturedProducts />
      </section>
    </>
  );
};

export default OurService;
