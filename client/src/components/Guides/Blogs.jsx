import React from 'react';
import { Link } from 'react-router-dom';
import './Blogs.css';

const Navbar = () => {
  return (
    <nav>
      <div className="nav-container">
        <ul className="nav-links">
          <li><a href="/">HOME</a></li>
          <li><a href="/shop">SHOP</a></li>
          <li><a href="#">CONSULTATIONS</a></li>
          <li><a href="#">HOROSCOPE</a></li>
          <li><a href="/blogs">BLOGS</a></li> {/* Updated link */}
          <li><a href="#">FREE TOOLS</a></li>
          <li><a href="#">CONTACT US</a></li>
        </ul>
        <div className="nav-info">
          <div className="flex items-center space-x-1">
            <i className="fas fa-eye"></i>
            <span>RECENTLY VIEWED</span>
          </div>
          <div className="flex items-center space-x-1">
            <i className="fas fa-phone-alt"></i>
            <span>0976-120-3535</span>
          </div>
        </div>
      </div>
    </nav>
  );
};

const Hero = () => {
  return (
    <section className="hero" role="banner" tabIndex="0" aria-label="Red banner with auspicious pattern and text 'Bring the auspicious into your life today! SHOP NOW' in white with a rounded white button">
      <div className="hero-text">Bring the auspicious into your life today!</div>
      <Link to="/shop">
        <button className="hero-button" type="button" tabIndex="0">SHOP NOW</button>
      </Link>
    </section>
  );
};

const Card = ({ imgSrc, altText, title }) => {
  return (
    <article className="card" tabIndex="0">
      <img src={imgSrc} alt={altText} width="400" height="250" />
      <div className="card-content">{title}</div>
    </article>
  );
};

const App = () => {
  return (
    <>
      <Navbar />
      <main>
        <h1 style={{ fontSize: "2.50rem" }}>Blogs</h1>
        <Hero />
        <section className="cards">
          <Card imgSrc="https://storage.googleapis.com/a1aa/image/599544c6-113c-4e77-ec6e-686350b4f67d.jpg" altText="Red background with auspicious pattern and text 'Horoscope Forecast Today August 28, 2022' in yellow and white" title="Pipework Installation" />
          <Card imgSrc="https://storage.googleapis.com/a1aa/image/599544c6-113c-4e77-ec6e-686350b4f67d.jpg" altText="Hand holding a smoking stick with blurred background of a room" title="Horoscope For Today February 20, 2023" />
          <Card imgSrc="https://storage.googleapis.com/a1aa/image/599544c6-113c-4e77-ec6e-686350b4f67d.jpg" altText="Hand holding a smoking stick with blurred background of a room" title="Horoscope For Today February 20, 2023" />
        </section>
      </main>
    </>
  );
};

export default App;