import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './FAQs.css';
import NavBar from './NavBar';
import Footer from './Footer';
import API_BASE_URL from '../config';
import { sanitizeHtml } from '../utils/sanitize';

// Static FAQs content - moved outside component to avoid recreation
const staticFaqs = [
  // Delivery FAQs
  {
    faqID: 'delivery-1',
    question: 'Can I have my items delivered in another country?',
    answer: `<p>No, we currently deliver within the Philippines only. International shipping is not available at this time.</p>`,
    category: 'Delivery'
  },
  {
    faqID: 'delivery-2',
    question: 'How do I change or amend my delivery address?',
    answer: `<p>Please contact us immediately via phone or email if you need to update your delivery address. Changes can only be processed before your order has been shipped.</p>`,
    category: 'Delivery'
  },
  {
    faqID: 'delivery-3',
    question: 'How long does delivery usually take?',
    answer: `<p>Delivery time depends on your location:</p>
             <ul>
               <li><strong>Metro Manila:</strong> 2–5 business days</li>
               <li><strong>Provincial areas:</strong> 5–10 business days</li>
             </ul>
             <p>We ship via NinjaVan Philippines.</p>`,
    category: 'Delivery'
  },
  {
    faqID: 'delivery-4',
    question: 'How do I check my delivery status?',
    answer: `<p>Once your order has been dispatched, you will receive a NinjaVan tracking number via SMS or email. Use this to track your delivery on the NinjaVan website.</p>`,
    category: 'Delivery'
  },

  // Returns & Exchange FAQs
  {
    faqID: 'returns-2',
    question: 'What is your return policy?',
    answer: `<p>We accept returns and exchanges within 7 days of delivery, provided items are unused, in their original packaging, and in resellable condition. Return shipping costs are covered by the customer, unless the item was defective or sent in error.</p>`,
    category: 'Returns'
  },
  {
    faqID: 'returns-1',
    question: 'Can I return or exchange a faulty item?',
    answer: `<p>Yes, if you received a faulty or incorrect item, please contact us within 7 days of receiving your order. We will arrange a replacement or refund at no additional cost. Be sure to provide your order number and a clear photo of the issue.</p>`,
    category: 'Returns'
  },

  // Order & Cancellation FAQs
  {
    faqID: 'cancellation-3',
    question: 'How can I place an order?',
    answer: `<p>Orders can be placed directly through our website. Simply select your items, add them to your cart, and proceed to checkout.</p>`,
    category: 'Orders'
  },
  {
    faqID: 'cancellation-4',
    question: 'How will I know if my order was successful?',
    answer: `<p>You will receive an order confirmation email with your order details.</p>`,
    category: 'Orders'
  },
  {
    faqID: 'cancellation-2',
    question: 'Can I cancel my order?',
    answer: `<p>Order cancellations can only be made before your order has been shipped. Please contact us as soon as possible.</p>`,
    category: 'Orders'
  },

  // Payment FAQs
  {
    faqID: 'payment-1',
    question: 'Can I pay using several cards or split payment between cash and bank transfer?',
    answer: `<p>At this time, we do not accept split payments. Please select one payment method to complete your purchase.</p>`,
    category: 'Payment'
  },
  {
    faqID: 'payment-2',
    question: 'What are the modes of payment available for online purchase?',
    answer: `<p>We currently accept Dragonpay. Payment instructions will be provided at checkout and sent to your email.</p>`,
    category: 'Payment'
  },
  {
    faqID: 'payment-3',
    question: 'What kind of information do I need to provide during online checkout?',
    answer: `<p>During checkout, you will be asked to provide:</p>
             <ul>
               <li>Your full name</li>
               <li>Complete delivery address</li>
               <li>Contact number</li>
               <li>Email address</li>
             </ul>
             <p>After placing your order, you will receive details for your Dragonpay payment. Please ensure all information is correct to avoid any delays.</p>`,
    category: 'Payment'
  },

  // Product Availability FAQs
  {
    faqID: 'products-1',
    question: 'How can I check if the product is available online?',
    answer: `<p>All available products are listed on our website. If you can see the product and add it to your cart, it is in stock. In case an item becomes unavailable after your order is placed, we will notify you right away to arrange a replacement or refund.</p>`,
    category: 'Products'
  },

  // Contact Support FAQs
  {
    faqID: 'services-1',
    question: 'Contact Support',
    answer: `<p>For inquiries or assistance, please fill out our contact form.</p>`,
    category: 'Services'
  }
];

