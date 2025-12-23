// server.js - Combined Backend for All Systems
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const validator = require('validator');
//const contactRoutes=require("./contact");

const app = express();
app.use(express.json());
//app.use("/contact",require("./contact"));

const PORT = process.env.PORT || 3001;


// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get("/",(req,res)=>{
  res.send("Agronomy backend is live");
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|pdf|doc|docx/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image, PDF, and Word documents are allowed'));
  }
});

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-email-password'
  }
});

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SALT_ROUNDS = 10;

// Database File Path
const DB_FILE = 'database.json';

// Initialize Database
let database = {
  users: [],
  farmers: [],
  agronomists: [],
  farmOrders: [],
  agronomistReports: [],
  sales: [],
  scheduledVisits: [],
  contactMessages: [],
  assessmentRequests: [],
  newsletterSubscribers: []
};

// Load database from file if exists
function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      database = JSON.parse(data);
      console.log('Database loaded successfully');
    }
  } catch (error) {
    console.error('Error loading database:', error);
  }
}

// Save database to file
function saveDatabase() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(database, null, 2));
    console.log('Database saved successfully');
  } catch (error) {
    console.error('Error saving database:', error);
  }
}

// Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }
    req.user = user;
    next();
  });
}

// Role-based Authorization Middleware
function authorizeRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
  };
}

// ==================== 1. AUTHENTICATION & USER MANAGEMENT ====================

// Login Route
app.post('/api/login', async (req, res) => {
  console.log("LOGIN HIT");
  console.log(req.body);
  try {
    const { email, password, role } = req.body;
    
    // Find user
    const user = database.users.find(u => u.email === email && u.role === role);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        name: user.name 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Update last login
    user.lastLogin = new Date().toISOString();
    saveDatabase();

    // Return user data (excluding password) and token
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      success: true,
      token,
      user: userWithoutPassword
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// Logout Route
app.post('/api/logout', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// ==================== 2. FARMER REGISTRATION & MANAGEMENT ====================

// Farmer Registration
app.post('/api/farmer/register', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      idNumber,
      password,
      confirmPassword,
      farmName,
      farmLocation,
      farmSize,
      farmAge,
      crops,
      livestock,
      irrigation,
      farmGoals,
      newsletter,
      shareInfo,
      terms
    } = req.body;

    // Validation
    const errors = validateRegistration(req.body);
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        errors
      });
    }

    // Check if email already exists
    const emailExists = database.users.some(user => user.email === email);
    if (emailExists) {
      return res.status(400).json({
        success: false,
        error: 'Email already registered. Please login instead.'
      });
    }

    // Generate IDs
    const userId = Date.now().toString();
    const farmerId = `FARM-${Date.now().toString().slice(-8)}`;
    const accountId = farmerId;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user object
    const newUser = {
      id: userId,
      email,
      password: hashedPassword,
      role: 'farmer',
      name: `${firstName} ${lastName}`,
      createdAt: new Date().toISOString(),
      lastLogin: null,
      status: 'active'
    };

    // Create farmer object
    const newFarmer = {
      id: userId,
      farmerId,
      accountId,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      email,
      phone,
      idNumber: idNumber || null,
      farmDetails: {
        name: farmName || null,
        location: farmLocation,
        size: parseFloat(farmSize),
        age: farmAge ? parseInt(farmAge) : null,
        crops: Array.isArray(crops) ? crops : crops.split(','),
        livestock: livestock || null,
        irrigation: irrigation || null,
        goals: farmGoals || null
      },
      preferences: {
        newsletter: newsletter || false,
        shareInfo: shareInfo || false
      },
      registrationDate: new Date().toISOString(),
      lastLogin: null,
      status: 'active',
      verified: false,
      verificationToken: generateVerificationToken(),
      verificationSentAt: new Date().toISOString(),
      profileComplete: true,
      assessmentCount: 0,
      orderCount: 0,
      rating: null,
      notes: []
    };

    // Store data
    database.users.push(newUser);
    database.farmers.push(newFarmer);

    // Generate JWT token
    const token = jwt.sign(
      {
        id: userId,
        email: email,
        role: 'farmer',
        name: newFarmer.fullName
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Send welcome email
    await sendWelcomeEmail(newFarmer);

    // Save database
    saveDatabase();

    // Remove sensitive data from response
    const { verificationToken, ...farmerWithoutToken } = newFarmer;

    res.status(201).json({
      success: true,
      message: 'Farmer registered successfully!',
      farmer: farmerWithoutToken,
      accountId,
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred during registration. Please try again.'
    });
  }
});

