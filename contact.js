import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import mongoose from "mongoose";
import Contact from "./models/Contact.js"; // ✅ make sure this exists

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

/* 🔹 MONGODB CONNECTION */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));

/* 🔹 SAFE MAIL TRANSPORTER */
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
      }
    });
  }
  return transporter;
}

/* 🔹 CONTACT ROUTE */
app.post("/api/contact", async (req, res) => {
  try {
    const { fullName, phone, email, subject, message } = req.body;

    // ✅ Validation
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
    console.log("📩 Contact saved:", newContact);

    // ✅ Send email
    const mailer = getTransporter();
    await mailer.sendMail({
      from: `"Aaron Agronomy Website" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: `New Farmer Message: ${subject}`,
      html: `
        <p><b>Name:</b> ${fullName}</p>
        <p><b>Phone:</b> ${phone}</p>
        <p><b>Email:</b> ${email || "Not provided"}</p>
        <p><b>Message:</b><br>${message}</p>
      `
    });

    // ✅ Single success response
    res.status(201).json({
      success: true,
      message: "Message sent and saved successfully"
    });

  } catch (error) {
    console.error("❌ Contact error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

/* 🔹 PORT (RENDER COMPATIBLE) */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
