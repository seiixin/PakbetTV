import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import './BlogDetail.css';
import NavBar from './NavBar';
import Footer from './Footer';
import API_BASE_URL from '../config';

const BlogDetail = () => {
  const { blogID } = useParams();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [relatedBlogs, setRelatedBlogs] = useState([]);

  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
    
    // Load the specific blog
    setLoading(true);
    axios.get(`${API_BASE_URL}/api/cms/blogs/${blogID}`)
      .then(res => {
        setBlog(res.data);
        
        // After getting blog details, fetch related blogs
        return axios.get(`${API_BASE_URL}/api/cms/blogs?category=${res.data.category}&limit=3`);
      })
      .then(res => {
        // Filter out the current blog from related blogs
        const filtered = res.data.filter(relatedBlog => relatedBlog.blogID !== Number(blogID));
        setRelatedBlogs(filtered.slice(0, 3)); // Limit to 3 related blogs
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching blog:", err);
        setError('Failed to load the blog');
        setLoading(false);
      });
  }, [blogID]);

  if (loading) {
    return (
      <div className="blog-detail-page">
        <NavBar />
        <div className="container text-center py-5 mt-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="blog-detail-page">
        <NavBar />
        <div className="container py-5 mt-5">
          <div className="alert alert-danger">{error || "Blog not found"}</div>
          <Link to="/blog" className="btn btn-primary">
            Back to Blogs
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="blog-detail-page">
      <NavBar />
      
      <div className="blog-detail-header">
        <div className="container">
          <h1>{blog.title}</h1>
          <div className="blog-meta">
            <span className="blog-category">{blog.category}</span>
            <span className="blog-date">{new Date(blog.publish_date).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</span>
          </div>
        </div>
      </div>
      
      <div className="container py-5 blog-detail-container">
        <div className="row g-5">
          <div className="col-lg-6">
            <img
              src={blog.cover_image}
              alt={blog.title}
              className="img-fluid rounded shadow blog-detail-image"
            />
          </div>
          <div className="col-lg-6">
            <div className="blog-content">
              {blog.content.split('\n').map((paragraph, i) => (
                paragraph.trim() && <p key={i}>{paragraph.trim()}</p>
              ))}
            </div>
            
            <div className="blog-share mt-4">
              <h5>Share this article</h5>
              <div className="social-icons">
                <a href={`https://www.facebook.com/sharer/sharer.php?u=${window.location.href}`} target="_blank" rel="noopener noreferrer" className="social-icon facebook">
                  <i className="bi bi-facebook"></i>
                </a>
                <a href={`https://twitter.com/intent/tweet?url=${window.location.href}&text=${blog.title}`} target="_blank" rel="noopener noreferrer" className="social-icon twitter">
                  <i className="bi bi-twitter"></i>
                </a>
                <a href={`https://www.linkedin.com/shareArticle?mini=true&url=${window.location.href}`} target="_blank" rel="noopener noreferrer" className="social-icon linkedin">
                  <i className="bi bi-linkedin"></i>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {relatedBlogs.length > 0 && (
        <div className="related-blogs-section">
          <div className="container">
            <h3 className="related-blogs-title">Related Articles</h3>
            <div className="row g-4">
              {relatedBlogs.map(relatedBlog => (
                <div className="col-md-4" key={relatedBlog.blogID}>
                  <div className="card h-100 shadow-sm border-0">
                    <img 
                      src={relatedBlog.cover_image} 
                      className="card-img-top" 
                      alt={relatedBlog.title} 
                    />
                    <div className="card-body">
                      <h5 className="card-title">{relatedBlog.title}</h5>
                      <p className="card-text">{relatedBlog.content.substring(0, 100)}...</p>
                      <Link to={`/blog/${relatedBlog.blogID}`} className="blog-read-more-btn">
                        Read More
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      <div className="container text-center py-4">
        <Link to="/blog" className="back-to-blogs-btn">
          Back to All Blogs
        </Link>
      </div>
      
      <Footer />
    </div>
  );
};

export default BlogDetail; 