// Get Farmer Profile
app.get('/api/farmer/profile', authenticateToken, authorizeRole(['farmer']), (req, res) => {
  try {
    const farmer = database.farmers.find(f => f.id === req.user.id);
    
    if (!farmer) {
      return res.status(404).json({
        success: false,
        error: 'Farmer not found'
      });
    }

    // Remove sensitive data
    const { verificationToken, ...farmerWithoutToken } = farmer;

    res.json({
      success: true,
      farmer: farmerWithoutToken
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching profile'
    });
  }
});

// Update Farmer Profile
app.put('/api/farmer/profile', authenticateToken, authorizeRole(['farmer']), (req, res) => {
  try {
    const farmerIndex = database.farmers.findIndex(f => f.id === req.user.id);
    
    if (farmerIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Farmer not found'
      });
    }

    const updates = req.body;
    
    // Update farmer data
    if (updates.firstName || updates.lastName) {
      database.farmers[farmerIndex].firstName = updates.firstName || database.farmers[farmerIndex].firstName;
      database.farmers[farmerIndex].lastName = updates.lastName || database.farmers[farmerIndex].lastName;
      database.farmers[farmerIndex].fullName = `${database.farmers[farmerIndex].firstName} ${database.farmers[farmerIndex].lastName}`;
      
      // Update corresponding user
      const userIndex = database.users.findIndex(u => u.id === req.user.id);
      if (userIndex !== -1) {
        database.users[userIndex].name = database.farmers[farmerIndex].fullName;
      }
    }

    if (updates.phone) {
      database.farmers[farmerIndex].phone = updates.phone;
    }

    if (updates.farmDetails) {
      database.farmers[farmerIndex].farmDetails = {
        ...database.farmers[farmerIndex].farmDetails,
        ...updates.farmDetails
      };
    }

    if (updates.preferences) {
      database.farmers[farmerIndex].preferences = {
        ...database.farmers[farmerIndex].preferences,
        ...updates.preferences
      };
    }

    database.farmers[farmerIndex].updatedAt = new Date().toISOString();

    // Save database
    saveDatabase();

    const { verificationToken, ...farmerWithoutToken } = database.farmers[farmerIndex];

    res.json({
      success: true,
      message: 'Profile updated successfully',
      farmer: farmerWithoutToken
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      error: 'Error updating profile'
    });
  }
});

// ==================== 3. FARMER DASHBOARD ====================

// Get Farmer Dashboard
app.get('/api/farmer/dashboard', authenticateToken, authorizeRole(['farmer']), (req, res) => {
  try {
    const farmerOrders = database.farmOrders.filter(order => order.farmerId === req.user.id);
    const farmerReports = database.agronomistReports.filter(report => report.farmerId === req.user.id);
    const farmerSales = database.sales.filter(sale => sale.farmerId === req.user.id);
    
    // Calculate stats
    const now = new Date();
    const thisMonthSales = farmerSales.filter(s => {
      const saleDate = new Date(s.date);
      return saleDate.getMonth() === now.getMonth() && 
             saleDate.getFullYear() === now.getFullYear();
    });

    const stats = {
      activeFarms: 5, // Hardcoded for demo
      totalOrders: farmerOrders.length,
      salesThisMonth: thisMonthSales.length,
      totalProfit: farmerSales.reduce((sum, sale) => sum + (sale.profit || 0), 0)
    };

    res.json({
      success: true,
      stats,
      orders: farmerOrders,
      reports: farmerReports,
      sales: farmerSales
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Error loading dashboard'
    });
  }
});

// Create Farm Order
app.post('/api/farmer/orders', authenticateToken, authorizeRole(['farmer']), (req, res) => {
  try {
    const { item, quantity, unit, urgency, notes } = req.body;
    
    const newOrder = {
      id: Date.now().toString(),
      farmerId: req.user.id,
      orderId: `ORD-${String(database.farmOrders.length + 1).padStart(3, '0')}`,
      item,
      quantity,
      unit,
      date: new Date().toISOString().split('T')[0],
      status: 'pending',
      urgency,
      notes,
      createdAt: new Date().toISOString()
    };

    database.farmOrders.push(newOrder);
    
    // Update farmer's order count
    const farmerIndex = database.farmers.findIndex(f => f.id === req.user.id);
    if (farmerIndex !== -1) {
      database.farmers[farmerIndex].orderCount = (database.farmers[farmerIndex].orderCount || 0) + 1;
    }

    saveDatabase();

    res.json({
      success: true,
      order: newOrder
    });

  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Error creating order'
    });
  }
});

