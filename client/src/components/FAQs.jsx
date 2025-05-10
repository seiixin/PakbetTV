import React, { useEffect, useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './FAQs.css';
import NavBar from './NavBar';
import Footer from './Footer';
import API_BASE_URL from '../config';

const FAQs = () => {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [filteredFaqs, setFilteredFaqs] = useState([]);

  // Parse HTML content
  const createMarkup = (htmlContent) => {
    return { __html: htmlContent };
  };

  // Fetch FAQs from the API
  useEffect(() => {
    // Using the correct endpoint from cms.js route
    fetch(`${API_BASE_URL}/api/cms/faqs`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch FAQs');
        }
        return response.json();
      })
      .then((data) => {
        // Process the FAQ data to handle any HTML content
        const processedData = data.map(faq => ({
          ...faq,
          question: faq.question.replace(/<\/?p>/g, ''), // Remove p tags from questions
          answer: faq.answer
        }));
        setFaqs(processedData);
        setFilteredFaqs(processedData);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching FAQs:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Filter FAQs based on selected category
  const filterByCategory = (category) => {
    setActiveCategory(category);
    if (category === 'All') {
      setFilteredFaqs(faqs);
    } else {
      // This assumes we have a category field in the FAQ data
      // If not, you may need to adjust your backend to include categories
      const filtered = faqs.filter(faq => faq.category === category);
      setFilteredFaqs(filtered.length > 0 ? filtered : []);
    }
  };

  return (
    <div className="faqs-page">
      <NavBar /> 
      <div className="faq-hero">
        <div className="container">
          <h1>Frequently Asked Questions</h1>
          <p>Find answers to common questions about our products and services</p>
        </div>
      </div>
      
      <div className="container faq-container">
        {loading ? (
          <div className="text-center mt-5 mb-5">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : error ? (
          <div className="alert alert-danger mt-4" role="alert">
            Error: {error}
          </div>
        ) : (
          <>
            <div className="faq-categories mb-5">
              <button 
                className={`faq-category-btn ${activeCategory === 'All' ? 'active' : ''}`}
                onClick={() => filterByCategory('All')}
              >
                All
              </button>
              <button 
                className={`faq-category-btn ${activeCategory === 'Delivery' ? 'active' : ''}`}
                onClick={() => filterByCategory('Delivery')}
              >
                Delivery
              </button>
              <button 
                className={`faq-category-btn ${activeCategory === 'Returns' ? 'active' : ''}`}
                onClick={() => filterByCategory('Returns')}
              >
                Returns
              </button>
              <button 
                className={`faq-category-btn ${activeCategory === 'Payment' ? 'active' : ''}`}
                onClick={() => filterByCategory('Payment')}
              >
                Payment
              </button>
              <button 
                className={`faq-category-btn ${activeCategory === 'Products' ? 'active' : ''}`}
                onClick={() => filterByCategory('Products')}
              >
                Products
              </button>
            </div>
            
            <div className="accordion" id="faqAccordion">
              {filteredFaqs.length > 0 ? (
                filteredFaqs.map((faq) => (
                  <div key={faq.faqID} className="accordion-item shadow-sm mb-3 rounded">
                    <h2 className="accordion-header" id={`faqHeading${faq.faqID}`}>
                      <button
                        className="accordion-button collapsed"
                        type="button"
                        data-bs-toggle="collapse"
                        data-bs-target={`#faqCollapse${faq.faqID}`}
                        aria-expanded="false"
                        aria-controls={`faqCollapse${faq.faqID}`}
                      >
                        {faq.question}
                      </button>
                    </h2>
                    <div
                      id={`faqCollapse${faq.faqID}`}
                      className="accordion-collapse collapse"
                      aria-labelledby={`faqHeading${faq.faqID}`}
                      data-bs-parent="#faqAccordion"
                    >
                      <div className="accordion-body">
                        <div dangerouslySetInnerHTML={createMarkup(faq.answer)} />
                        {faq.publish_date && (
                          <small className="text-muted">
                            Published on {new Date(faq.publish_date).toLocaleDateString()}
                            {faq.status && ` | Status: ${faq.status}`}
                          </small>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-5">
                  <p>No FAQs available for this category. Please check another category or come back later.</p>
                </div>
              )}
            </div>
            
            <div className="faq-contact mt-5 mb-5">
              <h3>Still have questions?</h3>
              <p>If you couldn't find the answer to your question, please feel free to contact us.</p>
              <a href="mailto:support@fengshuibymaster.com" className="contact-btn">Contact Support</a>
            </div>
          </>
        )}
      </div>
      
      <Footer />
    </div>
  );
};

export default FAQs; 