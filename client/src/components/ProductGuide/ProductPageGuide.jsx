import React, { useState, useEffect } from 'react';
import NavBar from '../NavBar';
import Footer from '../Footer';
import './ProductPageGuide.css';

const ProductPageGuide = () => {
  const [pdfGuides, setPdfGuides] = useState([]);
  const [loading, setLoading] = useState(true);

  // Define the PDF guides with their information and preview images
  const pdfData = [
    {
      id: 'bracelet',
      title: 'Bracelet Guide',
      description: 'Complete guide for feng shui bracelets and their benefits',
      filename: 'Bracelet.pdf',
      category: 'Accessories',
      previewImage: '/PDF-Previews/Bracelet.png'
    },
    {
      id: 'coins',
      title: 'Coins Guide', 
      description: 'Traditional feng shui coins and their proper usage',
      filename: 'Coins.pdf',
      category: 'Traditional Items',
      previewImage: '/PDF-Previews/Coins.png'
    },
    {
      id: 'crystal-bottles',
      title: 'Crystal Bottles Guide',
      description: 'Crystal bottles for energy enhancement and protection',
      filename: 'CrystalBottles.pdf',
      category: 'Crystals',
      previewImage: '/PDF-Previews/CrystalBottles.png'
    },
    {
      id: 'fashion',
      title: 'Fashion Guide',
      description: 'Feng shui fashion items and styling tips',
      filename: 'Fashion.pdf',
      category: 'Fashion',
      previewImage: '/PDF-Previews/Fashion.png'
    },
    {
      id: 'fountain',
      title: 'Fountain Guide',
      description: 'Water fountains for wealth and prosperity',
      filename: 'Fountain.pdf',
      category: 'Water Elements',
      previewImage: '/PDF-Previews/Fountains.png'
    },
    {
      id: 'home-decor',
      title: 'Home Decor Guide',
      description: 'Feng shui home decoration essentials',
      filename: 'HomeDecor.pdf',
      category: 'Home & Living',
      previewImage: '/PDF-Previews/HomeDecor.png'
    },
    {
      id: 'incense',
      title: 'Incense Guide',
      description: 'Incense types and their spiritual benefits',
      filename: 'Incense.pdf',
      category: 'Spiritual Items',
      previewImage: '/PDF-Previews/Incense.png'
    },
    {
      id: 'keychains',
      title: 'Keychains Guide',
      description: 'Protective and lucky feng shui keychains',
      filename: 'Keychains.pdf',
      category: 'Accessories',
      previewImage: '/PDF-Previews/Keychains.png'
    },
    {
      id: 'medallions',
      title: 'Medallions Guide',
      description: 'Sacred medallions and amulets for protection',
      filename: 'Medallions.pdf',
      category: 'Protection Items',
      previewImage: '/PDF-Previews/Medallions.png'
    },
    {
      id: 'prosperity-bowl',
      title: 'Prosperity Bowl Guide',
      description: 'Wealth bowls for attracting abundance',
      filename: 'ProsperityBowl.pdf',
      category: 'Wealth Items',
      previewImage: '/PDF-Previews/ProsperityBowl.png'
    },
    {
      id: 'smudge-kit',
      title: 'Smudge Kit Guide',
      description: 'Cleansing and purification smudge kits',
      filename: 'SmudgeKit.pdf',
      category: 'Cleansing Items',
      previewImage: '/PDF-Previews/SmudgeKit.png'
    },
    {
      id: 'talisman-cards',
      title: 'Talisman Cards Guide',
      description: 'Protective talisman cards and their meanings',
      filename: 'TalismanCards.pdf',
      category: 'Protection Items',
      previewImage: '/PDF-Previews/TalismanCards.png'
    },
    {
      id: 'wallet',
      title: 'Wallet Guide',
      description: 'Feng shui wallets for wealth attraction',
      filename: 'Wallet.pdf',
      category: 'Accessories',
      previewImage: '/PDF-Previews/Wallet.png'
    },
    {
      id: 'wind-chimes',
      title: 'Wind Chimes Guide',
      description: 'Feng shui wind chimes and their placement',
      filename: 'WindChimes.pdf',
      category: 'Sound Elements',
      previewImage: '/PDF-Previews/WindChimes.png'
    },
    {
      id: 'wishing-paper',
      title: 'Wishing Paper Guide',
      description: 'Manifestation papers and ritual instructions',
      filename: 'WishingPaper.pdf',
      category: 'Spiritual Items',
      previewImage: '/PDF-Previews/WishingPaper.png'
    }
  ];

  useEffect(() => {
    // Simulate loading and set the PDF guides
    const timer = setTimeout(() => {
      setPdfGuides(pdfData);
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleOpenPDF = (filename) => {
    const pdfUrl = `/${filename}`;
    window.open(pdfUrl, '_blank');
  };

  const GuidePreview = ({ previewImage, title }) => {
    const [imageError, setImageError] = useState(false);

    const handleImageError = () => {
      setImageError(true);
    };

    return (
      <div className="guide-preview-container">
        {imageError ? (
          <div className="guide-preview-fallback">
            <i className="fas fa-file-pdf"></i>
            <span>Guide Preview</span>
          </div>
        ) : (
          <img 
            src={previewImage} 
            alt={`${title} preview`}
            className="guide-preview-image"
            onError={handleImageError}
          />
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="product-guide-container">
        <NavBar />
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading Product Guides...</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="product-guide-container">
      <NavBar />
      
      <div className="product-guide-content">
        <div className="guide-header">
          <h1>Product Guides</h1>
          <p>Comprehensive guides for all our feng shui products. Click on any guide to open it in a new tab.</p>
        </div>

        <div className="guides-grid">
          {pdfGuides.map((guide) => (
            <div 
              key={guide.id} 
              className="guide-card"
              onClick={() => handleOpenPDF(guide.filename)}
            >
              <div className="guide-preview">
                <GuidePreview previewImage={guide.previewImage} title={guide.title} />
                <div className="guide-overlay">
                  <i className="fas fa-external-link-alt"></i>
                  <span>Open PDF</span>
                </div>
              </div>
              
              <div className="guide-info">
                <h3 className="guide-title">{guide.title}</h3>
                <p className="guide-description">{guide.description}</p>
                
                <div className="guide-actions">
                  <button 
                    className="open-pdf-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenPDF(guide.filename);
                    }}
                  >
                    <i className="fas fa-external-link-alt"></i>
                    Open Guide
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ProductPageGuide; 