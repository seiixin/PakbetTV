import React from 'react';
import './FeaturedProducts.css';
import { useNavigate } from 'react-router-dom';

const products = [
  {
    title: 'Keychain with Buddha',
    image: 'public/FeaturedProduct1.jpg'
  },
  {
    title: 'Amber Bracelet',
    image: 'public/FeaturedProduct2.jpg'
  },
  {
    title: 'Wooden Incense Holder',
    image: 'public/FeaturedProduct3.jpg'
  },
  {
    title: 'Silver Ring with Inscriptions',
    image: 'public/FeaturedProduct4.jpg'
  }
];

const FeaturedProducts = () => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/shop');
  };

  return (
    <section className="featured-section">
      <div className="featured-products-row">
        {products.map((product, index) => (
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
    </section>
  );
};

export default FeaturedProducts;
