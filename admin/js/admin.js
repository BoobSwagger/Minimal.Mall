// API Configuration
const API_BASE_URL = 'https://minimallbackend.onrender.com/api';
let currentApplicationId = null;

// Get auth token - FIXED: Match auth.js token key
function getAuthToken() {
    return sessionStorage.getItem('authToken');
}

// Get user data
function getUserData() {
    const userData = sessionStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
}

// Verify admin access
function verifyAdminAccess() {
    const token = getAuthToken();
    const user = getUserData();
    
    if (!token) {
        console.error('No authentication token found');
        window.location.href = '../logIn Pages/signin.html';
        return false;
    }
    
    if (!user || user.role !== 'admin') {
        console.error('Access denied: Admin privileges required');
        alert('Access denied. Admin privileges required.');
        logout();
        return false;
    }
    
    return true;
}

// API Request Helper
async function apiRequest(endpoint, options = {}) {
    const token = getAuthToken();
    
    if (!token) {
        window.location.href = '../logIn Pages/admin-login.html';
        return;
    }
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...defaultOptions,
            ...options,
            headers: { ...defaultOptions.headers, ...options.headers }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                sessionStorage.removeItem('authToken');
                sessionStorage.removeItem('userData');
                window.location.href = '../logIn Pages/admin-login.html';
                return;
            }
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }
        
        return response.json();
    } catch (error) {
        console.error('API Request Error:', error);
        throw error;
    }
}

// Navigation
function initNavigation() {
    document.querySelectorAll('.sidebar-nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Update active state
            document.querySelectorAll('.sidebar-nav a').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            // Show selected section
            const section = link.dataset.section;
            document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
            document.getElementById(`${section}-section`).style.display = 'block';
            
            // Load section data
            loadSectionData(section);
        });
    });
}

function loadSectionData(section) {
    switch(section) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'orders':
            loadOrders();
            break;
        case 'products':
            loadProducts();
            break;
        case 'users':
            loadUsers();
            break;
        case 'sellers':
            loadSellerApplications();
            break;
        case 'analytics':
            loadAnalytics();
            break;
    }
}

// Dashboard
async function loadDashboard() {
    showLoading();
    try {
        const stats = await apiRequest('/admin/dashboard/stats');
        renderDashboardStats(stats);
        
        // Load recent data
        const orders = await apiRequest('/admin/orders?limit=5');
        renderRecentOrders(orders.orders || []);
        
        const applications = await apiRequest('/admin/seller-applications?status=pending');
        renderPendingApplications(applications || []);
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showError('Failed to load dashboard data: ' + error.message);
    } finally {
        hideLoading();
    }
}

