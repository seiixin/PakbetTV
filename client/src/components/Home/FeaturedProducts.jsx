import React from 'react';
import './FeaturedProducts.css';
import { useNavigate } from 'react-router-dom';

const products = [
  {
    title: 'Keychain with Buddha',
    image: 'https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/af130cc2-3eb3-4d07-80a5-f2379b1ac3b1.png',
  },
  {
    title: 'Amber Bracelet',
    image: 'https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/2ba3b027-2b42-4131-9fee-079275ca5d20.png',
  },
  {
    title: 'Wooden Incense Holder',
    image: 'https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/f6ec745d-5df6-4666-8cad-3b7a5cfba0b3.png',
  },
  {
    title: 'Silver Ring with Inscriptions',
    image: 'https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/71b6e0a6-2bdc-4f5c-a0e3-fc9410ba92a1.png',
  },
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
