import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "./models/User.js";

dotenv.config();

const app = express();

/* ================= MIDDLEWARE ================= */
app.use(cors());
app.use(express.json());

/* ================= MONGODB CONNECTION ================= */
const mongoURI = process.env.MONGODB_URI;

if (!mongoURI) {
  console.error("❌ MONGODB_URI is missing");
  process.exit(1);
}

mongoose
  .connect(mongoURI)
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

/* ================= SCHEMA ================= */
const contactSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    subject: { type: String, required: true },
    message: { type: String, required: true },
  },
  { timestamps: true }
);

const Contact = mongoose.model("Contact", contactSchema);

/* ================= ROUTES ================= */
app.get("/", (req, res) => {
  res.send("Aaron Agronomy Backend is running ✅");
});

/* ✅ FIXED ROUTE */
app.post("/api/contact", async (req, res) => {
  try {
    const { fullName, phone, email, subject, message } = req.body;

    if (!fullName || !phone || !subject || !message) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const newContact = new Contact({
      fullName,
      phone,
      email,
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
/* ================= LOGINS ================= */


app.post("/api/register", async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phoneNumber,
      location,
      password,
      confirmPassword,
    } = req.body;

    // 1. Check passwords
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // 2. Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Save user
    const user = await User.create({
      firstName,
      lastName,
      email,
      phoneNumber,
      location,
      password: hashedPassword,
    });

    res.status(201).json({
      message: "Registration successful",
      userId: user._id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});
export default mongoose.model("User", userSchema);
/* =================USERSCHEMA================= */
const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    location: { type: String },
    password: { type: String, required: true },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

/* ================= SERVER ================= */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});



