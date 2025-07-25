import React from 'react';
import './Banner.css'; // External styles for cleaner JSX (optional)

const Banner = () => {
  return (
    <div className="announcement-container" role="region" aria-label="Announcement banner">
      <div className="image-section" aria-hidden="true">
        <img
          src="https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/7d30ef86-ce96-4b9e-a2bc-9c7cf7ecb9dc.png"
          alt="Detailed close-up of a historic ancient silver coin with a golden rim on a wooden background"
          onError={(e) => {
            e.target.src = 'https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/e44b60be-750f-4378-baca-3fc354bc20d2.png';
          }}
        />
      </div>
      <div className="text-section">
        Space for Ads / Announcement Section
      </div>
    </div>
  );
};

export default Banner;
