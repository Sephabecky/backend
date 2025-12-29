// logins.js - Backend API for Aaron Agronomy System (Render Deployment)
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:5500', 'https://yourdomain.com', '*'], // Allow all for testing
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection for Render
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://username:password@cluster.mongodb.net/aaron_agronomy?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
});

const db = mongoose.connection;
db.on('error', (err) => {
    console.error('MongoDB connection error:', err);
});
db.once('open', () => {
    console.log('Connected to MongoDB on Render');
});

// Models
const farmerSchema = new mongoose.Schema({
    farmerId: { type: String, required: true, unique: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String, required: true },
    location: { type: String, required: true },
    farmSize: { type: Number, required: true },
    mainCrop: { type: String, required: true },
    idNo: { type: String },
    password: { type: String, required: true },
    status: { type: String, default: 'active', enum: ['active', 'inactive', 'pending'] },
    registrationDate: { type: Date, default: Date.now },
    lastLogin: { type: Date },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
}, { timestamps: true });

const agronomistSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    employeeId: { type: String, required: true, unique: true },
    role: { type: String, default: 'agronomist', enum: ['agronomist', 'admin'] },
    status: { type: String, default: 'active', enum: ['active', 'inactive'] },
    lastLogin: { type: Date },
    permissions: [String],
}, { timestamps: true });

const farmSchema = new mongoose.Schema({
    farmerId: { type: String, required: true },
    name: { type: String, required: true },
    size: { type: Number, required: true },
    location: { type: String, required: true },
    crops: { type: String, required: true },
    soilType: { type: String, required: true },
    irrigation: { type: String, default: 'rainfed' },
}, { timestamps: true });

const profitRecordSchema = new mongoose.Schema({
    farmerId: { type: String, required: true },
    cropType: { type: String, required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    produce: { type: Number, required: true },
    sales: { type: Number, required: true },
    costs: { type: Number, required: true },
    pricePerKg: { type: Number, required: true },
    profit: { type: Number, required: true },
    profitMargin: { type: Number, required: true },
    farmId: { type: String },
    notes: String,
}, { timestamps: true });

const reportSchema = new mongoose.Schema({
    farmerId: { type: String, required: true },
    title: { type: String, required: true },
    type: { 
        type: String, 
        required: true,
        enum: [
            'soil_analysis',
            'crop_assessment',
            'pest_diagnosis',
            'fertilizer_recommendation',
            'harvest_report',
            'general_advisory'
        ]
    },
    date: { type: Date, required: true },
    findings: { type: String, required: true },
    recommendations: { type: String, required: true },
    notes: String,
    createdBy: { type: String, required: true },
    status: { type: String, default: 'published', enum: ['draft', 'published', 'archived'] },
}, { timestamps: true });

const visitSchema = new mongoose.Schema({
    farmerId: { type: String, required: true },
    purpose: { 
        type: String, 
        required: true,
        enum: [
            'soil_sampling',
            'crop_inspection',
            'pest_control',
            'training',
            'harvest_evaluation',
            'follow_up'
        ]
    },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    location: { type: String, required: true },
    notes: String,
    status: { 
        type: String, 
        default: 'scheduled',
        enum: ['scheduled', 'completed', 'cancelled', 'rescheduled']
    },
    agronomistId: { type: String, required: true },
}, { timestamps: true });

// Create models
const Farmer = mongoose.model('Farmer', farmerSchema);
const Agronomist = mongoose.model('Agronomist', agronomistSchema);
const Farm = mongoose.model('Farm', farmSchema);
const ProfitRecord = mongoose.model('ProfitRecord', profitRecordSchema);
const Report = mongoose.model('Report', reportSchema);
const Visit = mongoose.model('Visit', visitSchema);

// Utility Functions
const generateFarmerId = () => {
    const prefix = 'FARM';
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${randomNum}`;
};

const generateAgronomistId = () => {
    const prefix = 'AGRO';
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${randomNum}`;
};

const calculateProfit = (sales, costs) => {
    const profit = sales - costs;
    const profitMargin = sales > 0 ? (profit / sales) * 100 : 0;
    return { profit, profitMargin: parseFloat(profitMargin.toFixed(1)) };
};

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'aaron-agronomy-secret-key-2024';

// JWT Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'Access token required' 
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ 
                success: false, 
                message: 'Invalid or expired token' 
            });
        }
        req.user = user;
        next();
    });
};

