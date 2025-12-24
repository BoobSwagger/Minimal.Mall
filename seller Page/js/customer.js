// ==================== CONFIGURATION ====================
const API_BASE_URL = 'https://minimallbackend.onrender.com/api';

console.log('🔧 CONFIG - API Base URL:', API_BASE_URL);

// ==================== AUTH & TOKEN MANAGEMENT ====================

function getAuthToken() {
    const token = localStorage.getItem('authToken');
    console.log('🔑 AUTH - Token exists:', !!token);
    if (token) {
        console.log('🔑 AUTH - Token preview:', token.substring(0, 20) + '...');
    }
    return token;
}

function isAuthenticated() {
    const authenticated = !!getAuthToken();
    console.log('🔐 AUTH - Is authenticated:', authenticated);
    return authenticated;
}

function redirectToLogin() {
    console.log('🚪 REDIRECT - Redirecting to login page');
    window.location.href = '../login.html';
}

// ==================== API HELPERS ====================

async function apiRequest(endpoint, options = {}) {
    console.group('📡 API REQUEST');
    console.log('Endpoint:', endpoint);
    console.log('Full URL:', `${API_BASE_URL}${endpoint}`);
    console.log('Options:', options);
    
    const token = getAuthToken();
    
    const config = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    };
    
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
        console.log('✅ Authorization header added');
    } else {
        console.warn('⚠️ No authorization token found');
    }
    
    console.log('Request config:', JSON.stringify(config, null, 2));
    
    try {
        console.log('🚀 Sending request...');
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        
        console.log('📥 Response status:', response.status);
        console.log('📥 Response status text:', response.statusText);
        console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));
        
        // Handle 401 Unauthorized
        if (response.status === 401) {
            console.error('❌ 401 - Unauthorized - Token expired or invalid');
            localStorage.removeItem('authToken');
            console.log('🗑️ Token removed from localStorage');
            redirectToLogin();
            throw new Error('Session expired');
        }
        
        // Handle 403 Forbidden
        if (response.status === 403) {
            console.error('❌ 403 - Forbidden - Not a seller');
            const data = await response.json();
            console.error('403 Error details:', data);
            throw new Error(data.detail || 'You do not have seller access');
        }
        
        // Handle 422 Validation Error
        if (response.status === 422) {
            console.error('❌ 422 - Validation Error');
            const data = await response.json();
            console.error('422 Full error response:', JSON.stringify(data, null, 2));
            
            // Parse validation errors
            if (data.detail && Array.isArray(data.detail)) {
                console.error('Validation errors:');
                data.detail.forEach((err, idx) => {
                    console.error(`  [${idx}] Location: ${err.loc?.join(' -> ')}`);
                    console.error(`  [${idx}] Message: ${err.msg}`);
                    console.error(`  [${idx}] Type: ${err.type}`);
                });
                
                const errorMsg = data.detail.map(err => 
                    `${err.loc?.join('.')}: ${err.msg}`
                ).join(', ');
                throw new Error(errorMsg);
            } else if (data.detail) {
                console.error('Error detail:', data.detail);
                throw new Error(data.detail);
            }
            
            throw new Error('Validation error - Invalid request format');
        }
        
        // Parse response
        const data = await response.json();
        console.log('📦 Response data:', JSON.stringify(data, null, 2));
        
        if (!response.ok) {
            console.error('❌ Response not OK - Status:', response.status);
            throw new Error(data.detail || `HTTP ${response.status}`);
        }
        
        console.log('✅ Request successful');
        console.groupEnd();
        return data;
        
    } catch (error) {
        console.error('💥 API Request failed');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.groupEnd();
        throw error;
    }
}

// ==================== CUSTOMER DATA FETCHING ====================

