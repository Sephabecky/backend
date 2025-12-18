// script.js - Frontend updates for API integration
const API_BASE_URL = "https://agronomy-backend-ehk1.onrender.com";

// Store token globally
let authToken = null;
let currentUser = null;

// Update login function
async function loginUser(email, password, role) {
    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password, role })
        });
        
        const data = await response.json();
        
        if (data.success) {
            authToken = data.token;
            currentUser = data.user;
            
            // Store in localStorage
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('user', JSON.stringify(currentUser));
            
            return { success: true, user: currentUser };
        } else {
            return { success: false, error: data.error };
        }
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: 'Network error' };
    }
}

// API request helper with authentication
async function makeRequest(endpoint, method = 'GET', body = null) {
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const options = {
        method,
        headers,
        credentials: 'include'
    };
    
    if (body) {
        options.body = JSON.stringify(body);
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        return await response.json();
    } catch (error) {
        console.error('API request error:', error);
        return { success: false, error: 'Network error' };
    }
}

// Example: Load farmer dashboard
async function loadFarmerDashboard() {
    const data = await makeRequest('/farmer/dashboard');
    if (data.success) {
        // Update UI with data
        updateStats(data.stats);
        populateOrdersTable(data.orders);
        populateReports(data.reports);
        populateSales(data.sales);
    }
}

// Example: Submit new order
async function submitNewOrder(orderData) {
    const data = await makeRequest('/farmer/order', 'POST', orderData);
    if (data.success) {
        showNotification('Order submitted successfully!');
        loadFarmerDashboard(); // Refresh data
    } else {
        showNotification(`Error: ${data.error}`, 'error');
    }
}

// Add event listeners to your forms
document.getElementById('newOrderForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const orderData = {
        item: document.getElementById('orderItem').value,
        quantity: document.getElementById('orderQuantity').value,
        unit: document.getElementById('orderUnit').value,
        urgency: document.getElementById('orderUrgency').value,
        notes: document.getElementById('orderNotes').value
    };
    
    await submitNewOrder(orderData);
    closeModal('newOrderModal');

});