// Add Sale Record
app.post('/api/farmer/sales', authenticateToken, authorizeRole(['farmer']), (req, res) => {
  try {
    const { crop, quantity, unit, pricePerUnit, date, buyer, costPrice, notes } = req.body;
    
    const total = quantity * pricePerUnit;
    const profit = total - (quantity * costPrice);

    const newSale = {
      id: Date.now().toString(),
      farmerId: req.user.id,
      crop,
      quantity,
      unit,
      pricePerUnit,
      total,
      costPrice,
      profit,
      date: date || new Date().toISOString().split('T')[0],
      buyer,
      notes,
      createdAt: new Date().toISOString()
    };

    database.sales.push(newSale);
    saveDatabase();

    res.json({
      success: true,
      sale: newSale
    });

  } catch (error) {
    console.error('Sale creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Error recording sale'
    });
  }
});

// ==================== 4. AGRONOMIST DASHBOARD ====================

// Get Agronomist Dashboard
app.get('/api/agronomist/dashboard', authenticateToken, authorizeRole(['agronomist']), (req, res) => {
  try {
    // Calculate statistics
    const totalProfit = database.sales.reduce((sum, sale) => sum + (sale.profit || 0), 0);
    const now = new Date();
    const thisMonthSales = database.sales.filter(s => {
      const saleDate = new Date(s.date);
      return saleDate.getMonth() === now.getMonth() && 
             saleDate.getFullYear() === now.getFullYear();
    });

    const stats = {
      totalFarmers: database.farmers.length,
      totalAssessments: database.assessmentRequests.length,
      totalReports: database.agronomistReports.length,
      totalSales: database.sales.length,
      totalProfit: totalProfit,
      totalOrders: database.farmOrders.length,
      thisMonthSales: thisMonthSales.length,
      thisMonthProfit: thisMonthSales.reduce((sum, sale) => sum + (sale.profit || 0), 0)
    };

    // Get top performing farms (by profit)
    const farmerProfits = {};
    database.sales.forEach(sale => {
      if (!farmerProfits[sale.farmerId]) {
        farmerProfits[sale.farmerId] = 0;
      }
      farmerProfits[sale.farmerId] += sale.profit || 0;
    });

    const topPerformingFarms = Object.entries(farmerProfits)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([farmerId, profit]) => {
        const farmer = database.farmers.find(f => f.id === farmerId);
        return {
          farmerName: farmer ? farmer.fullName : 'Unknown Farmer',
          profit
        };
      });

    res.json({
      success: true,
      stats,
      farmers: database.farmers,
      reports: database.agronomistReports,
      sales: database.sales,
      visits: database.scheduledVisits,
      topPerformingFarms
    });

  } catch (error) {
    console.error('Agronomist dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Error loading dashboard'
    });
  }
});

// Add Farmer (by Agronomist)
app.post('/api/agronomist/farmers', authenticateToken, authorizeRole(['agronomist']), async (req, res) => {
  try {
    const { name, email, phone, location, farmDetails } = req.body;
    
    // Check if farmer already exists
    const existingFarmer = database.farmers.find(f => f.email === email);
    if (existingFarmer) {
      return res.status(400).json({
        success: false,
        error: 'Farmer already exists'
      });
    }

    // Generate IDs
    const userId = Date.now().toString();
    const farmerId = `FARM-${Date.now().toString().slice(-8)}`;

    // Create default password
    const defaultPassword = 'farmer123';
    const hashedPassword = await bcrypt.hash(defaultPassword, SALT_ROUNDS);

    // Create user
    const newUser = {
      id: userId,
      email,
      password: hashedPassword,
      role: 'farmer',
      name,
      createdAt: new Date().toISOString(),
      status: 'active'
    };

    // Create farmer
    const [firstName, ...lastNameParts] = name.split(' ');
    const newFarmer = {
      id: userId,
      farmerId,
      accountId: farmerId,
      firstName: firstName || '',
      lastName: lastNameParts.join(' ') || '',
      fullName: name,
      email,
      phone,
      farmDetails: {
        location,
        farms: farmDetails.split(',').map(f => f.trim()),
        size: 0,
        crops: [],
        livestock: null,
        irrigation: null,
        goals: null
      },
      registrationDate: new Date().toISOString(),
      status: 'active',
      verified: false,
      profileComplete: false
    };

    database.users.push(newUser);
    database.farmers.push(newFarmer);
    saveDatabase();

    res.json({
      success: true,
      message: 'Farmer added successfully',
      farmer: newFarmer
    });

  } catch (error) {
    console.error('Add farmer error:', error);
    res.status(500).json({
      success: false,
      error: 'Error adding farmer'
    });
  }
});