// Health Check Endpoint
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Aaron Agronomy Backend is running',
        timestamp: new Date().toISOString(),
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// Test Endpoint
app.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'API is working!',
        backend: 'https://agronomy-backend-ehk1.onrender.com'
    });
});

// Initialize Default Agronomist Account
app.post('/api/init', async (req, res) => {
    try {
        // Check if default agronomist already exists
        const existingAgronomist = await Agronomist.findOne({ username: 'Aaron Agronomy' });
        
        if (existingAgronomist) {
            return res.json({
                success: true,
                message: 'Default agronomist already exists',
                credentials: {
                    username: existingAgronomist.username,
                    password: existingAgronomist.password
                }
            });
        }

        // Create default agronomist
        const agronomist = new Agronomist({
            username: 'Aaron Agronomy',
            password: '9898', // Plain text for demo
            fullName: 'Aaron Agronomy System',
            email: 'admin@aarongronomy.com',
            employeeId: generateAgronomistId(),
            role: 'admin',
            status: 'active',
            permissions: ['all'],
            lastLogin: new Date()
        });

        await agronomist.save();

        res.json({
            success: true,
            message: 'Default agronomist account created successfully',
            credentials: {
                username: agronomist.username,
                password: agronomist.password,
                employeeId: agronomist.employeeId
            }
        });

    } catch (error) {
        console.error('Initialization error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during initialization'
        });
    }
});

// Farmer Registration
app.post('/api/farmers/register', async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            email,
            phone,
            location,
            farmSize,
            mainCrop,
            password
        } = req.body;

        // Validation
        if (!firstName || !lastName || !email || !password || !phone || !location || !farmSize || !mainCrop) {
            return res.status(400).json({
                success: false,
                message: 'Please fill all required fields'
            });
        }

        // Check if email already exists
        const existingFarmer = await Farmer.findOne({ email: email.toLowerCase() });
        if (existingFarmer) {
            return res.status(400).json({
                success: false,
                message: 'Email already registered'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate farmer ID
        const farmerId = generateFarmerId();

        // Create new farmer
        const farmer = new Farmer({
            farmerId,
            firstName,
            lastName,
            email: email.toLowerCase(),
            phone,
            location,
            farmSize: parseFloat(farmSize),
            mainCrop,
            password: hashedPassword
        });

        await farmer.save();

        // Create token
        const token = jwt.sign(
            {
                userId: farmer.farmerId,
                email: farmer.email,
                role: 'farmer',
                name: `${farmer.firstName} ${farmer.lastName}`
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            success: true,
            message: 'Farmer registered successfully',
            data: {
                token,
                user: {
                    farmerId,
                    firstName,
                    lastName,
                    email,
                    phone,
                    location,
                    farmSize,
                    mainCrop,
                    role: 'farmer'
                }
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during registration'
        });
    }
});

// Farmer Login
app.post('/api/farmers/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Find farmer by email
        const farmer = await Farmer.findOne({ email: email.toLowerCase() });
        if (!farmer) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check password
        const isPasswordValid = await bcrypt.compare(password, farmer.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check if account is active
        if (farmer.status !== 'active') {
            return res.status(403).json({
                success: false,
                message: 'Account is not active. Please contact administrator.'
            });
        }

        // Update last login
        farmer.lastLogin = new Date();
        await farmer.save();

        // Create JWT token
        const token = jwt.sign(
            {
                userId: farmer.farmerId,
                email: farmer.email,
                role: 'farmer',
                name: `${farmer.firstName} ${farmer.lastName}`
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                user: {
                    farmerId: farmer.farmerId,
                    firstName: farmer.firstName,
                    lastName: farmer.lastName,
                    email: farmer.email,
                    phone: farmer.phone,
                    location: farmer.location,
                    farmSize: farmer.farmSize,
                    mainCrop: farmer.mainCrop,
                    role: 'farmer'
                }
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login'
        });
    }
});