async function fetchCustomerData() {
    console.group('👥 FETCH CUSTOMER DATA');
    
    try {
        showLoading(true);
        
        // Strategy 1: Try seller/orders endpoint variations
        console.log('📍 STRATEGY 1: Trying /seller/orders variations...');
        
        const strategies = [
            { name: 'No parameters', endpoint: '/seller/orders' },
            { name: 'With skip/limit', endpoint: '/seller/orders?skip=0&limit=100' },
            { name: 'Just limit=100', endpoint: '/seller/orders?limit=100' },
            { name: 'Alternative orders', endpoint: '/orders' },
            { name: 'User orders', endpoint: '/user/orders' },
        ];
        
        let response = null;
        let successStrategy = null;
        
        for (const strategy of strategies) {
            try {
                console.log(`\n🎯 Trying: ${strategy.name}`);
                console.log(`   Endpoint: ${strategy.endpoint}`);
                response = await apiRequest(strategy.endpoint);
                
                if (response) {
                    console.log('✅ Success with strategy:', strategy.name);
                    console.log('Response keys:', Object.keys(response));
                    successStrategy = strategy.name;
                    break;
                }
            } catch (err) {
                console.warn(`❌ Failed with ${strategy.name}:`, err.message);
                continue;
            }
        }
        
        if (!response) {
            throw new Error('All endpoint strategies failed');
        }
        
        console.log('\n📊 Response analysis:');
        console.log('  - Success flag:', response.success);
        console.log('  - Has orders array:', !!response.orders);
        console.log('  - Has data array:', !!response.data);
        console.log('  - Response type:', typeof response);
        console.log('  - Is array:', Array.isArray(response));
        
        // Extract orders from various response formats
        let orders = null;
        
        if (response.orders && Array.isArray(response.orders)) {
            console.log('✅ Found orders in response.orders');
            orders = response.orders;
        } else if (response.data && Array.isArray(response.data)) {
            console.log('✅ Found orders in response.data');
            orders = response.data;
        } else if (Array.isArray(response)) {
            console.log('✅ Response is directly an array');
            orders = response;
        } else {
            console.error('❌ Could not find orders array in response');
            console.log('Response structure:', JSON.stringify(response, null, 2));
            throw new Error('Invalid response format - no orders found');
        }
        
        console.log(`\n📦 Orders found: ${orders.length}`);
        
        if (orders.length > 0) {
            console.log('Sample order structure:', JSON.stringify(orders[0], null, 2));
        } else {
            console.log('⚠️ No orders in response - will show empty state');
        }
        
        const customers = processCustomerData(orders);
        console.log(`\n👥 Customers processed: ${customers.length}`);
        
        if (customers.length > 0) {
            console.log('Sample customer:', JSON.stringify(customers[0], null, 2));
        }
        
        displayCustomers(customers);
        console.log('✅ Customers displayed successfully');
        
    } catch (error) {
        console.error('💥 ERROR in fetchCustomerData');
        console.error('Error type:', error.constructor.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        // Provide detailed error message
        let errorMessage = 'Failed to load customer data.';
        
        if (error.message.includes('seller access') || error.message.includes('Forbidden')) {
            errorMessage = 'This page requires seller access. Your account may not be approved as a seller yet.';
            console.error('🔒 SELLER ACCESS ISSUE');
        } else if (error.message.includes('Session expired') || error.message.includes('Unauthorized')) {
            errorMessage = 'Your session has expired. Redirecting to login...';
            console.error('🔐 AUTHENTICATION ISSUE');
        } else if (error.message.includes('Validation')) {
            errorMessage = `API Validation Error: ${error.message}`;
            console.error('📋 VALIDATION ISSUE');
        } else if (error.message.includes('endpoint strategies failed')) {
            errorMessage = 'Could not connect to the API. All endpoint attempts failed. Check console for details.';
            console.error('🌐 CONNECTIVITY/ENDPOINT ISSUE');
        }
        
        showError(errorMessage);
        
    } finally {
        showLoading(false);
        console.groupEnd();
    }
}

function processCustomerData(orders) {
    console.group('⚙️ PROCESS CUSTOMER DATA');
    console.log('Processing orders:', orders.length);
    
    const customerMap = new Map();
    
    orders.forEach((order, idx) => {
        console.log(`\n📦 Order ${idx + 1}:`);
        console.log('  user_id:', order.user_id);
        console.log('  customer_email:', order.customer_email);
        console.log('  customer_name:', order.customer_name);
        console.log('  total_amount:', order.total_amount);
        console.log('  created_at:', order.created_at);
        
        const customerId = order.user_id;
        const customerEmail = order.customer_email || 'N/A';
        const customerName = order.customer_name || extractNameFromEmail(customerEmail);
        
        // Get total amount - API uses seller_subtotal instead of total_amount
        const orderTotal = parseFloat(order.total_amount || order.seller_subtotal || 0);
        console.log('  💰 Order total:', orderTotal);
        
        if (!customerId) {
            console.warn('  ⚠️ No user_id found, skipping order');
            return;
        }
        
        if (customerMap.has(customerId)) {
            console.log('  ♻️ Existing customer, updating stats');
            const customer = customerMap.get(customerId);
            customer.totalSpent += orderTotal;
            customer.orderCount++;
            
            const orderDate = new Date(order.created_at);
            if (orderDate > customer.lastOrderDate) {
                customer.lastOrder = formatDate(order.created_at);
                customer.lastOrderDate = orderDate;
                console.log('  📅 Updated last order date');
            }
        } else {
            console.log('  ✨ New customer, creating entry');
            customerMap.set(customerId, {
                id: customerId,
                name: customerName,
                email: customerEmail,
                totalSpent: orderTotal,
                orderCount: 1,
                lastOrder: formatDate(order.created_at),
                lastOrderDate: new Date(order.created_at),
                avatar: getInitials(customerName)
            });
        }
    });
    
    const customers = Array.from(customerMap.values()).sort((a, b) => b.totalSpent - a.totalSpent);
    console.log(`\n✅ Processed ${customers.length} unique customers`);
    console.groupEnd();
    
    return customers;
}

function extractNameFromEmail(email) {
    console.log('📧 Extracting name from email:', email);
    
    if (!email || email === 'N/A') {
        console.log('  → Unknown Customer');
        return 'Unknown Customer';
    }
    
    const username = email.split('@')[0];
    const name = username
        .split(/[._-]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    
    console.log('  → Extracted name:', name);
    return name;
}

function getInitials(name) {
    console.log('🔤 Getting initials for:', name);
    
    if (!name || name === 'Unknown Customer') {
        console.log('  → UC');
        return 'UC';
    }
    
    const parts = name.trim().split(' ');
    let initials;
    
    if (parts.length >= 2) {
        initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    } else {
        initials = name.substring(0, 2).toUpperCase();
    }
    
    console.log('  → Initials:', initials);
    return initials;
}

// ==================== UI RENDERING ====================

function displayCustomers(customers) {
    console.group('🎨 DISPLAY CUSTOMERS');
    console.log('Displaying customers:', customers.length);
    
    const tbody = document.querySelector('.custom-table tbody');
    
    if (!tbody) {
        console.error('❌ Table body element not found in DOM');
        console.groupEnd();
        return;
    }
    
    console.log('✅ Table body element found');
    
    if (customers.length === 0) {
        console.log('📭 No customers to display - showing empty state');
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-5">
                    <div class="text-muted">
                        <i class="fa-regular fa-user fa-3x mb-3 opacity-25"></i>
                        <p class="mb-0">No customers yet</p>
                        <small>Customers will appear here after they place orders</small>
                    </div>
                </td>
            </tr>
        `;
        console.groupEnd();
        return;
    }
    
    console.log('🔨 Building table rows...');
    
    tbody.innerHTML = customers.map((customer, index) => {
        console.log(`  Row ${index + 1}: ${customer.name} (${customer.email})`);
        
        return `
        <tr>
            <td>
                <div class="d-flex align-items-center gap-3">
                    <div class="customer-avatar ${getAvatarColor(index)}">
                        ${customer.avatar}
                    </div>
                    <div>
                        <span class="customer-name">${escapeHtml(customer.name)}</span>
                        <span class="customer-id">ID: #${customer.id}</span>
                    </div>
                </div>
            </td>
            <td>${escapeHtml(customer.email)}</td>
            <td class="fw-bold">$${customer.totalSpent.toFixed(2)}</td>
            <td>${customer.lastOrder}</td>
            <td>
                <button class="btn-mail" onclick="contactCustomer('${escapeHtml(customer.email)}', '${escapeHtml(customer.name)}')">
                    <i class="fa-regular fa-envelope"></i>
                </button>
            </td>
        </tr>
    `}).join('');
    
    console.log('✅ Table rendered successfully');
    console.groupEnd();
}

function getAvatarColor(index) {
    const colors = ['avatar-orange', 'avatar-blue', 'avatar-green', 'avatar-purple', 'avatar-pink'];
    return colors[index % colors.length];
}

// ==================== CUSTOMER ACTIONS ====================

function contactCustomer(email, name) {
    console.group('📧 CONTACT CUSTOMER');
    console.log('Email:', email);
    console.log('Name:', name);
    
    if (email === 'N/A') {
        console.warn('⚠️ No email available');
        showNotification('Email not available for this customer', 'warning');
        console.groupEnd();
        return;
    }
    
    const subject = encodeURIComponent(`Message from anko Store`);
    const body = encodeURIComponent(`Hello ${name},\n\n`);
    const mailtoLink = `mailto:${email}?subject=${subject}&body=${body}`;
    
    console.log('📨 Mailto link:', mailtoLink);
    window.location.href = mailtoLink;
    
    showNotification(`Opening email client to contact ${name}`, 'success');
    console.log('✅ Email client opened');
    console.groupEnd();
}

// ==================== UTILITY FUNCTIONS ====================

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showLoading(show) {
    console.log(show ? '⏳ Showing loading state' : '✅ Hiding loading state');
    
    const tbody = document.querySelector('.custom-table tbody');
    if (!tbody) return;
    
    if (show) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-3 text-muted mb-0">Loading customers...</p>
                </td>
            </tr>
        `;
    }
}

function showError(message) {
    console.error('🚨 SHOWING ERROR:', message);
    
    const tbody = document.querySelector('.custom-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr>
            <td colspan="5" class="text-center py-5">
                <div class="text-danger">
                    <i class="fa-solid fa-triangle-exclamation fa-3x mb-3"></i>
                    <p class="mb-2 fw-bold">${escapeHtml(message)}</p>
                    <small class="text-muted d-block mb-3">
                        Check the browser console for detailed error logs.
                    </small>
                    <button class="btn btn-sm btn-primary mt-2" onclick="fetchCustomerData()">
                        <i class="fa-solid fa-rotate-right me-1"></i> Retry
                    </button>
                </div>
            </td>
        </tr>
    `;
}

function showNotification(message, type = 'info') {
    console.log(`📢 NOTIFICATION [${type}]:`, message);
    
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// ==================== SEARCH FUNCTIONALITY ====================

function initializeSearch() {
    console.log('🔍 Initializing search functionality');
    
    const searchInput = document.querySelector('.header-search input');
    
    if (searchInput) {
        console.log('✅ Search input found');
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase().trim();
            console.log('🔎 Search term:', searchTerm);
            filterCustomers(searchTerm);
        });
    } else {
        console.warn('⚠️ Search input not found');
    }
}

function filterCustomers(searchTerm) {
    const rows = document.querySelectorAll('.custom-table tbody tr');
    let visibleCount = 0;
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });
    
    console.log(`🔍 Filter results: ${visibleCount}/${rows.length} rows visible`);
}

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', () => {
    console.clear();
    console.log('═'.repeat(60));
    console.log('🎯 CUSTOMER PAGE - DEBUG MODE');
    console.log('═'.repeat(60));
    console.log('Timestamp:', new Date().toISOString());
    console.log('User Agent:', navigator.userAgent);
    console.log('Current URL:', window.location.href);
    console.log('═'.repeat(60));
    
    // Check authentication
    console.log('\n🔐 AUTHENTICATION CHECK');
    if (!isAuthenticated()) {
        console.log('❌ Not authenticated');
        console.log('🚪 Redirecting to login...');
        redirectToLogin();
        return;
    }
    console.log('✅ User is authenticated');
    
    // Check DOM elements
    console.log('\n🏗️ DOM CHECK');
    const tbody = document.querySelector('.custom-table tbody');
    const searchInput = document.querySelector('.header-search input');
    console.log('Table body exists:', !!tbody);
    console.log('Search input exists:', !!searchInput);
    
    // Initialize page
    console.log('\n🚀 INITIALIZING PAGE');
    initializeSearch();
    fetchCustomerData();
    
    console.log('\n✅ Customer page initialization complete');
    console.log('═'.repeat(60));
});

// Make functions available globally
window.contactCustomer = contactCustomer;
window.fetchCustomerData = fetchCustomerData;

console.log('📜 customer.js loaded successfully');  