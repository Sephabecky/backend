// Update the contact form submission in your HTML/JS
document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.getElementById('contactForm');
    const successMessage = document.getElementById('successMessage');
    
    // Initialize form submission
    contactForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Clear previous error messages
        clearErrorMessages();
        
        // Validate form
        if (validateForm()) {
            // Show loading state
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            submitBtn.disabled = true;
            
            // Collect form data
            const formData = {
               Fullname: document.getElementById('contactName').value.trim(),
                phonenumber: document.getElementById('contactPhone').value.trim(),
                emailaddress: document.getElementById('contactEmail').value.trim() || 'Not provided',
                subject: document.getElementById('contactSubject').value,
                message: document.getElementById('contactMessage').value.trim(),
                terms: document.getElementById('contactTerms').checked
            };
            
            try {
                // Send to backend API
                const response = await fetch("https://agronomy-backend-ehk1.onrender.com", {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });
                
                const data = await response.json();
                
                if (data.success) {
                    // Show success message
                    successMessage.style.display = 'block';
                    
                    // Update success message with server response
                    successMessage.querySelector('h4').textContent = 'Message Sent Successfully!';
                    successMessage.querySelector('p').textContent = data.message;
                    
                    // Reset form
                    contactForm.reset();
                    
                    // Scroll to success message
                    successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    // Hide success message after 10 seconds
                    setTimeout(() => {
                        successMessage.style.display = 'none';
                    }, 10000);
                } else {
                    // Show error from server
                    showError('formError', data.error || 'Failed to send message');
                }
            } catch (error) {
                console.error('Submission error:', error);
                showError('formError', 'Network error. Please check your connection and try again.');
                
                // Fallback: Save to localStorage if API fails
                saveContactMessage(formData);
            } finally {
                // Restore button state
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        }

const express = require("express");
const nodemailer = require("nodemailer");
const axios = require("axios"); // for SMS
const router = express.Router();

/* ================= EMAIL SETUP ================= */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/* ================= CONTACT ROUTE ================= */
router.post("/", async (req, res) => {
  const { name, phone, email, subject, message } = req.body;

  try {
    /* ---------- SEND EMAIL ---------- */
    await transporter.sendMail({
      from: `"Website Contact" <${process.env.EMAIL_USER}>`,
      to: process.env.OWNER_EMAIL,
      subject: subject || "New Contact Message",
      html: `
        <h2>New Contact Message</h2>
        <p><b>FullName:</b> ${name}</p>
        <p><b>Phonenumber:</b> ${phone}</p>
        <p><b>Emailaddress:</b> ${email}</p>
        <p><b>Message:</b><br>${message}</p>
      `
    });

    /* ---------- SEND SMS (TERMII) ---------- */
    await axios.post("https://api.ng.termii.com/api/sms/send", {
      to: process.env.OWNER_PHONE,
      from: "Agronomy",
      sms: `New message from ${name}. Phone: ${phone}`,
      type: "plain",
      channel: "generic",
      api_key: process.env.TERMII_API_KEY
    });

    res.json({
      success: true,
      message: "Message sent successfully"
    });

  } catch (error) {
    console.error("CONTACT ERROR:", error);
    res.status(500).json({
      success: false,
      error: "Failed to send message"
    });
  }
});

module.exports = router;
    });
    
    
    // Add emergency contact functionality
    const emergencyLinks = document.querySelectorAll('a[href^="tel:"]');
    emergencyLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // You could log emergency calls
            console.log('Emergency call initiated to:', this.href);
            // Could send analytics or notification
        });
    });
    
    // WhatsApp link enhancement
    const whatsappLinks = document.querySelectorAll('a[href*="whatsapp"]');
    whatsappLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // Log WhatsApp interactions
            console.log('WhatsApp chat initiated');
        });
    });
    
    // Helper functions
    function validateForm() {
        let isValid = true;
        
        // Validate name
        const name = document.getElementById('contactName').value.trim();
        if (!name) {
            showError('nameError', 'Full name is required');
            isValid = false;
        } else if (name.length < 2) {
            showError('nameError', 'Name must be at least 2 characters');
            isValid = false;
        }
        
        // Validate phone
        const phone = document.getElementById('contactPhone').value.trim();
        if (!phone) {
            showError('phoneError', 'Phone number is required');
            isValid = false;
        } else if (!isValidPhone(phone)) {
            showError('phoneError', 'Please enter a valid phone number');
            isValid = false;
        }
        
        // Validate email (optional but must be valid if provided)
        const email = document.getElementById('contactEmail').value.trim();
        if (email && !isValidEmail(email)) {
            showError('emailError', 'Please enter a valid email address');
            isValid = false;
        }
        
        // Validate subject
        const subject = document.getElementById('contactSubject').value;
        if (!subject) {
            showError('subjectError', 'Please select a subject');
            isValid = false;
        }
        
        // Validate message
        const message = document.getElementById('contactMessage').value.trim();
        if (!message) {
            showError('messageError', 'Message is required');
            isValid = false;
        } else if (message.length < 10) {
            showError('messageError', 'Message must be at least 10 characters');
            isValid = false;
        }
        
        // Validate terms
        const terms = document.getElementById('contactTerms').checked;
        if (!terms) {
            showError('termsError', 'You must accept the terms and conditions');
            isValid = false;
        }
        
        return isValid;
    }
    
    function isValidPhone(phone) {
        const phoneRegex = /^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/;
        return phoneRegex.test(phone) && phone.length >= 9;
    }
    
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    function showError(elementId, message) {
        const errorElement = document.getElementById(elementId);
        if (errorElement) {
            errorElement.textContent = message;
        } else {
            // Create a general form error container if it doesn't exist
            let formError = document.getElementById('formError');
            if (!formError) {
                formError = document.createElement('div');
                formError.id = 'formError';
                formError.className = 'error-message';
                formError.style.marginBottom = '20px';
                formError.style.padding = '15px';
                formError.style.backgroundColor = '#f8d7da';
                formError.style.color = '#721c24';
                formError.style.borderRadius = '5px';
                contactForm.insertBefore(formError, contactForm.firstChild);
            }
            formError.textContent = message;
        }
    }
    
    function clearErrorMessages() {
        const errorElements = document.querySelectorAll('.error-message');
        errorElements.forEach(element => {
            element.textContent = '';
        });
    }
    
    function saveContactMessage(formData) {
        // Get existing messages
        const messages = JSON.parse(localStorage.getItem('contactMessages') || '[]');
        
        // Add new message
        messages.push({
            id: Date.now(),
            ...formData,
            timestamp: new Date().toISOString(),
            status: 'pending-sync'
        });
        
        // Save to localStorage
        localStorage.setItem('contactMessages', JSON.stringify(messages));
        
        console.log('Contact message saved locally:', formData);
        
        // Show offline message
        const offlineMessage = document.createElement('div');
        offlineMessage.style.cssText = `
            background-color: #fff3cd;
            color: #856404;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
            border: 1px solid #ffeaa7;
        `;
        offlineMessage.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <strong> Message saved offline.</strong>
            <p style="margin: 5px 0 0 0; font-size: 0.9em;">
                Your message has been saved and will be sent when you're back online.
            </p>
        `;
        contactForm.insertBefore(offlineMessage, contactForm.firstChild);
    }
    
    // Smooth scroll to form
    document.querySelectorAll('a[href="#contactForm"]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            document.getElementById('contactForm').scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
        });
    });
    
    // Real-time phone number formatting
    const phoneInput = document.getElementById('contactPhone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            let value = this.value.replace(/\D/g, '');
            
            if (value.length > 0) {
                // Format for Kenya numbers
                if (value.startsWith('254')) {
                    value = '+' + value;
                } else if (value.startsWith('0')) {
                    value = '+254' + value.substring(1);
                } else if (value.length <= 9) {
                    value = '+254' + value;
                }
                
                // Add formatting
                if (value.length > 4) {
                    value = value.replace(/(\+254)(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4');
                }
            }
this.value = value;

            //sending messages and emails
            const express = require("express");
const router = express.Router();

router.post("/", (req, res) => {
  console.log("CONTACT MESSAGE:", req.body);

  res.json({
    success: true,
    message: "Message received"
  });
});

module.exports = router;
            
            
        });
    }
});


