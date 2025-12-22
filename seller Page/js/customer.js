// ==================== CONFIGURATION ====================
const API_BASE_URL = 'https://minimallbackend.onrender.com/api';

// ==================== AUTH & TOKEN MANAGEMENT ====================

function getAuthToken() {
    return localStorage.getItem('authToken');
}

function isAuthenticated() {
    return !!getAuthToken();
}

function redirectToLogin() {
    window.location.href = '../login.html';
}

// ==================== API HELPERS ====================

async function apiRequest(endpoint, options = {}) {
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
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        
        if (response.status === 401) {
            localStorage.removeItem('authToken');
            redirectToLogin();
            throw new Error('Session expired');
        }
        
        // Handle 403 Forbidden - Not a seller
        if (response.status === 403) {
            const data = await response.json();
            throw new Error(data.detail || 'You do not have seller access');
        }
        
        // Handle 422 Validation Error
        if (response.status === 422) {
            const data = await response.json();
            console.error('Validation error:', data);
            throw new Error('Invalid request - check if you have seller permissions');
        }
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || `HTTP ${response.status}`);
        }
        
        return data;
    } catch (error) {
        console.error('API Request failed:', error);
        throw error;
    }
}

// ==================== CUSTOMER DATA FETCHING ====================

async function fetchCustomerData() {
    try {
        showLoading(true);
        
        // Fetch all orders to extract customer information
        // Note: This endpoint requires SELLER access
        const response = await apiRequest('/seller/orders?limit=1000');
        
        if (response.success && response.orders) {
            const customers = processCustomerData(response.orders);
            displayCustomers(customers);
        } else {
            throw new Error('Failed to fetch customer data');
        }
        
    } catch (error) {
        console.error('Error fetching customers:', error);
        
        // Check if it's a permission error
        if (error.message.includes('seller access') || error.message.includes('seller permissions')) {
            showError('This page requires seller access. Please ensure you have an approved seller account.');
        } else {
            showError('Failed to load customer data. Please try again.');
        }
    } finally {
        showLoading(false);
    }
}

function processCustomerData(orders) {
    const customerMap = new Map();
    
    orders.forEach(order => {
        const customerId = order.user_id;
        const customerEmail = order.customer_email || 'N/A';
        const customerName = order.customer_name || extractNameFromEmail(customerEmail);
        
        if (customerMap.has(customerId)) {
            const customer = customerMap.get(customerId);
            customer.totalSpent += parseFloat(order.total_amount || 0);
            customer.orderCount++;
            
            // Update last order date if more recent
            const orderDate = new Date(order.created_at);
            if (orderDate > customer.lastOrderDate) {
                customer.lastOrder = formatDate(order.created_at);
                customer.lastOrderDate = orderDate;
            }
        } else {
            customerMap.set(customerId, {
                id: customerId,
                name: customerName,
                email: customerEmail,
                totalSpent: parseFloat(order.total_amount || 0),
                orderCount: 1,
                lastOrder: formatDate(order.created_at),
                lastOrderDate: new Date(order.created_at),
                avatar: getInitials(customerName)
            });
        }
    });
    
    // Convert to array and sort by total spent (descending)
    return Array.from(customerMap.values()).sort((a, b) => b.totalSpent - a.totalSpent);
}

function extractNameFromEmail(email) {
    if (!email || email === 'N/A') return 'Unknown Customer';
    const username = email.split('@')[0];
    return username
        .split(/[._-]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function getInitials(name) {
    if (!name || name === 'Unknown Customer') return 'UC';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

// ==================== UI RENDERING ====================

function displayCustomers(customers) {
    const tbody = document.querySelector('.custom-table tbody');
    
    if (!tbody) {
        console.error('Table body not found');
        return;
    }
    
    if (customers.length === 0) {
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
        return;
    }
    
    tbody.innerHTML = customers.map((customer, index) => `
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
    `).join('');
}

function getAvatarColor(index) {
    const colors = ['avatar-orange', 'avatar-blue', 'avatar-green', 'avatar-purple', 'avatar-pink'];
    return colors[index % colors.length];
}

// ==================== CUSTOMER ACTIONS ====================

function contactCustomer(email, name) {
    if (email === 'N/A') {
        showNotification('Email not available for this customer', 'warning');
        return;
    }
    
    // Create mailto link
    const subject = encodeURIComponent(`Message from anko Store`);
    const body = encodeURIComponent(`Hello ${name},\n\n`);
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    
    showNotification(`Opening email client to contact ${name}`, 'success');
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
    const tbody = document.querySelector('.custom-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr>
            <td colspan="5" class="text-center py-5">
                <div class="text-danger">
                    <i class="fa-solid fa-triangle-exclamation fa-3x mb-3"></i>
                    <p class="mb-2 fw-bold">${escapeHtml(message)}</p>
                    <small class="text-muted d-block mb-3">
                        Make sure you have seller access enabled for your account.
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
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// ==================== SEARCH FUNCTIONALITY ====================

function initializeSearch() {
    const searchInput = document.querySelector('.header-search input');
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase().trim();
            filterCustomers(searchTerm);
        });
    }
}

function filterCustomers(searchTerm) {
    const rows = document.querySelectorAll('.custom-table tbody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 Customer page initializing...');
    
    // Check authentication
    if (!isAuthenticated()) {
        console.log('❌ Not authenticated, redirecting to login');
        redirectToLogin();
        return;
    }
    
    // Initialize page
    fetchCustomerData();
    initializeSearch();
    
    console.log('✅ Customer page initialized');
});

// Make contactCustomer available globally
window.contactCustomer = contactCustomer;