// Schedule Farm Visit
app.post('/api/agronomist/visits', authenticateToken, authorizeRole(['agronomist']), (req, res) => {
  try {
    const { farmerId, date, time, purpose, notes } = req.body;
    
    const farmer = database.farmers.find(f => f.id === farmerId);
    if (!farmer) {
      return res.status(404).json({
        success: false,
        error: 'Farmer not found'
      });
    }

    const newVisit = {
      id: Date.now().toString(),
      farmerId,
      farmerName: farmer.fullName,
      date,
      time,
      purpose,
      notes,
      status: 'scheduled',
      scheduledBy: req.user.id,
      createdAt: new Date().toISOString()
    };

    database.scheduledVisits.push(newVisit);
    saveDatabase();

    res.json({
      success: true,
      visit: newVisit
    });

  } catch (error) {
    console.error('Schedule visit error:', error);
    res.status(500).json({
      success: false,
      error: 'Error scheduling visit'
    });
  }
});

// Generate Report
app.post('/api/agronomist/reports', authenticateToken, authorizeRole(['agronomist']), (req, res) => {
  try {
    const { type, farmerId, dateFrom, dateTo, title, summary, recommendations } = req.body;
    
    let targetFarmer = null;
    if (farmerId !== 'all') {
      targetFarmer = database.farmers.find(f => f.id === farmerId);
      if (!targetFarmer) {
        return res.status(404).json({
          success: false,
          error: 'Farmer not found'
        });
      }
    }

    const newReport = {
      id: Date.now().toString(),
      type,
      farmerId: farmerId === 'all' ? null : farmerId,
      farmerName: targetFarmer ? targetFarmer.fullName : 'All Farmers',
      title,
      summary,
      recommendations,
      dateFrom,
      dateTo,
      generatedBy: req.user.name,
      generatedAt: new Date().toISOString(),
      status: 'completed'
    };

    database.agronomistReports.push(newReport);
    saveDatabase();

    res.json({
      success: true,
      report: newReport
    });

  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Error generating report'
    });
  }
});

// ==================== 5. CONTACT FORM ====================

// Submit Contact Form

import dotenv from "dotenv";

dotenv.config();


app.use(cors());
app.use(express.json());

