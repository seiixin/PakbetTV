import React from 'react';

const GoogleMap = () => {
  const mapUrl = "https://maps.google.com/maps?q=Cityland+Shaw+Tower,+St.+Francis+Street,+Mandaluyong,+Metro+Manila&t=&z=18&ie=UTF8&iwloc=&output=embed";

  return (
    <div className="google-map">
      <iframe
        src={mapUrl}
        width="100%"
        height="250"
        style={{ border: 0 }}
        allowFullScreen=""
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      ></iframe>
    </div>
  );
};

export default GoogleMap; 