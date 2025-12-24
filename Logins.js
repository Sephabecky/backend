const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files from current directory

// Data storage files
const USERS_FILE = 'users.json';
const ORDERS_FILE = 'orders.json';
const REPORTS_FILE = 'reports.json';
const SALES_FILE = 'sales.json';
const FARMERS_FILE = 'farmers.json';
const VISITS_FILE = 'visits.json';

// Initialize data files if they don't exist
initializeDataFiles();

// Initialize data files
function initializeDataFiles() {
    const files = {
        [USERS_FILE]: [
            {
                id: 1,
                email: 'farmer@demo.com',
                password: '$2a$10$N9qo8uLOickgx2ZMRZoMyeMRHQN.5.9z8.QJ.I.9.9.0.0.0.0.0.0.0.0.0.0.0.0', // farmer123
                type: 'farmer',
                name: 'John Agritech',
                farmerId: 'FARM-00123',
                phone: '+254 712 345 678',
                location: 'Nakuru County',
                farms: 'Main Farm, North Field, River Side'
            },
            {
                id: 2,
                email: 'agro@demo.com',
                password: '$2a$10$9/LR5/.5.5.5.5.5.5.5.5.5.5.5.5.5.5.5.5.5.5.5.5.5.5.5', // agro123
                type: 'agronomist',
                name: 'Dr. Sarah Agronomics',
                agronomistId: 'AGRO-00456'
            }
        ],
        [ORDERS_FILE]: [
            {
                id: 1,
                farmerId: 'FARM-00123',
                farmerName: 'John Agritech',
                orderId: 'ORD-001',
                item: 'Fertilizer',
                quantity: '50',
                unit: 'kg',
                date: '2024-01-15',
                status: 'completed',
                urgency: 'medium',
                notes: 'NPK 17:17:17 blend'
            },
            {
                id: 2,
                farmerId: 'FARM-00123',
                farmerName: 'John Agritech',
                orderId: 'ORD-002',
                item: 'Seeds',
                quantity: '100',
                unit: 'kg',
                date: '2024-01-20',
                status: 'pending',
                urgency: 'high',
                notes: 'Maize seeds - hybrid variety'
            }
        ],
        [REPORTS_FILE]: [
            {
                id: 1,
                farmerId: 'FARM-00123',
                farmerName: 'John Agritech',
                reportId: 'REP-001',
                title: 'Soil Analysis Report',
                type: 'soil_analysis',
                date: '2024-01-10',
                summary: 'Soil pH is optimal. Nitrogen levels slightly low.',
                recommendations: 'Add nitrogen-rich fertilizer. Schedule follow-up in 2 weeks.',
                agronomist: 'Dr. Sarah Agronomics'
            }
        ],
        [SALES_FILE]: [
            {
                id: 1,
                farmerId: 'FARM-00123',
                farmerName: 'John Agritech',
                saleId: 'SALE-001',
                crop: 'Maize',
                quantity: 500,
                unit: 'kg',
                pricePerUnit: 0.8,
                costPerUnit: 0.5,
                date: '2024-01-05',
                buyer: 'Local Market',
                profit: 150
            }
        ],
        [FARMERS_FILE]: [
            {
                id: 1,
                farmerId: 'FARM-00123',
                name: 'John Agritech',
                email: 'john@agritech.com',
                phone: '+254 712 345 678',
                location: 'Nakuru County',
                farms: 'Main Farm, North Field, River Side',
                status: 'active',
                joinDate: '2023-06-15',
                totalOrders: 12,
                totalSales: 8
            },
            {
                id: 2,
                farmerId: 'FARM-00234',
                name: 'Mary Kamau',
                email: 'mary@farm.com',
                phone: '+254 723 456 789',
                location: 'Kiambu County',
                farms: 'Green Valley Farm',
                status: 'active',
                joinDate: '2023-08-20',
                totalOrders: 8,
                totalSales: 5
            }
        ],
        [VISITS_FILE]: [
            {
                id: 1,
                farmerId: 'FARM-00123',
                farmerName: 'John Agritech',
                visitId: 'VISIT-001',
                date: '2024-01-25',
                time: '10:00',
                purpose: 'soil_test',
                purposeText: 'Soil Testing',
                notes: 'Routine soil testing for nitrogen levels',
                status: 'scheduled',
                agronomist: 'Dr. Sarah Agronomics'
            }
        ]
    };

    // Create files if they don't exist
    Object.entries(files).forEach(([filename, defaultData]) => {
        const filePath = path.join(__dirname, filename);
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
        }
    });
}

