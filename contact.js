import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

import contactRoutes from "./models/contact.js"; // adjust path if needed

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Use contact routes
app.use("/api", contactRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
