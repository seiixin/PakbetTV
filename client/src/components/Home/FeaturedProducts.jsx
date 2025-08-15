import React, { useState, useEffect, useRef } from "react";
import "./FeaturedProducts.css";
import { useNavigate } from "react-router-dom";

const products = [
  { title: "Keychain with Buddha", image: "/FeaturedProduct1.jpg" },
  { title: "Amber Bracelet", image: "/FeaturedProduct2.jpg" },
  { title: "Wooden Incense Holder", image: "/FeaturedProduct3.jpg" },
  { title: "Silver Ring with Inscriptions", image: "/FeaturedProduct4.jpg" },
];

// Duplicate the list for seamless looping
const extendedProducts = [...products, ...products];

const FeaturedProducts = () => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const trackRef = useRef(null);

  const handleClick = () => {
    navigate("/shop");
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => prev + 1);
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Reset position when halfway through to avoid giant index numbers
    if (currentIndex >= products.length) {
      setTimeout(() => {
        if (trackRef.current) {
          trackRef.current.style.transition = "none";
        }
        setCurrentIndex(0);
      }, 500);
    }
  }, [currentIndex]);

  return (
    <section className="featured-section">
      <div className="ticker-container">
        <div
          ref={trackRef}
          className="ticker-track"
          style={{
            transform: `translateX(-${currentIndex * 110}%)`, // 100% + 10% gap
            transition: "transform 0.5s ease",
          }}
        >
          {extendedProducts.map((product, index) => (
            <article key={index} className="featured-product" tabIndex={0}>
              <img
                src={product.image}
                alt={product.title}
                className="product-image"
              />
              <button
                className="add-to-cart-btn"
                aria-label={`Add ${product.title} to cart`}
                onClick={handleClick}
              >
                <span className="cart-icon-container">
                  <svg
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    className="cart-icon"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 7M7 13l-2 6h13m-6-6v6"
                    />
                  </svg>
                </span>
                Add to Cart
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;