function renderDashboardStats(stats) {
    const statsConfig = [
        { title: 'Total Revenue', value: `₱${(stats.total_revenue || 0).toFixed(2)}`, icon: 'fa-dollar-sign', color: 'success' },
        { title: 'Total Orders', value: stats.total_orders || 0, icon: 'fa-shopping-cart', color: 'primary' },
        { title: 'Total Users', value: stats.total_users || 0, icon: 'fa-users', color: 'info' },
        { title: 'Total Products', value: stats.total_products || 0, icon: 'fa-box', color: 'warning' },
        { title: 'Pending Orders', value: stats.pending_orders || 0, icon: 'fa-clock', color: 'danger' },
        { title: 'Active Sellers', value: stats.active_sellers || 0, icon: 'fa-store', color: 'success' },
        { title: "Today's Orders", value: stats.today_orders || 0, icon: 'fa-calendar-day', color: 'primary' },
        { title: "Today's Revenue", value: `₱${(stats.today_revenue || 0).toFixed(2)}`, icon: 'fa-money-bill-wave', color: 'success' }
    ];
    
    const container = document.getElementById('stats-container');
    container.innerHTML = statsConfig.map(stat => `
        <div class="col-md-3">
            <div class="stat-card">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <p class="text-muted mb-1">${stat.title}</p>
                        <h3 class="mb-0">${stat.value}</h3>
                    </div>
                    <div class="stat-icon bg-${stat.color} bg-opacity-10 text-${stat.color}">
                        <i class="fas ${stat.icon}"></i>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function renderRecentOrders(orders) {
    const container = document.getElementById('recent-orders');
    if (!orders || orders.length === 0) {
        container.innerHTML = '<p class="text-muted">No recent orders</p>';
        return;
    }
    
    container.innerHTML = `
        <div class="table-responsive">
            <table class="table table-sm">
                <thead>
                    <tr>
                        <th>Order #</th>
                        <th>Customer</th>
                        <th>Total</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${orders.map(order => `
                        <tr>
                            <td>${order.order_number}</td>
                            <td>${order.full_name || 'N/A'}</td>
                            <td>₱${(order.total || 0).toFixed(2)}</td>
                            <td><span class="badge-status bg-${getStatusColor(order.status)}">${order.status}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderPendingApplications(applications) {
    const container = document.getElementById('pending-applications');
    if (!applications || applications.length === 0) {
        container.innerHTML = '<p class="text-muted">No pending applications</p>';
        return;
    }
    
    container.innerHTML = `
        <div class="table-responsive">
            <table class="table table-sm">
                <thead>
                    <tr>
                        <th>Store Name</th>
                        <th>Applicant</th>
                        <th>Type</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${applications.slice(0, 5).map(app => `
                        <tr>
                            <td>${app.store_name}</td>
                            <td>${app.full_name}</td>
                            <td>${app.business_type}</td>
                            <td>
                                <button class="btn btn-sm btn-primary" onclick="openReviewModal(${app.id})">
                                    Review
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Orders
async function loadOrders(page = 1) {
    showLoading();
    try {
        const status = document.getElementById('order-status-filter')?.value || '';
        const search = document.getElementById('order-search')?.value || '';
        
        let url = `/admin/orders?page=${page}&limit=20`;
        if (status) url += `&status=${status}`;
        if (search) url += `&search=${search}`;
        
        const data = await apiRequest(url);
        renderOrdersTable(data);
    } catch (error) {
        console.error('Error loading orders:', error);
        showError('Failed to load orders: ' + error.message);
    } finally {
        hideLoading();
    }
}

function renderOrdersTable(data) {
    const container = document.getElementById('orders-table');
    
    if (!data.orders || data.orders.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">No orders found</p>';
        return;
    }
    
    container.innerHTML = `
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th>Order #</th>
                        <th>Customer</th>
                        <th>Date</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Payment</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.orders.map(order => `
                        <tr>
                            <td><strong>${order.order_number}</strong></td>
                            <td>${order.full_name || 'N/A'}</td>
                            <td>${new Date(order.created_at).toLocaleDateString()}</td>
                            <td>₱${(order.total || 0).toFixed(2)}</td>
                            <td><span class="badge-status bg-${getStatusColor(order.status)}">${order.status}</span></td>
                            <td><span class="badge-status bg-${getStatusColor(order.payment_status)}">${order.payment_status}</span></td>
                            <td>
                                <button class="btn btn-sm btn-info" onclick="viewOrderDetails(${order.id})">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn btn-sm btn-primary" onclick="updateOrderStatus(${order.id}, '${order.status}')">
                                    <i class="fas fa-edit"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ${renderPagination(data)}
    `;
}

// FIXED: Added missing updateOrderStatus function
async function updateOrderStatus(orderId, currentStatus) {
    const statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    const statusOptions = statuses.map(s => 
        `<option value="${s}" ${s === currentStatus ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`
    ).join('');
    
    const newStatus = prompt(`Update order status:\n\nCurrent: ${currentStatus}\n\nEnter new status (${statuses.join(', ')}):`, currentStatus);
    
    if (!newStatus || newStatus === currentStatus) return;
    
    if (!statuses.includes(newStatus.toLowerCase())) {
        showError('Invalid status. Please choose from: ' + statuses.join(', '));
        return;
    }
    
    try {
        await apiRequest(`/admin/orders/${orderId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status: newStatus.toLowerCase() })
        });
        showSuccess('Order status updated successfully');
        loadOrders();
    } catch (error) {
        console.error('Error updating order status:', error);
        showError('Failed to update order status: ' + error.message);
    }
}

async function viewOrderDetails(orderId) {
    try {
        const order = await apiRequest(`/admin/orders/${orderId}`);
        
        const content = `
            <div class="row">
                <div class="col-md-6">
                    <h6>Customer Information</h6>
                    <p><strong>Name:</strong> ${order.customer_name || 'N/A'}</p>
                    <p><strong>Email:</strong> ${order.email || 'N/A'}</p>
                    <p><strong>Phone:</strong> ${order.customer_phone || 'N/A'}</p>
                </div>
                <div class="col-md-6">
                    <h6>Order Information</h6>
                    <p><strong>Order #:</strong> ${order.order_number}</p>
                    <p><strong>Date:</strong> ${new Date(order.created_at).toLocaleString()}</p>
                    <p><strong>Status:</strong> <span class="badge-status bg-${getStatusColor(order.status)}">${order.status}</span></p>
                </div>
            </div>
            
            <hr>
            
            <h6>Shipping Address</h6>
            <p>${order.shipping_address_line1 || ''}<br>
            ${order.shipping_city || ''}, ${order.shipping_state || ''} ${order.shipping_postal_code || ''}</p>
            
            <hr>
            
            <h6>Order Items</h6>
            <table class="table table-sm">
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>Quantity</th>
                        <th>Price</th>
                        <th>Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    ${(order.items || []).map(item => `
                        <tr>
                            <td>${item.product_name}</td>
                            <td>${item.quantity}</td>
                            <td>₱${(item.price || 0).toFixed(2)}</td>
                            <td>₱${(item.subtotal || 0).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="text-end">
                <p><strong>Subtotal:</strong> ₱${(order.subtotal || 0).toFixed(2)}</p>
                <p><strong>Shipping:</strong> ₱${(order.shipping_fee || 0).toFixed(2)}</p>
                <p><strong>Tax:</strong> ₱${(order.tax || 0).toFixed(2)}</p>
                <h5><strong>Total:</strong> ₱${(order.total || 0).toFixed(2)}</h5>
            </div>
        `;
        
        document.getElementById('order-detail-content').innerHTML = content;
        new bootstrap.Modal(document.getElementById('orderDetailModal')).show();
    } catch (error) {
        console.error('Error loading order details:', error);
        showError('Failed to load order details: ' + error.message);
    }
}

// Products
async function loadProducts(page = 1) {
    showLoading();
    try {
        const search = document.getElementById('product-search')?.value || '';
        
        let url = `/admin/products?page=${page}&limit=20`;
        if (search) url += `&search=${search}`;
        
        const data = await apiRequest(url);
        renderProductsTable(data);
    } catch (error) {
        console.error('Error loading products:', error);
        showError('Failed to load products: ' + error.message);
    } finally {
        hideLoading();
    }
}

function renderProductsTable(data) {
    const container = document.getElementById('products-table');
    
    if (!data.products || data.products.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">No products found</p>';
        return;
    }
    
    container.innerHTML = `
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th>Image</th>
                        <th>Product</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Stock</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.products.map(product => `
                        <tr>
                            <td><img src="${product.image_url || 'placeholder.jpg'}" alt="${product.name}" style="width: 50px; height: 50px; object-fit: cover;"></td>
                            <td><strong>${product.name}</strong></td>
                            <td>${product.category_name || 'N/A'}</td>
                            <td>₱${(product.price || 0).toFixed(2)}</td>
                            <td>${product.quantity_in_stock || 0}</td>
                            <td>
                                <span class="badge-status bg-${product.is_active ? 'success' : 'danger'}">
                                    ${product.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </td>
                            <td>
                                <button class="btn btn-sm btn-${product.is_active ? 'warning' : 'success'}" 
                                        onclick="toggleProductStatus(${product.id}, ${!product.is_active})">
                                    <i class="fas fa-${product.is_active ? 'ban' : 'check'}"></i>
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="deleteProduct(${product.id})">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ${renderPagination(data)}
    `;
}

async function toggleProductStatus(productId, isActive) {
    if (!confirm(`Are you sure you want to ${isActive ? 'activate' : 'deactivate'} this product?`)) return;
    
    try {
        await apiRequest(`/admin/products/${productId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ is_active: isActive })
        });
        showSuccess('Product status updated successfully');
        loadProducts();
    } catch (error) {
        console.error('Error updating product:', error);
        showError('Failed to update product status: ' + error.message);
    }
}

async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) return;
    
    try {
        await apiRequest(`/admin/products/${productId}`, { method: 'DELETE' });
        showSuccess('Product deleted successfully');
        loadProducts();
    } catch (error) {
        console.error('Error deleting product:', error);
        showError('Failed to delete product: ' + error.message);
    }
}

// Users
async function loadUsers(page = 1) {
    showLoading();
    try {
        const role = document.getElementById('user-role-filter')?.value || '';
        const search = document.getElementById('user-search')?.value || '';
        
        let url = `/admin/users?page=${page}&limit=20`;
        if (role) url += `&role=${role}`;
        if (search) url += `&search=${search}`;
        
        const data = await apiRequest(url);
        renderUsersTable(data);
    } catch (error) {
        console.error('Error loading users:', error);
        showError('Failed to load users: ' + error.message);
    } finally {
        hideLoading();
    }
}

function renderUsersTable(data) {
    const container = document.getElementById('users-table');
    
    if (!data.users || data.users.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">No users found</p>';
        return;
    }
    
    container.innerHTML = `
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Joined</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.users.map(user => `
                        <tr>
                            <td><strong>${user.full_name}</strong></td>
                            <td>${user.email}</td>
                            <td><span class="badge-status bg-info">${user.role}</span></td>
                            <td>${new Date(user.created_at).toLocaleDateString()}</td>
                            <td>
                                <span class="badge-status bg-${user.is_active ? 'success' : 'danger'}">
                                    ${user.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </td>
                            <td>
                                <button class="btn btn-sm btn-${user.is_active ? 'warning' : 'success'}" 
                                        onclick="toggleUserStatus(${user.id}, ${!user.is_active})">
                                    ${user.is_active ? 'Deactivate' : 'Activate'}
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ${renderPagination(data)}
    `;
}

async function toggleUserStatus(userId, isActive) {
    if (!confirm(`Are you sure you want to ${isActive ? 'activate' : 'deactivate'} this user?`)) return;
    
    try {
        await apiRequest(`/admin/users/${userId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ is_active: isActive })
        });
        showSuccess('User status updated successfully');
        loadUsers();
    } catch (error) {
        console.error('Error updating user:', error);
        showError('Failed to update user status: ' + error.message);
    }
}

// Seller Applications
async function loadSellerApplications() {
    showLoading();
    try {
        const status = document.getElementById('application-status-filter')?.value || '';
        let url = '/admin/seller-applications';
        if (status) url += `?status=${status}`;
        
        const applications = await apiRequest(url);
        renderApplicationsTable(applications);
    } catch (error) {
        console.error('Error loading applications:', error);
        showError('Failed to load seller applications: ' + error.message);
    } finally {
        hideLoading();
    }
}

function renderApplicationsTable(applications) {
    const container = document.getElementById('applications-table');
    
    if (!applications || applications.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">No applications found</p>';
        return;
    }
    
    container.innerHTML = `
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th>Store Name</th>
                        <th>Applicant</th>
                        <th>Email</th>
                        <th>Type</th>
                        <th>Applied Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${applications.map(app => `
                        <tr>
                            <td><strong>${app.store_name}</strong></td>
                            <td>${app.full_name}</td>
                            <td>${app.email}</td>
                            <td>${app.business_type}</td>
                            <td>${new Date(app.applied_at).toLocaleDateString()}</td>
                            <td><span class="badge-status bg-${getStatusColor(app.status)}">${app.status}</span></td>
                            <td>
                                ${app.status === 'pending' ? `
                                    <button class="btn btn-sm btn-primary" onclick="openReviewModal(${app.id})">
                                        Review
                                    </button>
                                ` : '-'}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function openReviewModal(applicationId) {
    currentApplicationId = applicationId;
    const modal = new bootstrap.Modal(document.getElementById('reviewModal'));
    modal.show();
    
    // Reset rejection reason
    document.getElementById('rejection-reason').style.display = 'none';
    document.getElementById('rejection-text').value = '';
}

async function reviewApplication(status) {
    if (!currentApplicationId) return;
    
    const rejectionReason = status === 'rejected' ? document.getElementById('rejection-text').value : null;
    
    if (status === 'rejected' && !rejectionReason) {
        showError('Please provide a rejection reason');
        return;
    }
    
    try {
        await apiRequest(`/admin/seller-applications/${currentApplicationId}`, {
            method: 'PUT',
            body: JSON.stringify({ status, rejection_reason: rejectionReason })
        });
        
        showSuccess(`Application ${status} successfully`);
        bootstrap.Modal.getInstance(document.getElementById('reviewModal')).hide();
        loadSellerApplications();
    } catch (error) {
        console.error('Error reviewing application:', error);
        showError('Failed to review application: ' + error.message);
    }
}

// Analytics
async function loadAnalytics() {
    showLoading();
    try {
        const [topProducts, topSellers] = await Promise.all([
            apiRequest('/admin/analytics/top-products?limit=10'),
            apiRequest('/admin/analytics/top-sellers?limit=10')
        ]);
        
        renderTopProducts(topProducts);
        renderTopSellers(topSellers);
    } catch (error) {
        console.error('Error loading analytics:', error);
        showError('Failed to load analytics: ' + error.message);
    } finally {
        hideLoading();
    }
}

function renderTopProducts(products) {
    const container = document.getElementById('top-products');
    
    container.innerHTML = `
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>Orders</th>
                        <th>Sold</th>
                        <th>Revenue</th>
                    </tr>
                </thead>
                <tbody>
                    ${products.map((product, index) => `
                        <tr>
                            <td>${index + 1}. ${product.name}</td>
                            <td>${product.order_count}</td>
                            <td>${product.total_sold}</td>
                            <td>₱${parseFloat(product.revenue || 0).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderTopSellers(sellers) {
    const container = document.getElementById('top-sellers');
    
    container.innerHTML = `
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th>Store</th>
                        <th>Owner</th>
                        <th>Orders</th>
                        <th>Revenue</th>
                    </tr>
                </thead>
                <tbody>
                    ${sellers.map((seller, index) => `
                        <tr>
                            <td>${index + 1}. ${seller.store_name}</td>
                            <td>${seller.full_name}</td>
                            <td>${seller.order_count}</td>
                            <td>₱${parseFloat(seller.revenue || 0).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Utility Functions
function renderPagination(data) {
    if (!data.total_pages || data.total_pages <= 1) return '';
    
    let pages = '';
    for (let i = 1; i <= data.total_pages; i++) {
        pages += `
            <li class="page-item ${i === data.page ? 'active' : ''}">
                <a class="page-link" href="#" onclick="handlePagination(${i}); return false;">${i}</a>
            </li>
        `;
    }
    
    return `
        <nav>
            <ul class="pagination justify-content-center">
                <li class="page-item ${data.page === 1 ? 'disabled' : ''}">
                    <a class="page-link" href="#" onclick="handlePagination(${data.page - 1}); return false;">Previous</a>
                </li>
                ${pages}
                <li class="page-item ${data.page === data.total_pages ? 'disabled' : ''}">
                    <a class="page-link" href="#" onclick="handlePagination(${data.page + 1}); return false;">Next</a>
                </li>
            </ul>
        </nav>
    `;
}

function handlePagination(page) {
    const activeSection = document.querySelector('.sidebar-nav a.active')?.dataset.section;
    
    switch(activeSection) {
        case 'orders':
            loadOrders(page);
            break;
        case 'products':
            loadProducts(page);
            break;
        case 'users':
            loadUsers(page);
            break;
    }
}

function getStatusColor(status) {
    const colors = {
        pending: 'warning',
        processing: 'info',
        shipped: 'primary',
        delivered: 'success',
        cancelled: 'danger',
        paid: 'success',
        failed: 'danger',
        approved: 'success',
        rejected: 'danger'
    };
    return colors[status] || 'secondary';
}

function showLoading() {
    const loader = document.getElementById('loading');
    if (loader) loader.classList.add('active');
}

function hideLoading() {
    const loader = document.getElementById('loading');
    if (loader) loader.classList.remove('active');
}

function showSuccess(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
    alertDiv.style.zIndex = '9999';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 3000);
}

function showError(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
    alertDiv.style.zIndex = '9999';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 5000);
}

// Logout function
function logout() {
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userData');
    window.location.href = '../logIn Pages/admin-login.html';
}

// FIXED: Added event listeners for filters and search
function initFiltersAndSearch() {
    // Order filters
    const orderStatusFilter = document.getElementById('order-status-filter');
    const orderSearch = document.getElementById('order-search');
    
    if (orderStatusFilter) {
        orderStatusFilter.addEventListener('change', () => loadOrders());
    }
    
    if (orderSearch) {
        let searchTimeout;
        orderSearch.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => loadOrders(), 500);
        });
    }
    
    // Product search
    const productSearch = document.getElementById('product-search');
    if (productSearch) {
        let searchTimeout;
        productSearch.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => loadProducts(), 500);
        });
    }
    
    // User filters
    const userRoleFilter = document.getElementById('user-role-filter');
    const userSearch = document.getElementById('user-search');
    
    if (userRoleFilter) {
        userRoleFilter.addEventListener('change', () => loadUsers());
    }
    
    if (userSearch) {
        let searchTimeout;
        userSearch.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => loadUsers(), 500);
        });
    }
    
    // Application status filter
    const appStatusFilter = document.getElementById('application-status-filter');
    if (appStatusFilter) {
        appStatusFilter.addEventListener('change', () => loadSellerApplications());
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // FIXED: Verify admin access before proceeding
    if (!verifyAdminAccess()) {
        return;
    }
    
    // Display admin info
    const user = getUserData();
    if (user) {
        const adminNameEl = document.getElementById('admin-name');
        if (adminNameEl) {
            adminNameEl.textContent = user.full_name || 'Admin';
        }
    }
    
    // Initialize navigation
    initNavigation();
    
    // Initialize filters and search
    initFiltersAndSearch();
    
    // FIXED: Setup logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Are you sure you want to log out?')) {
                logout();
            }
        });
    }
    
    // Setup review modal buttons
    const approveBtn = document.getElementById('approve-btn');
    const rejectBtn = document.getElementById('reject-btn');
    
    if (approveBtn) {
        approveBtn.addEventListener('click', () => reviewApplication('approved'));
    }
    
    if (rejectBtn) {
        rejectBtn.addEventListener('click', () => {
            const rejectionReasonDiv = document.getElementById('rejection-reason');
            if (rejectionReasonDiv) {
                rejectionReasonDiv.style.display = 'block';
            }
            reviewApplication('rejected');
        });
    }
    
    // Load initial dashboard
    loadDashboard();
});