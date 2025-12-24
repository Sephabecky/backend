
import nodemailer from "nodemailer";
import express from "express";

const router = express.Router();

const transporter = nodemailer.createTransport({
  host:"smtp.gmail.com",
  port:587,
  secure:false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
});

router.post("/", async (req, res) => {
  const { name, phone, email, subject, message } = req.body;

  console.log("CONTACT ROUTE HIT:", req.body);

  // ✅ DEBUG ENV (BACKEND ONLY)
  console.log("EMAIL ENV CHECK:", {
    user: process.env.EMAIL_USER,
    passExists: !!process.env.EMAIL_PASS,
    owner: process.env.OWNER_EMAIL
  });

  try {
    await transporter.sendMail({
      from: `"Aaron Agronomy Website" <${process.env.EMAIL_USER}>`,
      to: process.env.OWNER_EMAIL,
      subject: subject || "New Contact Message",
      html: `
        <p><b>Name:</b> ${name}</p>
        <p><b>Phone:</b> ${phone}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Message:</b><br/>${message}</p>
      `
    });
    
transporter.verify((error, success) => {
  if (error) {
    console.error("SMTP VERIFY ERROR:", error);
  } else {
    console.log("SMTP READY");
  }
});
    console.log("EMAIL SENT SUCCESSFULLY");

    res.json({ success: true });
  } catch (error) {
    console.error("EMAIL ERROR:", error);
    res.status(500).json({ success: false });
  }
});

export default router;

