import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
const mongoURI = process.env.MONGODB_URI;
mongoose
  .connect(mongoURI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// Farm Assessment Schema
const farmAssessmentSchema = new mongoose.Schema({
  assessmentType: String,
  farmName: String,
  farmLocation: String,
  farmSize: String,
  farmAge: String,
  crops: [String],
  livestock: String,
  currentIssues: String,
  fullName: String,
  phone: String,
  email: String,
  idNumber: String,
  registeredFarmer: String,
  preferredDate: String,
  additionalInfo: String,
  terms: Boolean,
  newsletter: Boolean,
}, { timestamps: true });

const FarmAssessment = mongoose.model("FarmAssessment", farmAssessmentSchema);

// Nodemailer setup
const transporter = nodemailer.createTransport({
  service: "gmail", // or your preferred email service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // use app password if Gmail
  },
});

// POST route to submit farm assessment
app.post("/assessment/submit", async (req, res) => {
  try {
    const assessmentData = req.body;

    // Save to MongoDB
    const newAssessment = new FarmAssessment(assessmentData);
    await newAssessment.save();

    // Send email notification
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // send to yourself
      subject: "New Farm Assessment Submitted",
      html: `
        <h3>New Farm Assessment Submitted</h3>
        <p><strong>Farmer Name:</strong> ${assessmentData.fullName}</p>
        <p><strong>Farm Name:</strong> ${assessmentData.farmName}</p>
        <p><strong>Location:</strong> ${assessmentData.farmLocation}</p>
        <p><strong>Size:</strong> ${assessmentData.farmSize}</p>
        <p><strong>Crops:</strong> ${assessmentData.crops.join(", ")}</p>
        <p><strong>Phone:</strong> ${assessmentData.phone}</p>
        <p><strong>Email:</strong> ${assessmentData.email}</p>
        <p><strong>Additional Info:</strong> ${assessmentData.additionalInfo}</p>
      `
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error("❌ Email error:", err);
      } else {
        console.log("📧 Email sent:", info.response);
      }
    });

    // Send response to frontend
    res.status(201).json({
      success: true,
      message: "Assessment submitted successfully",
      referenceNumber: "ASS-" + Date.now().toString().slice(-8),
      requestId: newAssessment._id
    });

  } catch (error) {
    console.error("❌ Assessment submission error:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Test route
app.get("/", (req, res) => res.send("Backend is running ✅"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