// Helper function to read JSON files
function readJsonFile(filename) {
    try {
        const data = fs.readFileSync(filename, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

// Helper function to write JSON files
function writeJsonFile(filename, data) {
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
}

// Login endpoint
app.post('/api/login', (req, res) => {
    const { email, password, userType } = req.body;
    
    const users = readJsonFile(USERS_FILE);
    const user = users.find(u => u.email === email && u.type === userType);
    
    if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    // For demo purposes, we're using simple password comparison
    // In production, you should use bcrypt.compare for hashed passwords
    const demoPasswords = {
        'farmer@demo.com': 'farmer123',
        'agro@demo.com': 'agro123'
    };
    
    if (demoPasswords[email] && demoPasswords[email] === password) {
        // Remove password from response
        const { password, ...userWithoutPassword } = user;
        
        return res.json({
            success: true,
            user: userWithoutPassword,
            message: 'Login successful'
        });
    }
    
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
});

// Get user data
app.get('/api/user/:id', (req, res) => {
    const users = readJsonFile(USERS_FILE);
    const user = users.find(u => u.id == req.params.id);
    
    if (user) {
        const { password, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    } else {
        res.status(404).json({ error: 'User not found' });
    }
});

// Get farmer orders
app.get('/api/farmer/orders/:farmerId', (req, res) => {
    const orders = readJsonFile(ORDERS_FILE);
    const farmerOrders = orders.filter(order => order.farmerId === req.params.farmerId);
    res.json(farmerOrders);
});

// Create new order
app.post('/api/orders', (req, res) => {
    const order = req.body;
    const orders = readJsonFile(ORDERS_FILE);
    
    // Generate new ID and order ID
    const newId = orders.length > 0 ? Math.max(...orders.map(o => o.id)) + 1 : 1;
    const newOrderId = `ORD-${String(newId).padStart(3, '0')}`;
    
    const newOrder = {
        id: newId,
        orderId: newOrderId,
        ...order,
        date: new Date().toISOString().split('T')[0],
        status: 'pending'
    };
    
    orders.push(newOrder);
    writeJsonFile(ORDERS_FILE, orders);
    
    res.json({ success: true, order: newOrder });
});

// Get farmer reports
app.get('/api/farmer/reports/:farmerId', (req, res) => {
    const reports = readJsonFile(REPORTS_FILE);
    const farmerReports = reports.filter(report => report.farmerId === req.params.farmerId);
    res.json(farmerReports);
});

// Get farmer sales
app.get('/api/farmer/sales/:farmerId', (req, res) => {
    const sales = readJsonFile(SALES_FILE);
    const farmerSales = sales.filter(sale => sale.farmerId === req.params.farmerId);
    res.json(farmerSales);
});

// Create new sale
app.post('/api/sales', (req, res) => {
    const sale = req.body;
    const sales = readJsonFile(SALES_FILE);
    
    const newId = sales.length > 0 ? Math.max(...sales.map(s => s.id)) + 1 : 1;
    const newSaleId = `SALE-${String(newId).padStart(3, '0')}`;
    
    // Calculate total and profit
    const total = sale.quantity * sale.pricePerUnit;
    const cost = sale.quantity * sale.costPerUnit;
    const profit = total - cost;
    
    const newSale = {
        id: newId,
        saleId: newSaleId,
        ...sale,
        total: total,
        profit: profit
    };
    
    sales.push(newSale);
    writeJsonFile(SALES_FILE, sales);
    
    res.json({ success: true, sale: newSale });
});

// Update farmer profile
app.put('/api/farmer/profile/:farmerId', (req, res) => {
    const updates = req.body;
    const users = readJsonFile(USERS_FILE);
    
    const userIndex = users.findIndex(u => u.farmerId === req.params.farmerId);
    
    if (userIndex !== -1) {
        users[userIndex] = { ...users[userIndex], ...updates };
        writeJsonFile(USERS_FILE, users);
        
        // Also update farmers list
        const farmers = readJsonFile(FARMERS_FILE);
        const farmerIndex = farmers.findIndex(f => f.farmerId === req.params.farmerId);
        if (farmerIndex !== -1) {
            farmers[farmerIndex] = { ...farmers[farmerIndex], ...updates };
            writeJsonFile(FARMERS_FILE, farmers);
        }
        
        res.json({ success: true, user: users[userIndex] });
    } else {
        res.status(404).json({ success: false, message: 'Farmer not found' });
    }
});

// Get all farmers (for agronomist)
app.get('/api/farmers', (req, res) => {
    const farmers = readJsonFile(FARMERS_FILE);
    res.json(farmers);
});

// Add new farmer
app.post('/api/farmers', (req, res) => {
    const farmerData = req.body;
    const farmers = readJsonFile(FARMERS_FILE);
    const users = readJsonFile(USERS_FILE);
    
    const newId = farmers.length > 0 ? Math.max(...farmers.map(f => f.id)) + 1 : 1;
    const newFarmerId = `FARM-${String(newId + 100).padStart(3, '0')}`;
    
    const newFarmer = {
        id: newId,
        farmerId: newFarmerId,
        ...farmerData,
        status: 'active',
        joinDate: new Date().toISOString().split('T')[0],
        totalOrders: 0,
        totalSales: 0
    };
    
    // Also create a user account for the farmer
    const newUserId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 3;
    const newUser = {
        id: newUserId,
        email: farmerData.email,
        password: '$2a$10$N9qo8uLOickgx2ZMRZoMyeMRHQN.5.9z8.QJ.I.9.9.0.0.0.0.0.0.0.0.0.0.0.0', // Default password: farmer123
        type: 'farmer',
        name: farmerData.name,
        farmerId: newFarmerId,
        phone: farmerData.phone,
        location: farmerData.location,
        farms: farmerData.farms
    };
    
    farmers.push(newFarmer);
    users.push(newUser);
    
    writeJsonFile(FARMERS_FILE, farmers);
    writeJsonFile(USERS_FILE, users);
    
    res.json({ success: true, farmer: newFarmer });
});

// Get scheduled visits
app.get('/api/visits', (req, res) => {
    const visits = readJsonFile(VISITS_FILE);
    res.json(visits);
});

// Schedule new visit
app.post('/api/visits', (req, res) => {
    const visit = req.body;
    const visits = readJsonFile(VISITS_FILE);
    
    const newId = visits.length > 0 ? Math.max(...visits.map(v => v.id)) + 1 : 1;
    const newVisitId = `VISIT-${String(newId).padStart(3, '0')}`;
    
    const purposeTexts = {
        soil_test: 'Soil Testing',
        crop_assessment: 'Crop Assessment',
        pest_control: 'Pest Control',
        harvest_planning: 'Harvest Planning',
        training: 'Farmer Training'
    };
    
    const newVisit = {
        id: newId,
        visitId: newVisitId,
        ...visit,
        purposeText: purposeTexts[visit.purpose] || visit.purpose,
        status: 'scheduled',
        agronomist: 'Dr. Sarah Agronomics'
    };
    
    visits.push(newVisit);
    writeJsonFile(VISITS_FILE, visits);
    
    res.json({ success: true, visit: newVisit });
});

// Get all reports
app.get('/api/reports', (req, res) => {
    const reports = readJsonFile(REPORTS_FILE);
    res.json(reports);
});

// Create new report
app.post('/api/reports', (req, res) => {
    const report = req.body;
    const reports = readJsonFile(REPORTS_FILE);
    
    const newId = reports.length > 0 ? Math.max(...reports.map(r => r.id)) + 1 : 1;
    const newReportId = `REP-${String(newId).padStart(3, '0')}`;
    
    const newReport = {
        id: newId,
        reportId: newReportId,
        ...report,
        date: new Date().toISOString().split('T')[0],
        agronomist: 'Dr. Sarah Agronomics'
    };
    
    reports.push(newReport);
    writeJsonFile(REPORTS_FILE, reports);
    
    res.json({ success: true, report: newReport });
});

// Get all sales (for agronomist)
app.get('/api/sales', (req, res) => {
    const sales = readJsonFile(SALES_FILE);
    res.json(sales);
});

// Update agronomist profile
app.put('/api/agronomist/profile', (req, res) => {
    const updates = req.body;
    const users = readJsonFile(USERS_FILE);
    
    const userIndex = users.findIndex(u => u.type === 'agronomist');
    
    if (userIndex !== -1) {
        users[userIndex] = { ...users[userIndex], ...updates };
        writeJsonFile(USERS_FILE, users);
        res.json({ success: true, user: users[userIndex] });
    } else {
        res.status(404).json({ success: false, message: 'Agronomist not found' });
    }
});

// Delete record
app.delete('/api/records/:type/:id', (req, res) => {
    const { type, id } = req.params;
    
    let filename, success = false;
    
    switch(type) {
        case 'order':
            filename = ORDERS_FILE;
            break;
        case 'sale':
            filename = SALES_FILE;
            break;
        case 'farmer':
            filename = FARMERS_FILE;
            break;
        case 'visit':
            filename = VISITS_FILE;
            break;
        case 'report':
            filename = REPORTS_FILE;
            break;
        default:
            return res.status(400).json({ success: false, message: 'Invalid record type' });
    }
    
    const records = readJsonFile(filename);
    const initialLength = records.length;
    
    const filteredRecords = records.filter(record => record.id != id);
    
    if (filteredRecords.length < initialLength) {
        writeJsonFile(filename, filteredRecords);
        success = true;
    }
    
    res.json({ success: success });
});

// Update record
app.put('/api/records/:type/:id', (req, res) => {
    const { type, id } = req.params;
    const updates = req.body;
    
    let filename;
    
    switch(type) {
        case 'order':
            filename = ORDERS_FILE;
            break;
        case 'sale':
            filename = SALES_FILE;
            break;
        case 'farmer':
            filename = FARMERS_FILE;
            break;
        case 'visit':
            filename = VISITS_FILE;
            break;
        case 'report':
            filename = REPORTS_FILE;
            break;
        default:
            return res.status(400).json({ success: false, message: 'Invalid record type' });
    }
    
    const records = readJsonFile(filename);
    const recordIndex = records.findIndex(record => record.id == id);
    
    if (recordIndex !== -1) {
        records[recordIndex] = { ...records[recordIndex], ...updates };
        writeJsonFile(filename, records);
        res.json({ success: true, record: records[recordIndex] });
    } else {
        res.status(404).json({ success: false, message: 'Record not found' });
    }
});

// Dashboard stats
app.get('/api/stats', (req, res) => {
    const farmers = readJsonFile(FARMERS_FILE);
    const orders = readJsonFile(ORDERS_FILE);
    const sales = readJsonFile(SALES_FILE);
    const reports = readJsonFile(REPORTS_FILE);
    const visits = readJsonFile(VISITS_FILE);
    
    const totalProfit = sales.reduce((sum, sale) => sum + (sale.profit || 0), 0);
    
    res.json({
        totalFarmers: farmers.length,
        totalOrders: orders.length,
        totalSales: sales.length,
        totalReports: reports.length,
        totalAssessments: visits.length + reports.length,
        totalProfit: totalProfit
    });
});

// Serve the HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Demo credentials:`);
    console.log(`- Farmer: farmer@demo.com / farmer123`);
    console.log(`- Agronomist: agro@demo.com / agro123`);
});
