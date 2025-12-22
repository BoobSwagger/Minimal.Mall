// API Configuration
const API_BASE_URL = 'https://minimallbackend.onrender.com/api';

// Get token from localStorage
function getAuthToken() {
    return localStorage.getItem('authToken');
}

// Get user data from localStorage
function getUserData() {
    const userData = localStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
}

// Check if user is authenticated
function checkAuth() {
    const token = getAuthToken();
    if (!token) {
        window.location.href = '../logIn Pages/signin.html';
        return false;
    }
    return true;
}

// Fetch with auth header
async function fetchWithAuth(url, options = {}) {
    const token = getAuthToken();
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };
    
    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    
    try {
        const response = await fetch(url, mergedOptions);
        
        if (response.status === 401) {
            // Unauthorized - redirect to login
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            window.location.href = '../logIn Pages/signin.html';
            return null;
        }
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'Request failed');
        }
        
        return data;
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

// Load seller profile info
async function loadSellerProfile() {
    try {
        const profile = await fetchWithAuth(`${API_BASE_URL}/seller/profile`);
        
        if (profile) {
            // Update seller name in sidebar
            const sellerNameElement = document.querySelector('.seller-profile-mini h5');
            if (sellerNameElement && profile.store_name) {
                sellerNameElement.textContent = profile.store_name;
            }
            
            // Store seller data for later use
            localStorage.setItem('sellerData', JSON.stringify(profile));
            
            return profile;
        }
    } catch (error) {
        console.error('Error loading seller profile:', error);
        
        // Check if user is not a seller or profile not found
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('not a seller') || 
            errorMessage.includes('seller profile not found') ||
            errorMessage.includes('not found')) {
            // Check application status and handle accordingly
            await checkApplicationStatusAndRedirect();
        } else {
            showError('Failed to load seller profile');
        }
        
        throw error;
    }
}

// Check seller application status and redirect appropriately
async function checkApplicationStatusAndRedirect() {
    try {
        const applicationStatus = await fetchWithAuth(`${API_BASE_URL}/seller/application/status`);
        
        if (applicationStatus) {
            if (applicationStatus.status === 'pending') {
                alert('Your seller application is still under review. Please check back later.');
                window.location.href = '../customer Pages/profile.html';
            } else if (applicationStatus.status === 'rejected') {
                alert('Your seller application was rejected. Please apply again from your profile page.');
                window.location.href = '../customer Pages/profile.html';
            } else if (applicationStatus.status === 'approved') {
                // Application approved but profile not created - try to create it
                console.log('Application approved, creating seller profile...');
                showSuccess('Creating your seller profile...');
                
                try {
                    const createResult = await fetchWithAuth(
                        `${API_BASE_URL}/seller/profile/create`,
                        { method: 'POST' }
                    );
                    
                    if (createResult) {
                        showSuccess('Seller profile created successfully! Refreshing dashboard...');
                        
                        // Store the new seller data
                        localStorage.setItem('sellerData', JSON.stringify(createResult));
                        
                        // Reload the page after a short delay
                        setTimeout(() => {
                            window.location.reload();
                        }, 1500);
                        
                        return; // Exit to prevent further redirects
                    }
                } catch (createError) {
                    console.error('Error creating seller profile:', createError);
                    showError('Failed to create seller profile. Please contact support.');
                    setTimeout(() => {
                        window.location.href = '../customer Pages/profile.html';
                    }, 2000);
                }
            }
        }
    } catch (error) {
        // No application found (404)
        console.log('No seller application found');
        alert('You need to apply as a seller first. Please go to your profile and click "Start Selling".');
        window.location.href = '../customer Pages/profile.html';
    }
}

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        const stats = await fetchWithAuth(`${API_BASE_URL}/profile/statistics`);
        
        if (stats) {
            // Update Total Revenue
            const revenueElement = document.querySelector('.icon-purple')?.closest('.stat-card')?.querySelector('h3');
            if (revenueElement) {
                revenueElement.textContent = formatCurrency(stats.total_spent || 0);
            }
            
            // Update Total Orders
            const ordersElement = document.querySelector('.icon-blue')?.closest('.stat-card')?.querySelector('h3');
            if (ordersElement) {
                ordersElement.textContent = stats.total_orders || 0;
            }
            
            // Update Products count
            const productsElement = document.querySelector('.icon-orange')?.closest('.stat-card')?.querySelector('h3');
            if (productsElement && stats.total_products) {
                productsElement.textContent = stats.total_products;
            }
            
            // Update Average Rating (if available in stats)
            const ratingElement = document.querySelector('.icon-green')?.closest('.stat-card')?.querySelector('h3');
            if (ratingElement && stats.average_rating) {
                ratingElement.textContent = stats.average_rating.toFixed(1);
            }
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        showError('Failed to load statistics');
    }
}