app.post("/contact", async (req, res) => {
  const { name, email, subject, message } = req.body;

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: `"Aaron Agronomy Website" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // OWNER RECEIVES EMAIL sephanayboke@gmail.com
      subject: `Contact Form: ${subject}`,
      html: `
        <h3>New Contact Message</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong><br/>${message}</p>
      `
    });

    res.json({ message: "Message sent successfully" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to send message" });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});


// Get Contact Messages (Admin)
app.get('/api/contact/messages', authenticateToken, authorizeRole(['admin', 'agronomist']), (req, res) => {
  try {
    const { status, limit = 50, page = 1 } = req.query;
    
    let filteredMessages = database.contactMessages;
    
    if (status) {
      filteredMessages = filteredMessages.filter(msg => msg.status === status);
    }
    
    // Sort by newest first
    filteredMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedMessages = filteredMessages.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      messages: paginatedMessages,
      total: filteredMessages.length,
      page: parseInt(page),
      totalPages: Math.ceil(filteredMessages.length / limit)
    });

  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching messages'
    });
  }
});

// ==================== 6. FARM ASSESSMENT ====================

// Submit Assessment Request
app.post('/api/assessment/submit', async (req, res) => {
  try {
    const {
      assessmentType,
      farmName,
      farmLocation,
      farmSize,
      farmAge,
      crops,
      livestock,
      currentIssues,
      fullName,
      phone,
      email,
      idNumber,
      registeredFarmer,
      preferredDate,
      additionalInfo,
      terms,
      newsletter
    } = req.body;

    // Validation
    const errors = validateAssessment(req.body);
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        errors
      });
    }

    // Generate reference number
    const refNumber = 'ASS-' + Date.now().toString().slice(-8) + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();

    // Create assessment request object
    const newRequest = {
      id: Date.now().toString(),
      referenceNumber: refNumber,
      assessmentType,
      farmDetails: {
        name: farmName,
        location: farmLocation,
        size: parseFloat(farmSize),
        age: farmAge ? parseInt(farmAge) : null,
        crops: Array.isArray(crops) ? crops : crops.split(','),
        livestock: livestock || null,
        currentIssues: currentIssues || null
      },
      farmerDetails: {
        fullName,
        phone,
        email: email || null,
        idNumber: idNumber || null,
        registeredFarmer: registeredFarmer === 'yes'
      },
      additionalInfo: additionalInfo || null,
      preferredDate: preferredDate || null,
      newsletterOptIn: newsletter || false,
      submissionDate: new Date().toISOString(),
      status: 'pending',
      assignedAgronomist: null,
      scheduledDate: null,
      visitDate: null,
      reportGenerated: false,
      attachments: [],
      notes: []
    };

    // Add to database
    database.assessmentRequests.push(newRequest);

    // Send email notifications
    await sendAssessmentNotifications(newRequest);

    saveDatabase();

    res.json({
      success: true,
      message: 'Farm assessment request submitted successfully! Our team will contact you within 24 hours.',
      referenceNumber: refNumber,
      requestId: newRequest.id
    });

  } catch (error) {
    console.error('Assessment submission error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred while submitting your request.'
    });
  }
});

// Get Assessment Requests
app.get('/api/assessment/requests', authenticateToken, authorizeRole(['admin', 'agronomist']), (req, res) => {
  try {
    const { status, page = 1, limit = 20, farmerId } = req.query;
    
    let filteredRequests = database.assessmentRequests;
    
    if (status && status !== 'all') {
      filteredRequests = filteredRequests.filter(req => req.status === status);
    }
    
    if (farmerId) {
      filteredRequests = filteredRequests.filter(req => 
        req.farmerDetails.email === farmerId || req.farmerDetails.phone === farmerId
      );
    }
    
    // Sort by submission date (newest first)
    filteredRequests.sort((a, b) => new Date(b.submissionDate) - new Date(a.submissionDate));
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedRequests = filteredRequests.slice(startIndex, endIndex);
    
    // Calculate statistics
    const stats = {
      total: database.assessmentRequests.length,
      pending: database.assessmentRequests.filter(r => r.status === 'pending').length,
      scheduled: database.assessmentRequests.filter(r => r.status === 'scheduled').length,
      completed: database.assessmentRequests.filter(r => r.status === 'completed').length,
      cancelled: database.assessmentRequests.filter(r => r.status === 'cancelled').length
    };
    
    res.json({
      success: true,
      requests: paginatedRequests,
      total: filteredRequests.length,
      page: parseInt(page),
      totalPages: Math.ceil(filteredRequests.length / limit),
      stats
    });

  } catch (error) {
    console.error('Get assessments error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching assessment requests'
    });
  }
});

// Update Assessment Status
app.patch('/api/assessment/requests/:id/status', authenticateToken, authorizeRole(['admin', 'agronomist']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assignedAgronomist, scheduledDate, notes } = req.body;
    
    const requestIndex = database.assessmentRequests.findIndex(req => req.id === id);
    
    if (requestIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Assessment request not found'
      });
    }

    const request = database.assessmentRequests[requestIndex];
    const oldStatus = request.status;
    
    // Update status
    request.status = status;
    
    if (assignedAgronomist) {
      request.assignedAgronomist = assignedAgronomist;
    }
    
    if (scheduledDate) {
      request.scheduledDate = scheduledDate;
    }
    
    if (notes) {
      request.notes.push({
        type: 'status_update',
        content: notes,
        date: new Date().toISOString(),
        by: req.user.name
      });
    }
    
    // If status changed to scheduled, send confirmation
    if (status === 'scheduled' && oldStatus !== 'scheduled') {
      await sendSchedulingConfirmation(request);
    }
    
    // If status changed to completed, trigger report generation
    if (status === 'completed' && oldStatus !== 'completed') {
      request.completedDate = new Date().toISOString();
    }
    
    saveDatabase();

    res.json({
      success: true,
      message: 'Assessment request updated successfully',
      request: database.assessmentRequests[requestIndex]
    });

  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({
      success: false,
      error: 'Error updating assessment request'
    });
  }
});

// ==================== 7. SUBSCRIBE TO NEWSLETTER ====================

app.post('/api/subscribe', async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email address is required'
      });
    }

    // Validate email
    if (!validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid email address'
      });
    }

    // Check if already subscribed
    const alreadySubscribed = database.newsletterSubscribers.some(sub => sub.email === email);
    
    if (alreadySubscribed) {
      return res.json({
        success: true,
        message: 'You are already subscribed to our newsletter!'
      });
    }

    // Add to subscribers
    const newSubscriber = {
      email,
      name: name || 'Subscriber',
      subscribedAt: new Date().toISOString(),
      active: true
    };

    database.newsletterSubscribers.push(newSubscriber);
    saveDatabase();

    // Send welcome email
    await sendWelcomeEmailSubscriber(newSubscriber);

    res.json({
      success: true,
      message: 'Thank you for subscribing to our newsletter!'
    });

  } catch (error) {
    console.error('Subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred. Please try again later.'
    });
  }
});

// ==================== 8. ADMIN ROUTES ====================

// Get System Statistics
app.get('/api/admin/stats', authenticateToken, authorizeRole(['admin']), (req, res) => {
  try {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const stats = {
      users: {
        total: database.users.length,
        farmers: database.users.filter(u => u.role === 'farmer').length,
        agronomists: database.users.filter(u => u.role === 'agronomist').length,
        admins: database.users.filter(u => u.role === 'admin').length,
        active: database.users.filter(u => u.status === 'active').length
      },
      farmers: {
        total: database.farmers.length,
        verified: database.farmers.filter(f => f.verified).length,
        newThisMonth: database.farmers.filter(f => {
          const regDate = new Date(f.registrationDate);
          return regDate.getMonth() === thisMonth && 
                 regDate.getFullYear() === thisYear;
        }).length
      },
      assessments: {
        total: database.assessmentRequests.length,
        pending: database.assessmentRequests.filter(r => r.status === 'pending').length,
        completed: database.assessmentRequests.filter(r => r.status === 'completed').length
      },
      orders: {
        total: database.farmOrders.length,
        pending: database.farmOrders.filter(o => o.status === 'pending').length,
        completed: database.farmOrders.filter(o => o.status === 'completed').length
      },
      sales: {
        total: database.sales.length,
        thisMonth: database.sales.filter(s => {
          const saleDate = new Date(s.date);
          return saleDate.getMonth() === thisMonth && 
                 saleDate.getFullYear() === thisYear;
        }).length,
        totalProfit: database.sales.reduce((sum, sale) => sum + (sale.profit || 0), 0)
      },
      contacts: {
        total: database.contactMessages.length,
        unread: database.contactMessages.filter(m => m.status === 'unread').length
      }
    };

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching statistics'
    });
  }
});

// ==================== 9. HELPER FUNCTIONS ====================

// Validation Functions
function validateRegistration(data) {
  const errors = [];

  if (!data.firstName) errors.push('First name is required');
  if (!data.lastName) errors.push('Last name is required');
  if (!data.email) errors.push('Email is required');
  if (!data.phone) errors.push('Phone number is required');
  if (!data.password) errors.push('Password is required');
  if (!data.confirmPassword) errors.push('Please confirm your password');
  if (!data.farmLocation) errors.push('Farm location is required');
  if (!data.farmSize) errors.push('Farm size is required');
  if (!data.crops || (Array.isArray(data.crops) && data.crops.length === 0)) errors.push('Please select at least one crop');
  if (!data.terms) errors.push('You must accept the terms and conditions');

  if (data.email && !validator.isEmail(data.email)) {
    errors.push('Please enter a valid email address');
  }

  if (data.password && data.password.length < 6) {
    errors.push('Password must be at least 6 characters');
  }

  if (data.password && data.confirmPassword && data.password !== data.confirmPassword) {
    errors.push('Passwords do not match');
  }

  if (data.farmSize && (isNaN(data.farmSize) || parseFloat(data.farmSize) <= 0)) {
    errors.push('Please enter a valid farm size');
  }

  return errors;
}

function validateAssessment(data) {
  const errors = [];

  if (!data.assessmentType) errors.push('Assessment type is required');
  if (!data.farmName) errors.push('Farm name is required');
  if (!data.farmLocation) errors.push('Farm location is required');
  if (!data.farmSize || data.farmSize <= 0) errors.push('Valid farm size is required');
  if (!data.crops || (Array.isArray(data.crops) && data.crops.length === 0)) errors.push('Please select at least one crop');
  if (!data.fullName) errors.push('Full name is required');
  if (!data.phone) errors.push('Phone number is required');
  if (data.email && !validator.isEmail(data.email)) errors.push('Valid email is required if provided');
  if (!data.terms) errors.push('You must accept the terms and conditions');

  return errors;
}

function generateVerificationToken() {
  return Math.random().toString(36).substr(2) + Date.now().toString(36);
}

// Email Functions
async function sendWelcomeEmail(farmer) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: farmer.email,
      subject: '🎉 Welcome to Aaron Agronomy Services!',
      html: `
        <h2>Welcome to Aaron Agronomy Services!</h2>
        <p>Dear ${farmer.fullName},</p>
        <p>Thank you for registering with us! Your account ID is: <strong>${farmer.accountId}</strong></p>
        <p>We're excited to help you succeed in your farming journey.</p>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Welcome email sent to:', farmer.email);
    
  } catch (error) {
    console.error('Welcome email error:', error);
  }
}


