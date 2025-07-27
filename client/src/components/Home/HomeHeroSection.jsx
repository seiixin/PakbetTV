import React from 'react';

const HomeHeroSection = () => {
  return (
        <section className="home-hero-section">
        {/* Background video */}
        <video
            className="video-background"
            src="/HomeHeroVideo.mp4"
            autoPlay
            muted
            loop
            playsInline
        />

        {/* Gradient overlay */}
        <div className="gradient-overlay"></div>

        {/* Foreground content */}
        <div className="hero-content">
            <main className="hero-container" role="main" aria-label="Simplifying Feng Shui">

            {/* Left content */}
            <div className="text-content">
                <h1 className="headline">
                <span className="yellow-bold">Simplifying</span><br />
                <span className="white-bold">Feng Shui</span><br />
                <span className="yellow-bold">for everyone.</span>
                </h1>

                <section className="buttons" aria-label="Primary actions">
                <Link to="/contact"  style={{ textDecoration: 'none' }} className="btn-ask">
                    Ask <strong>Master Michael</strong> now
                </Link>
                <Link to="/shop" style={{ textDecoration: 'none' }} className="btn-shop">
                Go to Shop
                </Link>
                </section>

                <section className="features" aria-label="Key Features and Benefits">
                <article className="feature-item">
                    <svg className="feature-icon" viewBox="0 0 24 24">
                    <path d="M12 2L15 8H9L12 2Z" />
                    <circle cx="12" cy="16" r="6" />
                    </svg>
                    Expert<br />Guidance
                </article>
                <article className="feature-item">
                    <svg className="feature-icon" viewBox="0 0 24 24">
                    <path d="M4 4h16v16H4z" />
                    <path d="M4 9h16" />
                    </svg>
                    Personalized<br />Analysis
                </article>
                <article className="feature-item">
                    <svg className="feature-icon" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M8 12h8" />
                    </svg>
                    Realistic<br />Solution
                </article>
                <article className="feature-item">
                    <svg className="feature-icon" viewBox="0 0 24 24">
                    <path d="M12 2a10 10 0 0 1 10 10" />
                    <path d="M2 12a10 10 0 0 0 10 10" />
                    </svg>
                    Modern<br />Practice
                </article>
                <article className="feature-item">
                    <svg className="feature-icon" viewBox="0 0 24 24">
                    <path d="M3 12h18M12 3v18" />
                    </svg>
                    Life<br />Harmony
                </article>
                <article className="feature-item">
                    <svg className="feature-icon" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                    </svg>
                    Timely<br />Advice
                </article>
                </section>
            </div>

            {/* Right picture */}
            <div className="image-container">
                <img src="/MasterMichael.png" alt="Master Michael" />
            </div>

            </main>
        </div>
        </section>

  );
};

export default HomeHeroSection;