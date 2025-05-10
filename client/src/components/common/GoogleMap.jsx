import React from 'react';

const GoogleMap = () => {
  const mapUrl = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3861.4772834469187!2d121.05335417469791!3d14.579494185999897!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397c98ce637360d%3A0xfd26309ab797859b!2sPakBet%20TV%20Feng%20Shui%20Consultancy%20Inc.!5e0!3m2!1sen!2sph!4v1709706844544!5m2!1sen!2sph";

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