async function sendContactEmailNotifications(message) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER, // sephanyaboke@gmail.com
      pass: process.env.EMAIL_PASS  // Gmail App Password
    }
  });

  const mailOptions = {
    from: `"Website Contact" <${process.env.EMAIL_USER}>`,
    to: "sephanyaboke@gmail.com",   // OWNER EMAIL
    replyTo: message.email,         // USER EMAIL
    subject: `New Contact Message: ${message.subject}`,
    html: `
      <h2>New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${message.name}</p>
      <p><strong>Phone:</strong> ${message.phone}</p>
      <p><strong>Email:</strong> ${message.email}</p>
      <p><strong>Subject:</strong> ${message.subject}</p>
      <p><strong>Message:</strong><br/>${message.message}</p>
    `
  };

  await transporter.sendMail(mailOptions);
  console.log("📧 Email sent to owner successfully");
}

module.exports = sendContactEmailNotifications;
  
    
    await transporter.sendMail(adminMailOptions);
    
  } catch (error) {
    console.error('Contact email error:', error);
  }
}

async function sendAssessmentNotifications(request) {
  try {
    const adminMailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER || 'admin@example.com',
      subject: `New Farm Assessment Request: ${request.referenceNumber}`,
      html: `
        <h2>New Farm Assessment Request</h2>
        <p><strong>Reference:</strong> ${request.referenceNumber}</p>
        <p><strong>Farm:</strong> ${request.farmDetails.name}</p>
        <p><strong>Location:</strong> ${request.farmDetails.location}</p>
        <p><strong>Farmer:</strong> ${request.farmerDetails.fullName}</p>
        <p><strong>Phone:</strong> ${request.farmerDetails.phone}</p>
      `
    };

    await transporter.sendMail(adminMailOptions);
    
  } catch (error) {
    console.error('Assessment email error:', error);
  }
}

