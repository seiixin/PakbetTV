import React, { useRef } from "react";
import emailjs from "emailjs-com";
import Swal from "sweetalert2";
import NavBar from "./NavBar";
import Footer from "./Footer";
import { MailIcon, PhoneIcon, UserIcon, MessageSquareIcon } from "lucide-react";
import "./Contact.css";

const ContactForm = () => {
  const form = useRef();

  const sendEmail = (e) => {
    e.preventDefault();

    if (!form.current.checkValidity()) {
      form.current.reportValidity();
      return;
    }

    emailjs
      .sendForm(
        "service_fu7zh7l",
        "template_1i8zflb",
        form.current,
        "ttGDqPOSWJ6FIiB5P"
      )
      .then(
        () => {
          Swal.fire({
            icon: "success",
            title: "Message Sent!",
            text: "We will get back to you shortly.",
            confirmButtonColor: "#dc2626",
          });
          form.current.reset();
        },
        (error) => {
          Swal.fire({
            icon: "error",
            title: "Failed to send",
            text: "Something went wrong. Please try again later.",
            confirmButtonColor: "#dc2626",
          });
          console.error("EmailJS error:", error);
        }
      );
  };

  return (
    <>
      <NavBar />
      <div className="contact-hero-section">
        <div className="contact-hero-content">
          <h1>Contact Us</h1>
          <p>Get in touch with us for any questions or concerns</p>
        </div>
      </div>

      <div className="contact-container">
        <div className="contact-form-wrapper">
          <form ref={form} onSubmit={sendEmail} className="contact-form" noValidate>
            {/* Name */}
            <div className="form-group">
              <label htmlFor="name" className="form-label">
                Name *
              </label>
              <div className="input-wrapper">
                <UserIcon className="input-icon" />
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="John Doe"
                  required
                  className="form-input"
                />
              </div>
            </div>

            {/* Email */}
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email *
              </label>
              <div className="input-wrapper">
                <MailIcon className="input-icon" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  className="form-input"
                />
              </div>
            </div>

            {/* Phone */}
            <div className="form-group">
              <label htmlFor="phone" className="form-label">
                Phone *
              </label>
              <div className="input-wrapper">
                <PhoneIcon className="input-icon" />
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="09123456789"
                  required
                  className="form-input"
                />
              </div>
            </div>

            {/* Message */}
            <div className="form-group">
              <label htmlFor="message" className="form-label">
                Message *
              </label>
              <div className="input-wrapper">
                <MessageSquareIcon className="input-icon textarea-icon" />
                <textarea
                  id="message"
                  name="message"
                  rows="5"
                  placeholder="Type your message here..."
                  required
                  className="form-textarea"
                ></textarea>
              </div>
            </div>

            {/* Submit */}
            <div className="submit-wrapper">
              <button type="submit" className="submit-button">
                Send Message
              </button>
            </div>
          </form>
        </div>
      </div>
      <Footer forceShow={false} />
    </>
  );
};

export default ContactForm;
