import React, { useRef } from "react";
import emailjs from "emailjs-com";
import Swal from "sweetalert2";
import NavBar from "./NavBar";
import Footer from "./Footer";
import { MailIcon, PhoneIcon, UserIcon, MessageSquareIcon } from "lucide-react";

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
      <div className="flex items-center justify-center px-4 py-12" style={{
        marginTop: "150px",
  }}>
         <div className="w-full rounded-2xl shadow-2xl p-10 md:p-14 space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-red-600 tracking-tight">
              Contact Us
            </h2>
            <p className="mt-2 text-gray-600 text-sm sm:text-base">
              Need help or have a question? We're just a message away!
            </p>
          </div>

          <form
            ref={form}
            onSubmit={sendEmail}
            className="space-y-6"
            noValidate
          >
            {/* Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-800 mb-1"
              >
                Name *
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-white w-4 h-4" />
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="John Doe"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-red-600 text-white rounded-md placeholder-white focus:outline-none focus:ring-2 focus:ring-red-800 transition"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-800 mb-1"
              >
                Email *
              </label>
              <div className="relative">
                <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-white w-4 h-4" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-red-600 text-white rounded-md placeholder-white focus:outline-none focus:ring-2 focus:ring-red-800 transition"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-800 mb-1"
              >
                Phone *
              </label>
              <div className="relative">
                <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-white w-4 h-4" />
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="09123456789"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-red-600 text-white rounded-md placeholder-white focus:outline-none focus:ring-2 focus:ring-red-800 transition"
                />
              </div>
            </div>

            {/* Message */}
            <div>
              <label
                htmlFor="message"
                className="block text-sm font-medium text-gray-800 mb-1"
              >
                Message *
              </label>
              <div className="relative">
                <MessageSquareIcon className="absolute left-3 top-4 text-white w-4 h-4" />
                <textarea
                  id="message"
                  name="message"
                  rows="5"
                  placeholder="Type your message here..."
                  required
                  className="w-full pl-10 pr-4 py-3 bg-red-600 text-white rounded-md placeholder-white resize-y min-h-[120px] max-h-60 focus:outline-none focus:ring-2 focus:ring-red-800 transition"
                  style={{ scrollbarColor: "#dc2626 transparent" }}
                ></textarea>
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-center mb-5 mt-5">
            <button
  type="submit"
  className="text-white px-10 py-3mt-5 rounded-md text-sm sm:text-base font-semibold hover:bg-red-700 transition transform hover:scale-105 duration-200"
  style={{
    backgroundColor: "#dc2626",
    color: "white",
    padding: "10px 20px",
    borderRadius: "5px",
    fontSize: "16px",
  }}
>
  Send Message
</button>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default ContactForm;