async function sendSchedulingConfirmation(request) {
  try {
    if (!request.farmerDetails.email) return;
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: request.farmerDetails.email,
      subject: `Farm Assessment Scheduled: ${request.referenceNumber}`,
      html: `
        <h2>Farm Assessment Scheduled</h2>
        <p>Dear ${request.farmerDetails.fullName},</p>
        <p>Your farm assessment has been scheduled!</p>
      `
    };

    await transporter.sendMail(mailOptions);
    
  } catch (error) {
    console.error('Scheduling email error:', error);
  }
}

async function sendWelcomeEmailSubscriber(subscriber) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: subscriber.email,
      subject: 'Welcome to Our Newsletter!',
      html: `
        <h2>Welcome to Our Newsletter!</h2>
        <p>Thank you for subscribing to Aaron Agronomy Services newsletter.</p>
      `
    };

    await transporter.sendMail(mailOptions);
    
  } catch (error) {
    console.error('Newsletter welcome email error:', error);
  }
}

// Initialize demo data
function initializeDemoData() {
  if (database.users.length === 0) {
    // Add demo users
    database.users = [
      {
        id: '1',
        email: 'farmer@demo.com',
        password: '$2a$10$N9qo8uLOickgx2ZMRZoMye.ML3Lp7Q6Q5Lp5D3JYl6wVW1JQZvZ/W', // farmer123
        role: 'farmer',
        name: 'John Agritech',
        createdAt: new Date().toISOString(),
        status: 'active'
      },
      {
        id: '2',
        email: 'agro@demo.com',
        password: '$2a$10$N9qo8uLOickgx2ZMRZoMye.ML3Lp7Q6Q5Lp5D3JYl6wVW1JQZvZ/W', // agro123
        role: 'agronomist',
        name: 'Dr. Sarah Agronomics',
        createdAt: new Date().toISOString(),
        status: 'active'
      },
      {
        id: '3',
        email: 'admin@demo.com',
        password: '$2a$10$N9qo8uLOickgx2ZMRZoMye.ML3Lp7Q6Q5Lp5D3JYl6wVW1JQZvZ/W', // admin123
        role: 'admin',
        name: 'System Administrator',
        createdAt: new Date().toISOString(),
        status: 'active'
      }
    ];

    // Add demo farmer
    database.farmers = [
      {
        id: '1',
        farmerId: 'FARM-00123',
        accountId: 'FARM-00123',
        firstName: 'John',
        lastName: 'Agritech',
        fullName: 'John Agritech',
        email: 'farmer@demo.com',
        phone: '+254 712 345 678',
        idNumber: '12345678',
        farmDetails: {
          name: 'Main Farm',
          location: 'Nakuru County',
          size: 5,
          age: 3,
          crops: ['avocado', 'mango', 'maize'],
          livestock: 'Cattle, Goats',
          irrigation: 'drip',
          goals: 'Increase yield, Organic certification'
        },
        preferences: {
          newsletter: true,
          shareInfo: true
        },
        registrationDate: new Date().toISOString(),
        status: 'active',
        verified: true,
        profileComplete: true,
        assessmentCount: 2,
        orderCount: 3,
        rating: 4.5
      }
    ];

    // Add demo data for other collections
    database.farmOrders = [
      {
        id: '1',
        farmerId: '1',
        orderId: 'ORD-001',
        item: 'Fertilizer',
        quantity: '5',
        unit: 'bags',
        date: '2023-10-15',
        status: 'pending',
        urgency: 'medium',
        notes: 'Need by next week'
      }
    ];

    database.agronomistReports = [
      {
        id: '1',
        farmerId: '1',
        title: 'Soil Analysis Report',
        type: 'soil_analysis',
        summary: 'Soil pH is optimal for maize cultivation.',
        recommendations: 'Apply nitrogen-based fertilizer next season.',
        date: '2023-10-10',
        status: 'completed'
      }
    ];

    database.sales = [
      {
        id: '1',
        farmerId: '1',
        crop: 'Maize',
        quantity: 500,
        unit: 'kg',
        pricePerUnit: 0.5,
        total: 250,
        costPrice: 0.3,
        profit: 100,
        date: '2023-10-01',
        buyer: 'Local Market'
      }
    ];

    database.scheduledVisits = [
      {
        id: '1',
        farmerId: '1',
        farmerName: 'John Agritech',
        date: '2023-10-20',
        time: '10:00',
        purpose: 'soil_test',
        notes: 'Annual soil testing',
        status: 'scheduled'
      }
    ];

    saveDatabase();
    console.log('Demo data initialized');
  }
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      error: `File upload error: ${err.message}`
    });
  }
  
  res.status(500).json({
    success: false,
    error: 'Something went wrong!'
  });
});

// Load database and initialize demo data
loadDatabase();
initializeDemoData();

// Start server
app.listen(PORT, () => {
  console.log(`server running on port:${PORT}`);
  console.log('Available API endpoints:');
  console.log('- POST /api/login');
  console.log('- POST /api/farmer/register');
  console.log('- GET /api/farmer/dashboard (requires auth)');
  console.log('- GET /api/agronomist/dashboard (requires auth)');
  console.log('- POST /api/contact');
  console.log('- POST /api/assessment/submit');
  console.log('- POST /api/subscribe');
  console.log('- GET /api/admin/stats (requires admin auth)');
});