// Agronomist Login
app.post('/api/agronomists/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }

        // Find agronomist by username
        const agronomist = await Agronomist.findOne({ username });
        if (!agronomist) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password'
            });
        }

        // Check password
        if (agronomist.password !== password) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password'
            });
        }

        // Check if account is active
        if (agronomist.status !== 'active') {
            return res.status(403).json({
                success: false,
                message: 'Account is not active. Please contact administrator.'
            });
        }

        // Update last login
        agronomist.lastLogin = new Date();
        await agronomist.save();

        // Create JWT token
        const token = jwt.sign(
            {
                userId: agronomist.employeeId,
                username: agronomist.username,
                role: agronomist.role,
                name: agronomist.fullName
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                user: {
                    employeeId: agronomist.employeeId,
                    username: agronomist.username,
                    fullName: agronomist.fullName,
                    email: agronomist.email,
                    phone: agronomist.phone,
                    role: agronomist.role
                }
            }
        });

    } catch (error) {
        console.error('Agronomist login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login'
        });
    }
});

// Get Farmer Profile
app.get('/api/farmers/profile', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'farmer') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const farmer = await Farmer.findOne({ farmerId: req.user.userId });
        if (!farmer) {
            return res.status(404).json({
                success: false,
                message: 'Farmer not found'
            });
        }

        res.json({
            success: true,
            data: {
                farmerId: farmer.farmerId,
                firstName: farmer.firstName,
                lastName: farmer.lastName,
                email: farmer.email,
                phone: farmer.phone,
                location: farmer.location,
                farmSize: farmer.farmSize,
                mainCrop: farmer.mainCrop,
                status: farmer.status,
                registrationDate: farmer.registrationDate
            }
        });

    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Add Farm
