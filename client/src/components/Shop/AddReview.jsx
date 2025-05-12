import React, { useState } from 'react';
import './AddReview.css'; 
import { useParams } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from '../common/LoadingSpinner';
import { createGlobalStyle } from 'styled-components';
import API_BASE_URL from '../../config';

function Star({ filled, onClick, onMouseEnter, onMouseLeave }) {
  return (
    <svg
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      xmlns="http://www.w3.org/2000/svg"
      fill={filled ? "#ffb400" : "none"}
      stroke="#ffb400"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="32"
      height="32"
      style={{ cursor: "pointer" }}
      aria-hidden="true"
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01z" />
    </svg>
  );
}

function AddReview() {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [name, setName] = useState("");
  const [review, setReview] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (rating === 0) {
      alert("Please select a rating.");
      return;
    }
    if (!name.trim()) {
      alert("Please enter your name.");
      return;
    }
    if (!review.trim()) {
      alert("Please enter your review.");
      return;
    }
    alert(`Thank you for your review!\n\nName: ${name}\nRating: ${rating} star(s)\nReview: ${review}`);
    setRating(0);
    setHoverRating(0);
    setName("");
    setReview("");
  };

  return (
    <main>
      <h1>Add Review</h1>
      <form onSubmit={handleSubmit} aria-label="Add review form">
        <div>
          <label htmlFor="name">Your Name</label>
          <input
            id="name"
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            aria-required="true"
          />
        </div>
        <div>
          <label>Rating</label>
          <div className="rating-group" role="radiogroup" aria-label="Star rating">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                filled={star <= (hoverRating || rating)}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
              />
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="review">Your Review</label>
          <textarea
            id="review"
            placeholder="Write your review here"
            value={review}
            onChange={e => setReview(e.target.value)}
            required
            aria-required="true"
          />
        </div>
        <button type="submit" className="submit-btn" aria-label="Submit review">
          Submit Review
        </button>
      </form>
    </main>
  );
}

export default AddReview;