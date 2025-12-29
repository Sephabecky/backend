import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

/* 🔹 SAFE TRANSPORTER (CREATED ONLY WHEN NEEDED) */
let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      connectionTimeout: 10000
    });
  }
  return transporter;
}

/* 🔹 CONTACT ROUTE */
app.post("/api/contact", async (req, res) => {
  try {
    const {
      fullName,
      phone,
      email,
      subject,
      message
    } = req.body;

    // ✅ Proper validation
    if (!fullName || !phone || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    // ✅ Save to MongoDB
    const newContact = new Contact({
      fullName,
      phone,
      email,
      subject,
      message
    });

    await newContact.save();

    console.log("📩 Contact message saved:", newContact);

    // ✅ Success response
    res.status(201).json({
      success: true,
      message: "Saved successfully"
    });

  } catch (error) {
    console.error("❌ Contact error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});
  try {
    const mailer = getTransporter();

    await mailer.sendMail({
      from: `"Aaron Agronomy Website" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: `New Farmer Message: ${subject}`,
      html: `
        <p><b>Name:</b> ${fullName}</p>
        <p><b>Phone:</b> ${phonenumber}</p>
        <p><b>Email:</b> ${emailaddress|| "Not provided"}</p>
        <p><b>Message:</b><br>${message}</p>
      `
    });

    res.json({ message: "Message sent successfully" });

  } catch (error) {
    console.error("EMAIL ERROR:", error.message);
    res.status(500).json({
      message: "Email service temporarily unavailable"
    });
  }
});

/* 🔹 RENDER PORT (VERY IMPORTANT) */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});