// Load recent transactions
async function loadRecentTransactions() {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/profile/transactions?limit=5`);
        
        if (response && response.transactions) {
            const tbody = document.querySelector('.custom-table tbody');
            
            if (tbody) {
                if (response.transactions.length === 0) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="6" class="text-center text-muted py-4">
                                <i class="fa-solid fa-box-open fa-2x mb-2 opacity-25"></i>
                                <p class="mb-0">No recent orders found</p>
                            </td>
                        </tr>
                    `;
                    return;
                }
                
                tbody.innerHTML = response.transactions.map(transaction => {
                    const statusClass = getStatusClass(transaction.status);
                    const orderId = transaction.order_id || transaction.transaction_id || 'N/A';
                    
                    return `
                        <tr>
                            <td>#${orderId}</td>
                            <td>${transaction.product_name || 'Product'}</td>
                            <td>${formatDate(transaction.purchased_date || transaction.created_at)}</td>
                            <td class="fw-bold">${formatCurrency(transaction.total_amount || transaction.amount || 0)}</td>
                            <td><span class="status-pill ${statusClass}">${capitalizeFirst(transaction.status)}</span></td>
                            <td>
                                <i class="fa-solid fa-ellipsis action-dots" 
                                   onclick="showOrderActions(${orderId})" 
                                   style="cursor: pointer;"></i>
                            </td>
                        </tr>
                    `;
                }).join('');
            }
        }
    } catch (error) {
        console.error('Error loading recent transactions:', error);
        showError('Failed to load recent orders');
        
        // Show empty state on error
        const tbody = document.querySelector('.custom-table tbody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted py-4">
                        <i class="fa-solid fa-exclamation-circle fa-2x mb-2 opacity-25"></i>
                        <p class="mb-0">Unable to load orders. Please try again.</p>
                    </td>
                </tr>
            `;
        }
    }
}

// Get status class based on transaction status
function getStatusClass(status) {
    const statusLower = status.toLowerCase();
    
    if (statusLower.includes('pending') || statusLower.includes('processing')) {
        return 'status-pending';
    } else if (statusLower.includes('shipped') || statusLower.includes('transit') || statusLower.includes('shipping')) {
        return 'status-shipped';
    } else if (statusLower.includes('delivered') || statusLower.includes('completed') || statusLower.includes('complete')) {
        return 'status-delivered';
    }
    
    return 'status-pending';
}

// Capitalize first letter
function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// Show order actions (placeholder)
function showOrderActions(orderId) {
    console.log('Show actions for order:', orderId);
    
    const actions = [
        'View Details',
        'Update Status',
        'Contact Customer',
        'Print Invoice'
    ];
    
    alert(`Actions for Order #${orderId}\n\n${actions.map((a, i) => `${i + 1}. ${a}`).join('\n')}`);
}

// Show error message
function showError(message) {
    console.error(message);
    
    // Create a simple toast notification
    const toast = document.createElement('div');
    toast.className = 'alert alert-danger position-fixed top-0 start-50 translate-middle-x mt-3';
    toast.style.zIndex = '9999';
    toast.innerHTML = `
        <i class="fa-solid fa-exclamation-circle me-2"></i>
        ${message}
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

// Show success message
function showSuccess(message) {
    console.log(message);
    
    // Create a simple toast notification
    const toast = document.createElement('div');
    toast.className = 'alert alert-success position-fixed top-0 start-50 translate-middle-x mt-3';
    toast.style.zIndex = '9999';
    toast.innerHTML = `
        <i class="fa-solid fa-check-circle me-2"></i>
        ${message}
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Update current date display
function updateCurrentDate() {
    const dateElement = document.querySelector('.text-muted.small.fw-bold');
    if (dateElement) {
        const currentDate = new Date();
        const formattedDate = currentDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        dateElement.innerHTML = `<i class="fa-regular fa-calendar me-2"></i> ${formattedDate}`;
    }
}

// Update user greeting
function updateUserGreeting() {
    const user = getUserData();
    if (user && user.full_name) {
        const greetingElement = document.querySelector('.dashboard-card h1');
        if (greetingElement) {
            const hour = new Date().getHours();
            let greeting = 'Good Morning';
            if (hour >= 12 && hour < 18) greeting = 'Good Afternoon';
            else if (hour >= 18) greeting = 'Good Evening';
            
            // Optional: Customize the greeting
            // greetingElement.textContent = `${greeting}, ${user.full_name}!`;
        }
    }
}

// Initialize dashboard
async function initDashboard() {
    // Check authentication
    if (!checkAuth()) {
        return;
    }
    
    // Show loading state
    const mainCard = document.querySelector('.dashboard-card');
    if (mainCard) {
        mainCard.style.opacity = '0.7';
    }
    
    // Update current date
    updateCurrentDate();
    
    // Update user greeting
    updateUserGreeting();
    
    // Load all dashboard data
    try {
        await Promise.all([
            loadSellerProfile(),
            loadDashboardStats(),
            loadRecentTransactions()
        ]);
        
        // Remove loading state
        if (mainCard) {
            mainCard.style.opacity = '1';
        }
        
        showSuccess('Dashboard loaded successfully!');
        
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        
        // Only show error if it's not a redirect scenario
        if (!error.message.includes('not a seller') && 
            !error.message.includes('not found')) {
            showError('Failed to load dashboard data');
        }
        
        // Remove loading state
        if (mainCard) {
            mainCard.style.opacity = '1';
        }
    }
}

// Logout function
function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('sellerData');
    window.location.href = '../logIn Pages/signin.html';
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initDashboard);

// Refresh data every 5 minutes
setInterval(() => {
    loadDashboardStats();
    loadRecentTransactions();
}, 300000);

// Make functions available globally
window.showOrderActions = showOrderActions;
window.logout = logout;