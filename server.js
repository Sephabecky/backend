import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import fs from "fs";
import validator from "validator";
import { Resend } from "resend";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

/* ======================= BASIC SETUP ======================= */

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("✅ Aaron Agronomy Backend is Live");
});

/* ======================= EMAIL (RESEND) ======================= */

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmail({ to, subject, html }) {
  try {
    await resend.emails.send({
      from: "Aaron Agronomy <onboarding@resend.dev>",
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error("EMAIL ERROR:", err.message);
  }
}

/* ======================= DATABASE (JSON) ======================= */

const DB_FILE = "./database.json";

let database = {
  users: [],
  farmers: [],
  contacts: [],
};

if (fs.existsSync(DB_FILE)) {
  database = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

function saveDB() {
  fs.writeFileSync(DB_FILE, JSON.stringify(database, null, 2));
}

/* ======================= AUTH MIDDLEWARE ======================= */

function authenticateToken(req, res, next) {
  const auth = req.headers.authorization;
  const token = auth && auth.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Token required" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user;
    next();
  });
}

function authorizeRole(roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied" });
    }
    next();
  };
}

/* ======================= AUTH ROUTES ======================= */

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  const user = database.users.find(u => u.email === email);
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({
    success: true,
    token,
    role: user.role,
    name: user.name,
  });
});

/* ======================= FARMER REGISTRATION ======================= */

app.post("/api/farmer/register", async (req, res) => {
  const { name, email, password, phone, location } = req.body;

  if (!name || !email || !password || !phone || !location) {
    return res.status(400).json({ error: "All fields required" });
  }

  if (!validator.isEmail(email)) {
    return res.status(400).json({ error: "Invalid email" });
  }

  if (database.users.some(u => u.email === email)) {
    return res.status(400).json({ error: "Email already exists" });
  }

  const hashed = await bcrypt.hash(password, 10);
  const id = Date.now().toString();

  database.users.push({
    id,
    name,
    email,
    password: hashed,
    role: "farmer",
  });

  database.farmers.push({
    id,
    name,
    phone,
    location,
    createdAt: new Date().toISOString(),
  });

  saveDB();

  await sendEmail({
    to: email,
    subject: "Welcome to Aaron Agronomy 🌱",
    html: `<h2>Welcome ${name}</h2><p>Your account was created successfully.</p>`,
  });

  res.json({ success: true });
});

/* ======================= DASHBOARDS ======================= */

app.get(
  "/api/farmer/dashboard",
  authenticateToken,
  authorizeRole(["farmer"]),
  (req, res) => {
    res.json({ message: "Farmer dashboard data" });
  }
);

app.get(
  "/api/agronomist/dashboard",
  authenticateToken,
  authorizeRole(["agronomist"]),
  (req, res) => {
    res.json({ message: "Agronomist dashboard data" });
  }
);

app.get(
  "/api/admin/dashboard",
  authenticateToken,
  authorizeRole(["admin"]),
  (req, res) => {
    res.json({
      users: database.users.length,
      farmers: database.farmers.length,
    });
  }
);

/* ======================= CONTACT FORM ======================= */

app.post("/api/contact", async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: "All fields required" });
  }

  database.contacts.push({
    name,
    email,
    message,
    date: new Date().toISOString(),
  });

  saveDB();

  await sendEmail({
    to: process.env.ADMIN_EMAIL || email,
    subject: "New Contact Message",
    html: `<p><b>Name:</b> ${name}</p><p>${message}</p>`,
  });

  res.json({ success: true });
});

/* ======================= DEMO USERS ======================= */

if (database.users.length === 0) {
  database.users.push(
    {
      id: "1",
      name: "Farmer Demo",
      email: "farmer@demo.com",
      password: bcrypt.hashSync("123456", 10),
      role: "farmer",
    },
    {
      id: "2",
      name: "Agronomist Demo",
      email: "agro@demo.com",
      password: bcrypt.hashSync("123456", 10),
      role: "agronomist",
    },
    {
      id: "3",
      name: "Admin Demo",
      email: "admin@demo.com",
      password: bcrypt.hashSync("123456", 10),
      role: "admin",
    }
  );
  saveDB();
}

/* ======================= START SERVER ======================= */

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