app.post('/api/farms', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'farmer') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const { name, size, location, crops, soilType, irrigation } = req.body;

        if (!name || !size || !location || !crops || !soilType) {
            return res.status(400).json({
                success: false,
                message: 'Please fill all required fields'
            });
        }

        const farm = new Farm({
            farmerId: req.user.userId,
            name,
            size: parseFloat(size),
            location,
            crops,
            soilType,
            irrigation: irrigation || 'rainfed'
        });

        await farm.save();

        res.status(201).json({
            success: true,
            message: 'Farm added successfully',
            data: farm
        });

    } catch (error) {
        console.error('Add farm error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Get Farmer Farms
app.get('/api/farms', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'farmer') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const farms = await Farm.find({ farmerId: req.user.userId });
        
        res.json({
            success: true,
            data: farms
        });

    } catch (error) {
        console.error('Get farms error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Add Profit Record
app.post('/api/profit-records', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'farmer') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const {
            cropType,
            month,
            year,
            produce,
            sales,
            costs,
            pricePerKg,
            farmId,
            notes
        } = req.body;

        // Validation
        if (!cropType || !month || !year || !produce || !sales || !costs || !pricePerKg) {
            return res.status(400).json({
                success: false,
                message: 'Please fill all required fields'
            });
        }

        // Calculate profit
        const { profit, profitMargin } = calculateProfit(
            parseFloat(sales),
            parseFloat(costs)
        );

        const profitRecord = new ProfitRecord({
            farmerId: req.user.userId,
            cropType,
            month: parseInt(month),
            year: parseInt(year),
            produce: parseFloat(produce),
            sales: parseFloat(sales),
            costs: parseFloat(costs),
            pricePerKg: parseFloat(pricePerKg),
            profit,
            profitMargin,
            farmId: farmId || null,
            notes: notes || ''
        });

        await profitRecord.save();

        res.status(201).json({
            success: true,
            message: 'Profit record added successfully',
            data: profitRecord
        });

    } catch (error) {
        console.error('Add profit record error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Get Farmer Profit Records
app.get('/api/profit-records', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'farmer') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const { year, cropType, month } = req.query;
        const query = { farmerId: req.user.userId };

        if (year) query.year = parseInt(year);
        if (cropType) query.cropType = cropType;
        if (month) query.month = parseInt(month);

        const records = await ProfitRecord.find(query).sort({ year: -1, month: -1 });

        // Calculate totals
        const totals = {
            totalProduce: 0,
            totalSales: 0,
            totalCosts: 0,
            totalProfit: 0,
            averageMargin: 0
        };

        records.forEach(record => {
            totals.totalProduce += record.produce;
            totals.totalSales += record.sales;
            totals.totalCosts += record.costs;
            totals.totalProfit += record.profit;
        });

        if (records.length > 0 && totals.totalSales > 0) {
            totals.averageMargin = (totals.totalProfit / totals.totalSales) * 100;
        }

        res.json({
            success: true,
            data: {
                records,
                totals
            }
        });

    } catch (error) {
        console.error('Get profit records error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Get Farmer Reports
app.get('/api/reports', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'farmer') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const reports = await Report.find({ 
            farmerId: req.user.userId,
            status: 'published'
        }).sort({ date: -1 });

        res.json({
            success: true,
            data: reports
        });

    } catch (error) {
        console.error('Get reports error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Search Reports by Farmer ID
app.get('/api/reports/search/:farmerId', async (req, res) => {
    try {
        const { farmerId } = req.params;

        const reports = await Report.find({ 
            farmerId,
            status: 'published'
        }).sort({ date: -1 });

        if (reports.length === 0) {
            return res.json({
                success: true,
                message: 'No reports found for this farmer ID',
                data: []
            });
        }

        res.json({
            success: true,
            data: reports
        });

    } catch (error) {
        console.error('Search reports error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Agronomist: Get All Farmers
app.get('/api/agronomists/farmers', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'agronomist' && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const farmers = await Farmer.find({ status: 'active' })
            .select('farmerId firstName lastName email phone location farmSize mainCrop registrationDate')
            .sort({ registrationDate: -1 });

        // Get profit data for each farmer
        const farmersWithProfit = await Promise.all(
            farmers.map(async (farmer) => {
                const profitRecords = await ProfitRecord.find({ farmerId: farmer.farmerId });
                const totalProfit = profitRecords.reduce((sum, record) => sum + record.profit, 0);
                
                return {
                    ...farmer.toObject(),
                    totalProfit: parseFloat(totalProfit.toFixed(2))
                };
            })
        );

        res.json({
            success: true,
            data: farmersWithProfit
        });

    } catch (error) {
        console.error('Get farmers error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Agronomist: Register New Farmer
app.post('/api/agronomists/farmers', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'agronomist' && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const {
            firstName,
            lastName,
            email,
            phone,
            location,
            farmSize,
            mainCrop
        } = req.body;

        // Validation
        if (!firstName || !lastName || !email || !phone || !location || !farmSize || !mainCrop) {
            return res.status(400).json({
                success: false,
                message: 'Please fill all required fields'
            });
        }

        // Check if email already exists
        const existingFarmer = await Farmer.findOne({ email: email.toLowerCase() });
        if (existingFarmer) {
            return res.status(400).json({
                success: false,
                message: 'Email already registered'
            });
        }

        // Generate farmer ID
        const farmerId = generateFarmerId();
        
        // Generate default password (farmer's phone number last 6 digits)
        const defaultPassword = phone.slice(-6);

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(defaultPassword, salt);

        // Create new farmer
        const farmer = new Farmer({
            farmerId,
            firstName,
            lastName,
            email: email.toLowerCase(),
            phone,
            location,
            farmSize: parseFloat(farmSize),
            mainCrop,
            password: hashedPassword
        });

        await farmer.save();

        res.status(201).json({
            success: true,
            message: 'Farmer registered successfully',
            data: {
                farmerId,
                firstName,
                lastName,
                email,
                phone,
                location,
                farmSize,
                mainCrop,
                defaultPassword // Send back only for initial setup
            }
        });

    } catch (error) {
        console.error('Register farmer error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Agronomist: Create Report for Farmer
app.post('/api/agronomists/reports', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'agronomist' && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const {
            farmerId,
            title,
            type,
            date,
            findings,
            recommendations,
            notes
        } = req.body;

        // Validation
        if (!farmerId || !title || !type || !date || !findings || !recommendations) {
            return res.status(400).json({
                success: false,
                message: 'Please fill all required fields'
            });
        }

        // Check if farmer exists
        const farmer = await Farmer.findOne({ farmerId });
        if (!farmer) {
            return res.status(404).json({
                success: false,
                message: 'Farmer not found'
            });
        }

        const report = new Report({
            farmerId,
            title,
            type,
            date: new Date(date),
            findings,
            recommendations,
            notes: notes || '',
            createdBy: req.user.userId,
            status: 'published'
        });

        await report.save();

        res.status(201).json({
            success: true,
            message: 'Report created successfully',
            data: report
        });

    } catch (error) {
        console.error('Create report error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Agronomist: Schedule Visit
app.post('/api/agronomists/visits', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'agronomist' && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const {
            farmerId,
            purpose,
            date,
            time,
            location,
            notes
        } = req.body;

        // Validation
        if (!farmerId || !purpose || !date || !time || !location) {
            return res.status(400).json({
                success: false,
                message: 'Please fill all required fields'
            });
        }

        // Check if farmer exists
        const farmer = await Farmer.findOne({ farmerId });
        if (!farmer) {
            return res.status(404).json({
                success: false,
                message: 'Farmer not found'
            });
        }

        const visit = new Visit({
            farmerId,
            purpose,
            date: new Date(date),
            time,
            location,
            notes: notes || '',
            status: 'scheduled',
            agronomistId: req.user.userId
        });

        await visit.save();

        res.status(201).json({
            success: true,
            message: 'Visit scheduled successfully',
            data: visit
        });

    } catch (error) {
        console.error('Schedule visit error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Agronomist: Get System Profit Analysis
app.get('/api/agronomists/profit-analysis', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'agronomist' && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const { year, cropType } = req.query;
        const query = {};

        if (year) query.year = parseInt(year);
        if (cropType) query.cropType = cropType;

        const profitRecords = await ProfitRecord.find(query);

        // Group by crop type
        const cropAnalysis = {};
        profitRecords.forEach(record => {
            if (!cropAnalysis[record.cropType]) {
                cropAnalysis[record.cropType] = {
                    cropType: record.cropType,
                    totalProduce: 0,
                    totalSales: 0,
                    totalCosts: 0,
                    totalProfit: 0,
                    farmerCount: new Set()
                };
            }
            cropAnalysis[record.cropType].totalProduce += record.produce;
            cropAnalysis[record.cropType].totalSales += record.sales;
            cropAnalysis[record.cropType].totalCosts += record.costs;
            cropAnalysis[record.cropType].totalProfit += record.profit;
            cropAnalysis[record.cropType].farmerCount.add(record.farmerId);
        });

        // Convert to array
        const analysisArray = Object.values(cropAnalysis).map(item => ({
            ...item,
            farmerCount: item.farmerCount.size,
            profitMargin: item.totalSales > 0 ? (item.totalProfit / item.totalSales) * 100 : 0
        }));

        // Get monthly trends
        const monthlyTrends = {};
        profitRecords.forEach(record => {
            const key = `${record.year}-${record.month}`;
            if (!monthlyTrends[key]) {
                monthlyTrends[key] = {
                    month: record.month,
                    year: record.year,
                    totalProfit: 0
                };
            }
            monthlyTrends[key].totalProfit += record.profit;
        });

        const monthlyArray = Object.values(monthlyTrends).sort((a, b) => {
            if (a.year === b.year) return a.month - b.month;
            return a.year - b.year;
        });

        res.json({
            success: true,
            data: {
                cropAnalysis: analysisArray,
                monthlyTrends: monthlyArray,
                totalRecords: profitRecords.length
            }
        });

    } catch (error) {
        console.error('Profit analysis error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Get All Profit Records (Agronomist)
app.get('/api/agronomists/all-profits', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'agronomist' && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const profitRecords = await ProfitRecord.find().sort({ year: -1, month: -1 });

        res.json({
            success: true,
            data: profitRecords
        });

    } catch (error) {
        console.error('Get all profits error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found'
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Aaron Agronomy Backend running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`API Base URL: https://agronomy-backend-ehk1.onrender.com`);
});
