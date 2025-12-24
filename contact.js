
import express from "express";
import nodemailer from "nodemailer";
import axios from "axios";

console.log("server starting");

const router = express.Router();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

router.post("/", async (req, res) => {
  const { name, phone, email, subject, message } = req.body;

  if (!name || !phone || !message) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    await transporter.sendMail({
      from: `"Aaron Agronomy Website" <${process.env.EMAIL_USER}>`,
      to: process.env.OWNER_EMAIL,
      subject: subject || "New Contact Message",
      html: `
        <h3>New Contact Message</h3>
        <p><b>Name:</b> ${name}</p>
        <p><b>Phone:</b> ${phone}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Message:</b><br>${message}</p>
      `
    });

    // SMS (Termii)
    await axios.post("https://api.ng.termii.com/api/sms/send", {
      to: process.env.OWNER_PHONE,
      from: "Agronomy",
      sms: `New message from ${name}, phone: ${phone}`,
      type: "plain",
      channel: "generic",
      api_key: process.env.TERMII_API_KEY
    });

    res.json({ success: true, message: "Message sent successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

export default router;