const FAQs = () => {
  const location = useLocation();
  const [faqs, setFaqs] = useState(staticFaqs); // Initialize with static FAQs
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [filteredFaqs, setFilteredFaqs] = useState(staticFaqs); // Initialize with static FAQs

  // Parse HTML content
  const createMarkup = (htmlContent) => {
    return { __html: sanitizeHtml(htmlContent) };
  };

  // Initialize FAQs
  useEffect(() => {
    const initializeFaqs = async () => {
      try {
        // Try to fetch additional FAQs from API
        const response = await fetch(`${API_BASE_URL}/api/cms/faqs`);
        if (response.ok) {
          const data = await response.json();
        const processedData = data.map(faq => ({
          ...faq,
            question: faq.question.replace(/<\/?p>/g, ''),
          answer: faq.answer
        }));
          
          // Combine API FAQs with static FAQs
          const combinedFaqs = [...staticFaqs, ...processedData];
          setFaqs(combinedFaqs);
        }
      } catch (err) {
        console.error('Error fetching FAQs:', err);
        // Static FAQs are already set in initial state
      }
      
        setLoading(false);
    };

    initializeFaqs();
  }, []);

  // Handle category filtering based on URL params and state changes
// Make sure you have this state:
const [searchQuery, setSearchQuery] = useState("");

useEffect(() => {
  const searchParams = new URLSearchParams(location.search);
  const categoryParam = searchParams.get("category") || "All";

  setActiveCategory(categoryParam);

  const filtered = faqs.filter(faq => {
    const matchesCategory =
      categoryParam === "All" || faq.category === categoryParam;

    const query = (searchQuery || "").toLowerCase();
    const matchesSearch =
      query === "" ||
      faq.question?.toLowerCase().includes(query) ||
      faq.answer?.toLowerCase().includes(query);

    return matchesCategory && matchesSearch;
  });

  setFilteredFaqs(filtered);
}, [faqs, location.search, searchQuery]);


  // Filter FAQs based on selected category
  const filterByCategory = (category) => {
    setActiveCategory(category);
    if (category === 'All') {
      setFilteredFaqs(faqs);
    } else {
      const filtered = faqs.filter(faq => faq.category === category);
      setFilteredFaqs(filtered);
    }
  };

  return (
    <div className="faqs-page">
      <NavBar /> 
      <div className="faq-hero">
        <div className="container">
          <h1>Frequently Asked Questions</h1>
        <input
          type="text"
          className="faq-search"
          placeholder="Find answers to common questions about our products and services"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
                </div>
      </div>
      
      <div className="container faq-container">
        <div className="faq-contact mt-5 mb-5">
          <h3>Still have questions?</h3>
          <p>If you couldn't find the answer to your question, please feel free to contact us.</p>
          <Link to="/contact" className="contact-btn">Contact Us</Link>
        </div>
        
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
                className={`faq-category-btn ${activeCategory === 'Orders' ? 'active' : ''}`}
                onClick={() => filterByCategory('Orders')}
              >
                Orders
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
              <button 
                className={`faq-category-btn ${activeCategory === 'Services' ? 'active' : ''}`}
                onClick={() => filterByCategory('Services')}
              >
                Services
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
            

          </>
        )}
      </div>
      
      <Footer forceShow={false} />
    </div>
  );
};

export default FAQs; 