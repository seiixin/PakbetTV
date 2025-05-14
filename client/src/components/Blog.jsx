import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { Link } from "react-router-dom";
import 'bootstrap/dist/css/bootstrap.min.css';
import './Blog.css';
import NavBar from './NavBar';
import Footer from './Footer';
import API_BASE_URL from '../config';

// Hero Component (Part of Blog page)
const Hero = () => {
  return (
    <section className="blog-hero" role="banner" tabIndex={0}>
      <div className="blog-hero-text">
        Bring the auspicious into your life today!
      </div>
      <Link to="/shop">
        <button className="blog-hero-button" type="button" tabIndex={0}>
          SHOP NOW
        </button>
      </Link>
    </section>
  );
};

// Main Blog Component
const Blog = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    axios.get(`${API_BASE_URL}/api/cms/blogs`)
      .then(res => {
        if (res.data.length === 0) {
          Swal.fire("No Blog Posts Found", "Please check back later.", "info");
        }
        setBlogs(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching blogs:", err);
        Swal.fire("Error", "Failed to fetch blogs", "error");
        setLoading(false);
      });
  }, []);
  
  return (
    <div className="blog-page">
      <NavBar />
      <Hero />
      
      <div className="container-fluid px-4 px-lg-5">
        <div className="blog-section-header text-center mb-5">
          <h2>BLOG</h2>
          <p>Latest insights on Feng Shui and wellness</p>
        </div>
        
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : (
          <div className="row justify-content-center g-4">
            {blogs.map(blog => (
              <div className="col-sm-6 col-md-4 col-lg-3 px-3" key={blog.blogID}>
                <div className="card h-100 shadow-sm border-0 rounded-3">
                  <div className="card-img-wrapper">
                    <img
                      src={blog.cover_image}
                      className="card-img-top rounded-top"
                      alt="Blog Cover"
                    />
                  </div>
                  <div className="card-body d-flex flex-column p-3">
                    <h5 className="card-title text-dark mb-2">
                      {blog.title}
                    </h5>
                    <p className="card-subtitle text-muted small mb-2">
                      {blog.category} • {new Date(blog.publish_date).toLocaleDateString()}
                    </p>
                    <p className="card-text text-muted mb-3">
                      {blog.content.substring(0, 80)}...
                    </p>
                    <Link
                      to={`/blog/${blog.blogID}`}
                      className="blog-read-more-btn mt-auto"
                    >
                      Read More
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <Footer />
    </div>
  );
};

export default Blog; 