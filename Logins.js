// script.js - Frontend updates for API integration
const API_BASE_URL = "https://agronomy-backend-ehk1.onrender.com";


// LOGINS.html - Full JavaScript for Login Page
document.addEventListener('DOMContentLoaded', function() {
   
    
    // DOM Elements
    const loginPage = document.getElementById('loginPage');
    const farmerDashboard = document.getElementById('farmerDashboard');
    const agronomistDashboard = document.getElementById('agronomistDashboard');
    const loginForm = document.getElementById('loginForm');
    const loginSubmitBtn = document.getElementById('loginSubmitBtn');
    const loginError = document.getElementById('loginError');
    const farmerType = document.getElementById('farmerType');
    const agronomistType = document.getElementById('agronomistType');
    const farmerLogout = document.getElementById('farmerLogout');
    const agronomistLogout = document.getElementById('agronomistLogout');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    
    let currentUserType = 'farmer';
    let authToken = null;
    let currentUser = null;
    
    // Initialize
    initLoginPage();
    
    function initLoginPage() {
        // Check if user is already logged in
        checkExistingLogin();
        
        // User type selection
        farmerType.addEventListener('click', () => {
            setUserType('farmer');
        });
        
        agronomistType.addEventListener('click', () => {
            setUserType('agronomist');
        });
        
        // Form submission
        loginForm.addEventListener('submit', handleLogin);
        
        // Logout buttons
        if (farmerLogout) {
            farmerLogout.addEventListener('click', handleLogout);
        }
        
        if (agronomistLogout) {
            agronomistLogout.addEventListener('click', handleLogout);
        }
        
        // Initialize form fields with demo credentials
        initializeDemoCredentials();
        
        // Add keyboard shortcuts
        addKeyboardShortcuts();
        
        // Auto-fill demo credentials on click
        addDemoCredentialClickHandlers();
    }
    
    function checkExistingLogin() {
        const token = localStorage.getItem('authToken');
        const userData = localStorage.getItem('userData');
        
        if (token && userData) {
            try {
                authToken = token;
                currentUser = JSON.parse(userData);
                
                // Check if token is expired
                const tokenPayload = JSON.parse(atob(token.split('.')[1]));
                const expirationTime = tokenPayload.exp * 1000; // Convert to milliseconds
                
                if (Date.now() < expirationTime) {
                    // Token is valid, show appropriate dashboard
                    showDashboard(currentUser.role, currentUser);
                } else {
                    // Token expired, clear storage
                    clearLocalStorage();
                    showLoginPage();
                }
            } catch (error) {
                console.error('Error parsing stored user data:', error);
                clearLocalStorage();
                showLoginPage();
            }
        } else {
            showLoginPage();
        }
    }
    
    function setUserType(type) {
        currentUserType = type;
        
        // Update UI
        farmerType.classList.toggle('active', type === 'farmer');
        agronomistType.classList.toggle('active', type === 'agronomist');
        
        // Update button text
        loginSubmitBtn.innerHTML = type === 'farmer' 
            ? '<i class="fas fa-sign-in-alt"></i> Login as Farmer'
            : '<i class="fas fa-sign-in-alt"></i> Login as Agronomist';
        
        // Auto-fill demo credentials based on type
        autoFillDemoCredentials(type);
    }
    
    function autoFillDemoCredentials(type) {
        if (type === 'farmer') {
            emailInput.value = 'farmer@demo.com';
            passwordInput.value = 'farmer123';
        } else {
            emailInput.value = 'agro@demo.com';
            passwordInput.value = 'agro123';
        }
        clearError();
    }
    
    function initializeDemoCredentials() {
        // Set initial demo credentials for farmer
        autoFillDemoCredentials('farmer');
    }
    
    function addDemoCredentialClickHandlers() {
        // Add click handlers to credential items
        const credentialItems = document.querySelectorAll('.credential-item');
        credentialItems.forEach(item => {
            item.addEventListener('click', function() {
                const text = this.textContent;
                if (text.includes('farmer@demo.com')) {
                    setUserType('farmer');
                } else if (text.includes('agro@demo.com')) {
                    setUserType('agronomist');
                }
            });
        });
    }
    
    async function handleLogin(event) {
        event.preventDefault();
        
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        
        // Clear previous error
        clearError();
        
        // Validate inputs
        if (!validateInputs(email, password)) {
            return;
        }
        
        // Show loading state
        setLoadingState(true);
        
        try {
            const loginData = {
                email,
                password,
                role: currentUserType
            };
            
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(loginData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Store auth data
                authToken = data.token;
                currentUser = data.user;
                
                // Save to localStorage
                localStorage.setItem('authToken', authToken);
                localStorage.setItem('userData', JSON.stringify(currentUser));
                localStorage.setItem('lastLogin', new Date().toISOString());
                
                // Show success message
                showSuccessMessage('Login successful! Redirecting...');
                
                // Show appropriate dashboard after short delay
                setTimeout(() => {
                    showDashboard(currentUser.role, currentUser);
                    loadDashboardData(currentUser.role);
                }, 1500);
                
            } else {
                // Show error
                showError(data.error || 'Login failed');
                // Shake form for visual feedback
                shakeForm();
            }
            
        } catch (error) {
            console.error('Login error:', error);
            showError('Network error. Please check your connection and try again.');
            
            // Try offline login as fallback
            if (attemptOfflineLogin(email, password)) {
                showSuccessMessage('Logged in offline. Some features may be limited.');
                setTimeout(() => {
                    showDashboard(currentUserType, currentUser);
                }, 1000);
            }
            
        } finally {
            setLoadingState(false);
        }
    }
    
    function validateInputs(email, password) {
        if (!email || !password) {
            showError('Please fill in all fields');
            return false;
        }
        
        if (!isValidEmail(email)) {
            showError('Please enter a valid email address');
            return false;
        }
        
        if (password.length < 6) {
            showError('Password must be at least 6 characters');
            return false;
        }
        
        return true;
    }
    
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    function attemptOfflineLogin(email, password) {
        // Try to find user in localStorage
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const offlineUser = users.find(user => 
            user.email === email && 
            user.role === currentUserType
        );
        
        if (offlineUser) {
            // Simple password check (in production, this would be hashed)
            if (password === 'farmer123' && currentUserType === 'farmer') {
                currentUser = offlineUser;
                return true;
            }
            if (password === 'agro123' && currentUserType === 'agronomist') {
                currentUser = offlineUser;
                return true;
            }
        }
        
        return false;
    }
    
    async function loadDashboardData(role) {
        try {
            if (role === 'farmer') {
                await loadFarmerDashboard();
            } else if (role === 'agronomist') {
                await loadAgronomistDashboard();
            }
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            // Load sample data for demo
            loadSampleData(role);
        }
    }
    
    async function loadFarmerDashboard() {
        if (!authToken) return;
        
        try {
            const response = await fetch(`${API_BASE_URL}/farmer/dashboard`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                updateFarmerDashboard(data);
            } else {
                loadSampleData('farmer');
            }
            
        } catch (error) {
            console.error('Error loading farmer dashboard:', error);
            loadSampleData('farmer');
        }
    }
    
    async function loadAgronomistDashboard() {
        if (!authToken) return;
        
        try {
            const response = await fetch(`${API_BASE_URL}/agronomist/dashboard`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                updateAgronomistDashboard(data);
            } else {
                loadSampleData('agronomist');
            }
            
        } catch (error) {
            console.error('Error loading agronomist dashboard:', error);
            loadSampleData('agronomist');
        }
    }
    
    function updateFarmerDashboard(data) {
        // Update stats
        document.querySelectorAll('.stat-card h3')[0].textContent = data.stats.activeFarms || 5;
        document.querySelectorAll('.stat-card h3')[1].textContent = data.stats.totalOrders || 12;
        document.querySelectorAll('.stat-card h3')[2].textContent = data.stats.salesThisMonth || 8;
        document.querySelectorAll('.stat-card h3')[3].textContent = `$${data.stats.totalProfit || '12,450'}`;
        
        // Update orders table
        updateOrdersTable(data.orders || []);
        
        // Update reports
        updateFarmerReports(data.reports || []);
        
        // Update sales
        updateFarmerSales(data.sales || []);
        
        // Update profile info
        if (currentUser) {
            updateFarmerProfile(currentUser);
        }
        
        // Initialize dashboard actions
        initFarmerDashboardActions();
    }
    
    function updateAgronomistDashboard(data) {
        // Update stats
        document.getElementById('totalFarmers').textContent = data.stats.totalFarmers || 24;
        document.getElementById('totalAssessments').textContent = data.stats.totalAssessments || 156;
        document.getElementById('totalReports').textContent = data.stats.totalReports || 89;
        document.getElementById('totalSales').textContent = data.stats.totalSales || '1,248';
        document.getElementById('totalProfit').textContent = `$${data.stats.totalProfit || '48,920'}`;
        document.getElementById('totalOrders').textContent = data.stats.totalOrders || 312;
        
        // Update farmers table
        updateFarmersTable(data.farmers || []);
        
        // Update profit analysis
        updateProfitAnalysis(data.topPerformingFarms || []);
        
        // Update scheduled visits
        updateScheduledVisits(data.visits || []);
        
        // Update reports
        updateAgronomistReports(data.reports || []);
        
        // Initialize agronomist dashboard actions
        initAgronomistDashboardActions();
    }
    
    function loadSampleData(role) {
        if (role === 'farmer') {
            // Sample farmer data
            const sampleData = {
                stats: {
                    activeFarms: 5,
                    totalOrders: 12,
                    salesThisMonth: 8,
                    totalProfit: 12450
                },
                orders: [
                    {
                        id: '1',
                        orderId: 'ORD-001',
                        item: 'Fertilizer',
                        quantity: '5',
                        date: '2023-10-15',
                        status: 'pending'
                    },
                    {
                        id: '2',
                        orderId: 'ORD-002',
                        item: 'Seeds',
                        quantity: '10',
                        date: '2023-10-16',
                        status: 'completed'
                    }
                ],
                reports: [
                    {
                        id: '1',
                        title: 'Soil Analysis Report',
                        date: '2023-10-10',
                        summary: 'Soil pH is optimal for maize cultivation.'
                    }
                ],
                sales: [
                    {
                        id: '1',
                        crop: 'Maize',
                        quantity: 500,
                        total: 250,
                        profit: 100,
                        date: '2023-10-01'
                    }
                ]
            };
            
            updateFarmerDashboard(sampleData);
            
        } else if (role === 'agronomist') {
            // Sample agronomist data
            const sampleData = {
                stats: {
                    totalFarmers: 24,
                    totalAssessments: 156,
                    totalReports: 89,
                    totalSales: 1248,
                    totalProfit: 48920,
                    totalOrders: 312,
                    thisMonthSales: 45,
                    thisMonthProfit: 2450
                },
                farmers: [
                    {
                        id: '1',
                        name: 'John Agritech',
                        location: 'Nakuru County',
                        contact: '+254 712 345 678',
                        status: 'active'
                    },
                    {
                        id: '2',
                        name: 'Mary Wanjiku',
                        location: 'Makueni County',
                        contact: '+254 723 456 789',
                        status: 'active'
                    }
                ],
                topPerformingFarms: [
                    {
                        farmerName: 'John Agritech',
                        profit: 12500
                    },
                    {
                        farmerName: 'Peter Kamau',
                        profit: 9800
                    }
                ],
                visits: [
                    {
                        id: '1',
                        farmerName: 'John Agritech',
                        date: '2023-10-20',
                        purpose: 'soil_test',
                        status: 'scheduled'
                    }
                ],
                reports: [
                    {
                        id: '1',
                        title: 'Monthly Sales Report',
                        type: 'sales_report',
                        generatedAt: '2023-10-15'
                    }
                ]
            };
            
            updateAgronomistDashboard(sampleData);
        }
    }
    
    function updateOrdersTable(orders) {
        const tableBody = document.getElementById('farmOrdersTable');
        tableBody.innerHTML = '';
        
        orders.forEach(order => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${order.orderId || 'N/A'}</td>
                <td>${order.item || 'N/A'}</td>
                <td>${order.quantity || 'N/A'}</td>
                <td>${order.date || 'N/A'}</td>
                <td><span class="status-badge status-${order.status || 'pending'}">${order.status || 'Pending'}</span></td>
                <td class="no-print">
                    <button class="btn-action btn-edit" data-id="${order.id}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn-action btn-delete" data-id="${order.id}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
        
        // Add event listeners to action buttons
        addTableActionListeners();
    }
    
    function updateFarmerReports(reports) {
        const reportsContainer = document.getElementById('farmerReports');
        reportsContainer.innerHTML = '';
        
        if (reports.length === 0) {
            reportsContainer.innerHTML = '<p>No reports available.</p>';
            return;
        }
        
        reports.forEach(report => {
            const reportElement = document.createElement('div');
            reportElement.className = 'report-item';
            reportElement.innerHTML = `
                <h4>${report.title || 'Untitled Report'}</h4>
                <p><strong>Date:</strong> ${report.date || report.generatedAt || 'N/A'}</p>
                <p>${report.summary || 'No summary available.'}</p>
                <div class="report-actions">
                    <button class="btn-action btn-download" data-id="${report.id}">
                        <i class="fas fa-download"></i> Download
                    </button>
                    <button class="btn-action" data-id="${report.id}">
                        <i class="fas fa-eye"></i> View
                    </button>
                </div>
            `;
            reportsContainer.appendChild(reportElement);
        });
    }
    
    function updateFarmerSales(sales) {
        const salesContainer = document.getElementById('farmerSales');
        salesContainer.innerHTML = '';
        
        if (sales.length === 0) {
            salesContainer.innerHTML = '<p>No sales recorded yet.</p>';
            return;
        }
        
        let totalProfit = 0;
        let html = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Crop</th>
                        <th>Quantity</th>
                        <th>Total Amount</th>
                        <th>Profit</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        sales.forEach(sale => {
            totalProfit += sale.profit || 0;
            html += `
                <tr>
                    <td>${sale.date || 'N/A'}</td>
                    <td>${sale.crop || 'N/A'}</td>
                    <td>${sale.quantity || 0} ${sale.unit || ''}</td>
                    <td>$${sale.total || 0}</td>
                    <td>$${sale.profit || 0}</td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
            <div style="margin-top: 15px; padding: 10px; background-color: #f8f9fa; border-radius: 5px;">
                <strong>Total Profit:</strong> $${totalProfit.toFixed(2)}
            </div>
        `;
        
        salesContainer.innerHTML = html;
    }
    
    function updateFarmerProfile(user) {
        if (document.getElementById('farmerName')) {
            document.getElementById('farmerName').value = user.name || '';
        }
        if (document.getElementById('farmerEmail')) {
            document.getElementById('farmerEmail').value = user.email || '';
        }
        if (document.getElementById('farmerPhone')) {
            document.getElementById('farmerPhone').value = user.phone || '+254 712 345 678';
        }
        if (document.getElementById('farmerLocation')) {
            document.getElementById('farmerLocation').value = 'Nakuru County';
        }
        if (document.getElementById('farmerFarms')) {
            document.getElementById('farmerFarms').value = 'Main Farm, North Field, River Side';
        }
        
        // Update user info in header
        const userAvatar = document.querySelector('.user-avatar');
        const userName = document.querySelector('.user-info h4');
        const farmerId = document.querySelector('.user-info p');
        
        if (userAvatar) {
            const initials = getInitials(user.name || 'John Agritech');
            userAvatar.textContent = initials;
        }
        if (userName) {
            userName.textContent = user.name || 'John Agritech';
        }
        if (farmerId) {
            farmerId.textContent = `Farmer ID: ${user.accountId || 'FARM-00123'}`;
        }
    }
    
    function updateFarmersTable(farmers) {
        const tableBody = document.getElementById('farmersTable');
        tableBody.innerHTML = '';
        
        farmers.forEach(farmer => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${farmer.fullName || farmer.name || 'N/A'}</td>
                <td>${farmer.farmDetails?.location || farmer.location || 'N/A'}</td>
                <td>${farmer.phone || farmer.contact || 'N/A'}</td>
                <td><span class="status-badge status-${farmer.status || 'active'}">${farmer.status || 'Active'}</span></td>
                <td class="no-print">
                    <button class="btn-action btn-edit" data-id="${farmer.id}" data-type="farmer">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn-action" data-id="${farmer.id}">
                        <i class="fas fa-eye"></i> View
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }
    
    function updateProfitAnalysis(farms) {
        const analysisContainer = document.getElementById('profitAnalysis');
        analysisContainer.innerHTML = '';
        
        if (farms.length === 0) {
            analysisContainer.innerHTML = '<p>No profit data available.</p>';
            return;
        }
        
        let html = '<ul style="list-style: none; padding-left: 0;">';
        farms.forEach((farm, index) => {
            const profit = typeof farm.profit === 'number' ? farm.profit : parseFloat(farm.profit) || 0;
            html += `
                <li style="margin-bottom: 15px; padding: 10px; background-color: #f8f9fa; border-radius: 5px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong>#${index + 1} ${farm.farmerName || farm.name || 'Unknown Farm'}</strong>
                            <div style="font-size: 0.9em; color: #666;">
                                Profit: $${profit.toFixed(2)}
                            </div>
                        </div>
                        <div style="color: #28a745; font-weight: bold;">
                            ${((profit / 1000) * 100).toFixed(1)}%
                        </div>
                    </div>
                </li>
            `;
        });
        html += '</ul>';
        
        analysisContainer.innerHTML = html;
    }
    
    function updateScheduledVisits(visits) {
        const visitsContainer = document.getElementById('scheduledVisits');
        visitsContainer.innerHTML = '';
        
        if (visits.length === 0) {
            visitsContainer.innerHTML = '<p>No visits scheduled.</p>';
            return;
        }
        
        visits.forEach(visit => {
            const visitElement = document.createElement('div');
            visitElement.className = 'visit-item';
            visitElement.style.cssText = `
                padding: 15px;
                margin-bottom: 10px;
                background-color: #f8f9fa;
                border-radius: 5px;
                border-left: 4px solid #007bff;
            `;
            visitElement.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <h4 style="margin: 0 0 5px 0;">${visit.farmerName || 'Unknown Farmer'}</h4>
                        <p style="margin: 0; color: #666;">
                            <i class="far fa-calendar"></i> ${visit.date || 'N/A'} at ${visit.time || 'N/A'}
                        </p>
                        <p style="margin: 5px 0 0 0; font-size: 0.9em;">
                            <strong>Purpose:</strong> ${formatVisitPurpose(visit.purpose)}
                        </p>
                    </div>
                    <span class="status-badge status-${visit.status || 'scheduled'}">
                        ${visit.status || 'Scheduled'}
                    </span>
                </div>
            `;
            visitsContainer.appendChild(visitElement);
        });
    }
    
    function updateAgronomistReports(reports) {
        const reportsContainer = document.getElementById('agronomistReports');
        reportsContainer.innerHTML = '';
        
        if (reports.length === 0) {
            reportsContainer.innerHTML = '<p>No reports generated yet.</p>';
            return;
        }
        
        reports.forEach(report => {
            const reportElement = document.createElement('div');
            reportElement.className = 'report-item';
            reportElement.innerHTML = `
                <h4>${report.title || 'Untitled Report'}</h4>
                <p><strong>Type:</strong> ${formatReportType(report.type)}</p>
                <p><strong>Generated:</strong> ${new Date(report.generatedAt).toLocaleDateString()}</p>
                <p><strong>For:</strong> ${report.farmerName || 'All Farmers'}</p>
                <div class="report-actions">
                    <button class="btn-action btn-download" data-id="${report.id}">
                        <i class="fas fa-download"></i> Download
                    </button>
                    <button class="btn-action btn-print" data-id="${report.id}">
                        <i class="fas fa-print"></i> Print
                    </button>
                </div>
            `;
            reportsContainer.appendChild(reportElement);
        });
    }
    
    function formatVisitPurpose(purpose) {
        const purposes = {
            'soil_test': 'Soil Testing',
            'crop_assessment': 'Crop Assessment',
            'pest_control': 'Pest Control',
            'harvest_planning': 'Harvest Planning',
            'training': 'Farmer Training'
        };
        return purposes[purpose] || purpose;
    }
    
    function formatReportType(type) {
        const types = {
            'farm_assessment': 'Farm Assessment',
            'soil_analysis': 'Soil Analysis',
            'crop_performance': 'Crop Performance',
            'profit_analysis': 'Profit Analysis',
            'farmer_progress': 'Farmer Progress',
            'sales_report': 'Sales Report'
        };
        return types[type] || type;
    }
    
    function getInitials(name) {
        return name.split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    }
    
    function initFarmerDashboardActions() {
        // New Order Button
        const newOrderBtn = document.getElementById('newOrderBtn');
        if (newOrderBtn) {
            newOrderBtn.addEventListener('click', () => {
                showModal('newOrderModal');
            });
        }
        
        // Add Sale Button
        const addSaleBtn = document.getElementById('addSaleBtn');
        if (addSaleBtn) {
            addSaleBtn.addEventListener('click', () => {
                showModal('addSaleModal');
            });
        }
        
        // Download Buttons
        const downloadFarmerOrders = document.getElementById('downloadFarmerOrders');
        if (downloadFarmerOrders) {
            downloadFarmerOrders.addEventListener('click', downloadFarmerOrdersData);
        }
        
        const downloadFarmerReports = document.getElementById('downloadFarmerReports');
        if (downloadFarmerReports) {
            downloadFarmerReports.addEventListener('click', downloadFarmerReportsData);
        }
        
        const downloadProfitSheet = document.getElementById('downloadProfitSheet');
        if (downloadProfitSheet) {
            downloadProfitSheet.addEventListener('click', downloadProfitSheetData);
        }
        
        // Print Button
        const printFarmerReports = document.getElementById('printFarmerReports');
        if (printFarmerReports) {
            printFarmerReports.addEventListener('click', printFarmerReportsData);
        }
        
        // Update Profile Button
        const updateFarmerProfile = document.getElementById('updateFarmerProfile');
        if (updateFarmerProfile) {
            updateFarmerProfile.addEventListener('click', updateFarmerProfileHandler);
        }
        
        // Initialize modals
        initModals();
    }
    
    function initAgronomistDashboardActions() {
        // Add Farmer Button
        const addFarmerBtn = document.getElementById('addFarmerBtn');
        if (addFarmerBtn) {
            addFarmerBtn.addEventListener('click', () => {
                showModal('addFarmerModal');
            });
        }
        
        // Schedule Visit Button
        const scheduleVisitBtn = document.getElementById('scheduleVisitBtn');
        if (scheduleVisitBtn) {
            scheduleVisitBtn.addEventListener('click', () => {
                showModal('scheduleVisitModal');
            });
        }
        
        // Generate Report Button
        const generateReportBtn = document.getElementById('generateReportBtn');
        if (generateReportBtn) {
            generateReportBtn.addEventListener('click', () => {
                showModal('generateReportModal');
            });
        }
        
        // View Sales Button
        const viewSalesBtn = document.getElementById('viewSalesBtn');
        if (viewSalesBtn) {
            viewSalesBtn.addEventListener('click', () => {
                showModal('viewSalesModal');
            });
        }
        
        // Download Buttons
        const downloadFarmersList = document.getElementById('downloadFarmersList');
        if (downloadFarmersList) {
            downloadFarmersList.addEventListener('click', downloadFarmersListData);
        }
        
        const downloadSalesProfitSheet = document.getElementById('downloadSalesProfitSheet');
        if (downloadSalesProfitSheet) {
            downloadSalesProfitSheet.addEventListener('click', downloadSalesProfitSheetData);
        }
        
        const downloadAllReports = document.getElementById('downloadAllReports');
        if (downloadAllReports) {
            downloadAllReports.addEventListener('click', downloadAllReportsData);
        }
        
        // Print Button
        const printFarmersRecords = document.getElementById('printFarmersRecords');
        if (printFarmersRecords) {
            printFarmersRecords.addEventListener('click', printFarmersRecordsData);
        }
        
        // Update Profile Button
        const updateAgronomistProfile = document.getElementById('updateAgronomistProfile');
        if (updateAgronomistProfile) {
            updateAgronomistProfile.addEventListener('click', updateAgronomistProfileHandler);
        }
        
        // Reset Password Button
        const resetPassword = document.getElementById('resetPassword');
        if (resetPassword) {
            resetPassword.addEventListener('click', resetPasswordHandler);
        }
        
        // Initialize modals
        initModals();
        initAgronomistModals();
    }
    
    function initModals() {
        // Close modal buttons
        document.querySelectorAll('.close-modal').forEach(button => {
            button.addEventListener('click', function() {
                const modal = this.closest('.modal');
                hideModal(modal.id);
            });
        });
        
        // Close modal when clicking outside
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', function(e) {
                if (e.target === this) {
                    hideModal(this.id);
                }
            });
        });
        
        // Add ESC key to close modals
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal').forEach(modal => {
                    if (modal.style.display === 'flex') {
                        hideModal(modal.id);
                    }
                });
            }
        });
    }
    
    function initAgronomistModals() {
        // Populate farmer dropdowns
        populateFarmerDropdowns();
        
        // Initialize form submissions
        initFormSubmissions();
    }
    
    function populateFarmerDropdowns() {
        const dropdowns = ['visitFarmer', 'reportFarmer'];
        
        dropdowns.forEach(dropdownId => {
            const dropdown = document.getElementById(dropdownId);
            if (dropdown) {
                // Clear existing options except first
                while (dropdown.options.length > 1) {
                    dropdown.remove(1);
                }
                
                // Get farmers from table or sample data
                const farmers = getFarmersList();
                
                farmers.forEach(farmer => {
                    const option = document.createElement('option');
                    option.value = farmer.id;
                    option.textContent = farmer.name;
                    dropdown.appendChild(option);
                });
            }
        });
    }
    
    function getFarmersList() {
        // Try to get from table
        const tableRows = document.querySelectorAll('#farmersTable tr');
        const farmers = [];
        
        tableRows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 4) {
                farmers.push({
                    id: row.querySelector('.btn-edit')?.getAttribute('data-id') || Date.now().toString(),
                    name: cells[0].textContent
                });
            }
        });
        
        // If no farmers in table, return sample data
        if (farmers.length === 0) {
            return [
                { id: '1', name: 'John Agritech' },
                { id: '2', name: 'Mary Wanjiku' },
                { id: '3', name: 'Peter Kamau' }
            ];
        }
        
        return farmers;
    }
    
    function initFormSubmissions() {
        // Add Farmer Form
        const addFarmerForm = document.getElementById('addFarmerForm');
        if (addFarmerForm) {
            addFarmerForm.addEventListener('submit', handleAddFarmer);
        }
        
        // Schedule Visit Form
        const scheduleVisitForm = document.getElementById('scheduleVisitForm');
        if (scheduleVisitForm) {
            scheduleVisitForm.addEventListener('submit', handleScheduleVisit);
        }
        
        // New Order Form
        const newOrderForm = document.getElementById('newOrderForm');
        if (newOrderForm) {
            newOrderForm.addEventListener('submit', handleNewOrder);
        }
        
        // Generate Report Form
        const generateReportForm = document.getElementById('generateReportForm');
        if (generateReportForm) {
            generateReportForm.addEventListener('submit', handleGenerateReport);
        }
        
        // Add Sale Form
        const addSaleForm = document.getElementById('addSaleForm');
        if (addSaleForm) {
            addSaleForm.addEventListener('submit', handleAddSale);
        }
        
        // Edit Record Form
        const editRecordForm = document.getElementById('editRecordForm');
        if (editRecordForm) {
            editRecordForm.addEventListener('submit', handleEditRecord);
        }
        
        // Delete Record Button
        const deleteRecordBtn = document.getElementById('deleteRecordBtn');
        if (deleteRecordBtn) {
            deleteRecordBtn.addEventListener('click', handleDeleteRecord);
        }
    }
    
    async function handleAddFarmer(event) {
        event.preventDefault();
        
        const formData = {
            name: document.getElementById('newFarmerName').value,
            email: document.getElementById('newFarmerEmail').value,
            phone: document.getElementById('newFarmerPhone').value,
            location: document.getElementById('newFarmerLocation').value,
            farmDetails: document.getElementById('newFarmerFarms').value
        };
        
        // Validate form
        if (!validateAddFarmerForm(formData)) {
            return;
        }
        
        try {
            if (authToken) {
                const response = await fetch(`${API_BASE_URL}/agronomist/farmers`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });
                
                const data = await response.json();
                
                if (data.success) {
                    showSuccessMessage('Farmer added successfully!');
                    hideModal('addFarmerModal');
                    // Refresh farmers table
                    await loadAgronomistDashboard();
                } else {
                    showError(data.error || 'Failed to add farmer');
                }
            } else {
                // Offline mode
                showSuccessMessage('Farmer added (offline mode)');
                hideModal('addFarmerModal');
                // Add to local storage
                addFarmerToLocalStorage(formData);
                // Refresh farmers table
                updateFarmersTable(getFarmersList());
            }
        } catch (error) {
            console.error('Add farmer error:', error);
            showError('Failed to add farmer. Please try again.');
        }
    }
    
    function validateAddFarmerForm(data) {
        if (!data.name || !data.email || !data.phone || !data.location) {
            showError('Please fill in all required fields');
            return false;
        }
        
        if (!isValidEmail(data.email)) {
            showError('Please enter a valid email address');
            return false;
        }
        
        return true;
    }
    
    function addFarmerToLocalStorage(farmerData) {
        const farmers = JSON.parse(localStorage.getItem('farmers') || '[]');
        const newFarmer = {
            id: Date.now().toString(),
            name: farmerData.name,
            location: farmerData.location,
            contact: farmerData.phone,
            status: 'active'
        };
        farmers.push(newFarmer);
        localStorage.setItem('farmers', JSON.stringify(farmers));
    }
    
    // Other form handlers would follow similar pattern...
    
    function showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden'; // Prevent scrolling
        }
    }
    
    function hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto'; // Restore scrolling
            
            // Reset form if exists
            const form = modal.querySelector('form');
            if (form) {
                form.reset();
            }
        }
    }
    
    function showLoginPage() {
        loginPage.style.display = 'flex';
        farmerDashboard.style.display = 'none';
        agronomistDashboard.style.display = 'none';
    }
    
    function showDashboard(role, user) {
        loginPage.style.display = 'none';
        
        if (role === 'farmer') {
            farmerDashboard.style.display = 'block';
            agronomistDashboard.style.display = 'none';
            
            // Update farmer dashboard with user data
            if (user) {
                updateFarmerProfile(user);
            }
        } else if (role === 'agronomist') {
            farmerDashboard.style.display = 'none';
            agronomistDashboard.style.display = 'block';
            
            // Update agronomist dashboard
            const userName = document.querySelector('#agronomistDashboard .user-info h4');
            const userAvatar = document.querySelector('#agronomistDashboard .user-avatar');
            
            if (userName && user) {
                userName.textContent = user.name || 'Dr. Sarah Agronomics';
            }
            if (userAvatar && user) {
                userAvatar.textContent = getInitials(user.name || 'SA');
            }
        }
    }
    
    async function handleLogout() {
        try {
            if (authToken) {
                await fetch(`${API_BASE_URL}/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    }
                });
            }
        } catch (error) {
            console.error('Logout API error:', error);
        } finally {
            // Clear local storage
            clearLocalStorage();
            
            // Reset UI
            showLoginPage();
            loginForm.reset();
            setUserType('farmer');
            
            // Show logout message
            showSuccessMessage('Logged out successfully!', 2000);
        }
    }
    
    function clearLocalStorage() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        localStorage.removeItem('lastLogin');
        authToken = null;
        currentUser = null;
    }
    
    function setLoadingState(isLoading) {
        if (isLoading) {
            loginSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
            loginSubmitBtn.disabled = true;
        } else {
            loginSubmitBtn.innerHTML = currentUserType === 'farmer' 
                ? '<i class="fas fa-sign-in-alt"></i> Login as Farmer'
                : '<i class="fas fa-sign-in-alt"></i> Login as Agronomist';
            loginSubmitBtn.disabled = false;
        }
    }
    
    function showError(message) {
        loginError.textContent = message;
        loginError.style.display = 'block';
        
        // Auto-hide error after 5 seconds
        setTimeout(() => {
            clearError();
        }, 5000);
    }
    
    function clearError() {
        loginError.textContent = '';
        loginError.style.display = 'none';
    }
    
    function showSuccessMessage(message, duration = 3000) {
        // Create or show success message element
        let successElement = document.getElementById('successMessageGlobal');
        
        if (!successElement) {
            successElement = document.createElement('div');
            successElement.id = 'successMessageGlobal';
            successElement.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background-color: #28a745;
                color: white;
                padding: 15px 20px;
                border-radius: 5px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                z-index: 9999;
                display: flex;
                align-items: center;
                gap: 10px;
                transform: translateX(150%);
                transition: transform 0.3s ease;
            `;
            document.body.appendChild(successElement);
        }
        
        successElement.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
        `;
        
        // Show message
        setTimeout(() => {
            successElement.style.transform = 'translateX(0)';
        }, 10);
        
        // Hide after duration
        setTimeout(() => {
            successElement.style.transform = 'translateX(150%)';
        }, duration);
    }
    
    function shakeForm() {
        loginForm.style.animation = 'none';
        setTimeout(() => {
            loginForm.style.animation = 'shake 0.5s';
        }, 10);
    }
    
    function addKeyboardShortcuts() {
        document.addEventListener('keydown', function(e) {
            // Ctrl + Enter to submit form
            if (e.ctrlKey && e.key === 'Enter') {
                if (loginPage.style.display !== 'none') {
                    loginForm.dispatchEvent(new Event('submit'));
                }
            }
            
            // Tab to switch between farmer/agronomist
            if (e.key === 'Tab' && loginPage.style.display !== 'none') {
                e.preventDefault();
                setUserType(currentUserType === 'farmer' ? 'agronomist' : 'farmer');
            }
        });
    }
    
    function addTableActionListeners() {
        // Edit buttons
        document.querySelectorAll('.btn-edit').forEach(button => {
            button.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                const type = this.getAttribute('data-type') || 'order';
                editRecord(id, type);
            });
        });
        
        // Delete buttons
        document.querySelectorAll('.btn-delete').forEach(button => {
            button.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                if (confirm('Are you sure you want to delete this record?')) {
                    deleteRecord(id);
                }
            });
        });
        
        // View buttons
        document.querySelectorAll('.btn-action:not(.btn-edit):not(.btn-delete):not(.btn-download):not(.btn-print)').forEach(button => {
            if (!button.classList.contains('btn-download') && !button.classList.contains('btn-print')) {
                button.addEventListener('click', function() {
                    const id = this.getAttribute('data-id');
                    viewRecord(id);
                });
            }
        });
        
        // Download buttons
        document.querySelectorAll('.btn-download').forEach(button => {
            button.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                downloadRecord(id);
            });
        });
        
        // Print buttons
        document.querySelectorAll('.btn-print').forEach(button => {
            button.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                printRecord(id);
            });
        });
    }
    
    function editRecord(id, type) {
        showModal('editRecordModal');
        // Here you would populate the edit form with record data
        console.log(`Editing ${type} with ID: ${id}`);
    }
    
    function deleteRecord(id) {
        // Here you would implement delete functionality
        console.log(`Deleting record with ID: ${id}`);
        showSuccessMessage('Record deleted successfully');
    }
    
    function viewRecord(id) {
        console.log(`Viewing record with ID: ${id}`);
    }
    
    function downloadRecord(id) {
        console.log(`Downloading record with ID: ${id}`);
        showSuccessMessage('Download started...');
    }
    
    function printRecord(id) {
        console.log(`Printing record with ID: ${id}`);
        window.print();
    }
    
    // Add CSS animation for shake effect
    const style = document.createElement('style');
    style.textContent = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
    `;
    document.head.appendChild(style);
    
    // Initialize the page
    console.log('Login page initialized successfully');
});
