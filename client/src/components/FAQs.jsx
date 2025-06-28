import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
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
      answer: `<p>We do not ship outside of the Philippines. We only offer delivery services within the areas covered by our authorized courier (GoGoXpress) in the Philippines.</p>
               <p>Kindly check <a href="#" target="_blank">GoGoXpress</a> for the complete delivery coverage.</p>`,
      category: 'Delivery'
    },
    {
      faqID: 'delivery-2',
      question: 'How do I change or amend my delivery address?',
      answer: `<p>We cannot change the shipping address details once the order has been placed.</p>
               <p>Please get in touch with our friendly Customer Support Team through the channels below.</p>`,
      category: 'Delivery'
    },
    {
      faqID: 'delivery-3',
      question: 'How long does delivery usually take?',
      answer: `<p>Below are the estimated time frames from date of purchase:</p>
               <ul>
                 <li><strong>Metro Manila:</strong> 3-5 working days</li>
                 <li><strong>Luzon:</strong> 5-8 working days</li>
                 <li><strong>Visayas:</strong> 8-10 working days</li>
                 <li><strong>Mindanao:</strong> 10-12 working days</li>
               </ul>
               <p>For home delivery, our courier only delivers Monday to Saturday, 8 am to 5 pm.</p>
               <p>We can only provide estimates and more detailed information may be viewed on your order status once the items have been shipped. We will allocate additional days for cases of unforeseen events such as natural calamities.</p>`,
      category: 'Delivery'
    },
    {
      faqID: 'delivery-4',
      question: 'How to check your delivery status for Home delivery?',
      answer: `<ol>
                 <li>Please locate your tracking number from the delivery confirmation e-mail.</li>
                 <li>Kindly allow 24-48 hours after you have received the delivery confirmation e-mail to reflect the status of your order.</li>
                 <li>You may visit <a href="#" target="_blank">GogoXpress</a> and enter the tracking number indicated on your confirmation e-mail.</li>
               </ol>`,
      category: 'Delivery'
    },

    // Return Exchange FAQs
    {
      faqID: 'returns-1',
      question: 'Can I return or exchange a faulty item?',
      answer: `<p>We're very sorry to hear an item you have purchased from us may be faulty! You can visit our Feng Shui by PakBet TV store so that our friendly staff can physically assess your item for any manufacturing faults. Please ensure to bring your receipt or another form of proof of transaction so that the team can verify your purchase.</p>
               <p>If you have purchased your item online, please get in touch with our Customer Support Team via any channels available below. Kindly provide us a picture of the faulty item and a copy of all the documents.</p>`,
      category: 'Returns'
    },
    {
      faqID: 'returns-2',
      question: 'What is your Returns Policy?',
      answer: `<ol>
                 <li>Original receipt of purchase is needed for product exchange/refund within 30 days after purchase date or shipment date provided the product is bought within Feng Shui by PakBet TV store. For items bought through the official Feng Shui by PakBet TV online store, the return form is needed in addition to the official receipt.</li>
                 <li>Item exchange can be processed in our Feng Shui by PakBet TV store. For exchange of items bought in the official Feng Shui by PakBet TV online store, please bring the product/s along with the original official receipt, original packing list and return form Feng Shui by PakBet TV store. There is no online processing for exchange of products.</li>
                 <li>Product purchased with a discount may be exchanged/refunded based on the discounted amount.</li>
                 <li>Product may be exchanged/refunded if there is a manufacturing fault.</li>
                 <li>Products may be exchanged/refunded provided that the products are in new and original condition.</li>
                 <li>PakBet TV Feng Shui Consultancy Inc. reserves the right to solely define and limit, refuse, and/or reject returns from customers and/or delete or freeze customer accounts at any time due to:
                   <ul>
                     <li>An irregular or excessive returns history;</li>
                     <li>Purchases made for resale purposes;</li>
                     <li>Creation of multiple account ID's by one user;</li>
                     <li>Potential fraudulent or criminal activity.</li>
                   </ul>
                   Membership application may not be approved if the applicants previous membership was cancelled.
                 </li>
               </ol>`,
      category: 'Returns'
    },

    // Order Cancellation FAQs
    {
      faqID: 'cancellation-1',
      question: 'Can I reorder the same item/s upon order cancellation?',
      answer: `<p>Yes, you may reorder the same item/s even after you have cancelled your order. However, we cannot guarantee that the same item/s will still be available by the time you reorder.</p>`,
      category: 'Orders'
    },
    {
      faqID: 'cancellation-2',
      question: 'Can I cancel part of my order?',
      answer: `<p>Partial cancellation of order is not allowed. We will work on having that feature available in the future. You can contact our Customer Support Team through the channels below for further guidance.</p>`,
      category: 'Orders'
    },

    // Payment FAQs
    {
      faqID: 'payment-1',
      question: 'Can I pay using several cards/split payment between cash and card?',
      answer: `<p>Option for installment, split payment, or using multiple credit cards is not available. We are continuously improving our service and we are looking to expand our modes of payment in the future.</p>
               <p>We accept major credit cards and debit cards in settling your Feng Shui by PakBet TV online purchases.</p>`,
      category: 'Payment'
    },
    {
      faqID: 'payment-2',
      question: 'What are the modes of payment available for online purchase?',
      answer: `<p>To order online, we have three (3) payment methods available:</p>
               <ol>
                 <li><strong>Online payment via credit/debit card</strong>
                   <ul>
                     <li>For credit cards, we accept Visa, Mastercard, JCB and AMEX.</li>
                     <li>For debit cards, Visa and Mastercard only</li>
                   </ul>
                 </li>
                 <li><strong>Offline payment via PayMongo payment channels.</strong></li>
                 <li><strong>Cash on Delivery (COD)</strong>
                   <ul>
                     <li>COD orders will depend on GoGoXpress serviceable areas. <a href="#" target="_blank">Click here</a> to check their coverage areas.</li>
                   </ul>
                 </li>
               </ol>`,
      category: 'Payment'
    },
    {
      faqID: 'payment-3',
      question: 'What kind of information do I need to provide during online check out?',
      answer: `<p>For online payments, you will need to specify the full credit card number you will use to make the payment, cardholders name or the name that appears on the card, CVV/CVC and the expiration date of the card.</p>
               <p>Your credit card company may send you an OTP (One-Time-Passcode) through your mobile device, and you may be asked to input the numbers to successfully complete the transaction.</p>`,
      category: 'Payment'
    },

    // Product Available FAQs
    {
      faqID: 'products-1',
      question: 'How can I check if the product is available online?',
      answer: `<p>You may check the availability of our products on our website. If you are searching for a specific product, just type the product code or product name on the search bar.</p>
               <p>If the search result comes back empty, it means that the item is either out of stock online or already discontinued.</p>`,
      category: 'Products'
    },

    // Gift Wrapping FAQs
    {
      faqID: 'services-1',
      question: 'Can I request for gift wrapping service, gift receipts, and/or paper bags for online purchases?',
      answer: `<p><strong>Gift wrapping services</strong> are not available in both our online store and physical stores at the moment.</p>
               <p><strong>Gift Receipt:</strong> Gift receipts are not available for online orders at the moment. This service is available for purchases made in our physical stores. You may request for a gift receipt upon transaction.</p>
               <p><strong>Shopping Bags:</strong> We cannot provide shopping bags for online orders at the moment. All orders come in delivery plastic pouches or boxes. Our shopping bags are only available for store purchases. You may request for extra shopping bags during your transaction at the store (1 bag = 1 item).</p>`,
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
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const categoryParam = searchParams.get('category');
    
    let targetCategory = 'All';
    if (categoryParam) {
      targetCategory = categoryParam;
      setActiveCategory(categoryParam);
    }
    
    // Apply filtering
    if (targetCategory === 'All') {
      setFilteredFaqs(faqs);
    } else {
      const filtered = faqs.filter(faq => faq.category === targetCategory);
      setFilteredFaqs(filtered);
    }
  }, [faqs, location.search]);

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
            
            <div className="faq-contact mt-5 mb-5">
              <h3>Still have questions?</h3>
              <p>If you couldn't find the answer to your question, please feel free to contact us.</p>
              <a href="mailto:admin@pakbettv.com" className="contact-btn">Contact Support</a>
            </div>
          </>
        )}
      </div>
      
      <Footer forceShow={false} />
    </div>
  );
};

export default FAQs; 