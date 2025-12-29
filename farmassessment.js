import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log("MongoDB connected"))
.catch(err => console.error("MongoDB connection error:", err));

// Schema
const assessmentSchema = new mongoose.Schema({
    referenceNumber: String,
    assessmentType: String,
    farmName: String,
    farmLocation: String,
    farmSize: Number,
    farmAge: Number,
    crops: [String],
    livestock: String,
    currentIssues: String,
    fullName: String,
    phone: String,
    email: String,
    idNumber: String,
    registeredFarmer: String,
    preferredDate: Date,
    additionalInfo: String,
    terms: Boolean,
    newsletter: Boolean,
    submissionDate: { type: Date, default: Date.now }
});

const Assessment = mongoose.model("Assessment", assessmentSchema);

// Nodemailer setup
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER, // Your email
        pass: process.env.EMAIL_PASS  // App password or email password
    }
});

// Routes
app.get("/", (req, res) => {
    res.send("Farm Assessment Backend is running");
});

// Submit assessment
app.post("/assessment/submit", async (req, res) => {
    try {
        const data = req.body;

        // Generate reference number if not provided
        const refNumber = data.referenceNumber || "ASS-" + Date.now().toString().slice(-8);
        data.referenceNumber = refNumber;

        // Save to MongoDB
        const assessment = new Assessment(data);
        await assessment.save();

        // Send email to admin
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.ADMIN_EMAIL, // Admin email
            subject: `New Farm Assessment Request: ${refNumber}`,
            html: `
                <h2>New Farm Assessment Request</h2>
                <p><strong>Reference Number:</strong> ${refNumber}</p>
                <p><strong>Assessment Type:</strong> ${data.assessmentType}</p>
                <p><strong>Farm Name:</strong> ${data.farmName}</p>
                <p><strong>Farm Location:</strong> ${data.farmLocation}</p>
                <p><strong>Farm Size:</strong> ${data.farmSize} acres</p>
                <p><strong>Crops:</strong> ${data.crops.join(", ")}</p>
                <p><strong>Full Name:</strong> ${data.fullName}</p>
                <p><strong>Phone:</strong> ${data.phone}</p>
                <p><strong>Email:</strong> ${data.email || "Not provided"}</p>
                <p><strong>Preferred Date:</strong> ${data.preferredDate || "Not specified"}</p>
                <p><strong>Additional Info:</strong> ${data.additionalInfo || "None"}</p>
            `
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error("Email error:", error);
            } else {
                console.log("Email sent:", info.response);
            }
        });

        res.json({ success: true, referenceNumber: refNumber, requestId: assessment._id });
    } catch (err) {
        console.error("Submission error:", err);
        res.status(500).json({ success: false, error: "Failed to submit assessment" });
    }
});

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
