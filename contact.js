// models/contact.js
import express from "express";
import mongoose from "mongoose";

const router = express.Router();

/* ================= CONTACT SCHEMA ================= */
const contactSchema = new mongoose.Schema(
  {
    fullname: { type: String, required: true },
    phonenumber: { type: String, required: true },
    emailaddress: { type: String, default: "Not provided" },
    subject: { type: String, required: true },
    message: { type: String, required: true },
  },
  { timestamps: true }
);

const Contact = mongoose.model("Contact", contactSchema);

/* ================= CONTACT ROUTE ================= */
router.post("/contact", async (req, res) => {
  try {
    const { fullname, phonenumber, emailaddress, subject, message } = req.body;

    // Validate required fields
    if (!fullname || !phonenumber || !subject || !message) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Create new contact document
    const newContact = new Contact({
      fullname,
      phonenumber,
      emailaddress,
      subject,
      message,
    });

    await newContact.save();

    res.status(201).json({ message: "Message saved successfully" });
  } catch (error) {
    console.error("❌ Contact error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;


