// seller_order.js - Order Management for Sellers with Status Update
const API_BASE_URL = 'https://minimallbackend.onrender.com/api';
let currentPage = 1;
let currentStatus = 'all';
let currentDateRange = 'all';
let searchTerm = '';
let orders = [];

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initializeFilters();
    initializeSearch();
    loadOrders();
    loadOrderStats();
});

// Check authentication
function checkAuth() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = '../logIn Pages/signin.html';
        return;
    }
}

// Get auth headers
function getAuthHeaders() {
    return {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json'
    };
}

// Initialize filters
function initializeFilters() {
    const statusSelect = document.querySelector('.filters-row select:first-child');
    const dateSelect = document.querySelector('.filters-row select:last-child');

    if (!statusSelect || !dateSelect) {
        console.warn('Filter elements not found');
        return;
    }

    statusSelect.innerHTML = `
        <option value="all">All Status</option>
        <option value="pending">Pending</option>
        <option value="processing">Processing</option>
        <option value="shipped">Shipped</option>
        <option value="delivered">Delivered</option>
        <option value="cancelled">Cancelled</option>
    `;

    dateSelect.innerHTML = `
        <option value="all">All Time</option>
        <option value="today">Today</option>
        <option value="this_week">This Week</option>
        <option value="this_month">This Month</option>
        <option value="last_week">Last Week</option>
    `;

    statusSelect.addEventListener('change', (e) => {
        currentStatus = e.target.value;
        currentPage = 1;
        loadOrders();
    });

    dateSelect.addEventListener('change', (e) => {
        currentDateRange = e.target.value;
        currentPage = 1;
        loadOrders();
    });
}

// Initialize search
function initializeSearch() {
    const searchInput = document.querySelector('.order-search-input');
    if (!searchInput) {
        console.warn('Search input not found');
        return;
    }

    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchTerm = e.target.value.trim();
            currentPage = 1;
            loadOrders();
        }, 500);
    });
}

// Load orders
async function loadOrders() {
    try {
        const params = new URLSearchParams({
            page: currentPage,
            limit: 10,
            status: currentStatus,
            date_range: currentDateRange,
            search: searchTerm
        });

        console.log('📦 Loading orders with params:', Object.fromEntries(params));
        
        const response = await fetch(`${API_BASE_URL}/seller/orders?${params}`, {
            headers: getAuthHeaders()
        });

        console.log('📡 Response status:', response.status);

        if (response.status === 401) {
            console.log('❌ Unauthorized - redirecting to login');
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            window.location.href = '../logIn Pages/signin.html';
            return;
        }

        if (response.status === 403) {
            console.error('❌ Forbidden - Not a seller');
            showError('You do not have seller access. Please contact support.');
            return;
        }

        if (response.status === 500) {
            console.error('❌ Server error - Database connection issue');
            showError('Server is temporarily unavailable. Please try again later.');
            renderOrders([]);
            return;
        }

        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ Error response:', errorData);
            throw new Error(errorData.detail || 'Failed to fetch orders');
        }

        const data = await response.json();
        console.log('✅ Full API Response:', data);
        
        if (data.success && data.orders) {
            orders = data.orders;
            console.log('📋 Orders array:', orders);
            
            renderOrders(data.orders);
            renderPagination(data.pagination);
            updateOrderBadge(data.stats);
        } else {
            console.warn('⚠️ Unexpected response format:', data);
            renderOrders([]);
        }

    } catch (error) {
        console.error('❌ Error loading orders:', error);
        showError(error.message || 'Failed to load orders. Please try again.');
    }
}

// Render orders table
function renderOrders(orders) {
    const tbody = document.querySelector('.custom-table tbody');
    
    if (!tbody) {
        console.error('Table body not found');
        return;
    }

    if (!orders || orders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-5">
                    <i class="fa-solid fa-inbox fs-1 text-muted mb-3"></i>
                    <p class="text-muted">No orders found</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = orders.map(order => {
        console.log('🔍 Processing order:', order);
        
        const orderId = order.id;
        const orderNumber = order.order_number || `#${orderId}`;
        const customerName = order.customer_name || 
                           order.shipping_full_name || 
                           order.customer_email || 
                           'N/A';
        const itemCount = order.item_count || order.total_items || 0;
        const totalAmount = order.seller_subtotal || 
                           order.total_amount || 
                           order.seller_payout || 0;
        const createdAt = order.created_at;
        const status = order.status;
        
        console.log(`Order ${orderId}: ${customerName}, ${itemCount} items, ₱${totalAmount}`);
        
        return `
            <tr>
                <td class="fw-bold">${escapeHtml(orderNumber)}</td>
                <td>${escapeHtml(customerName)}</td>
                <td>${itemCount} item${itemCount !== 1 ? 's' : ''}</td>
                <td class="fw-bold">₱${formatPeso(totalAmount)}</td>
                <td>${formatDate(createdAt)}</td>
                <td>${getStatusDropdown(orderId, status)}</td>
                <td>
                    <button class="btn-view" onclick="viewOrder(${orderId})" title="View Details">
                        <i class="fa-regular fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Get status dropdown instead of badge
function getStatusDropdown(orderId, currentStatus) {
    const statusOptions = [
        { value: 'pending', label: 'Pending', class: 'status-pending-orange' },
        { value: 'processing', label: 'Processing', class: 'status-pending-orange' },
        { value: 'shipped', label: 'Shipped', class: 'status-shipped-blue' },
        { value: 'delivered', label: 'Delivered', class: 'status-delivered-green' },
        { value: 'cancelled', label: 'Cancelled', class: 'status-cancelled-red' }
    ];

    const currentStatusObj = statusOptions.find(s => s.value === currentStatus) || statusOptions[0];

    return `
        <div class="status-dropdown-container">
            <select class="status-select ${currentStatusObj.class}" 
                    onchange="handleStatusChange(${orderId}, this)"
                    data-order-id="${orderId}"
                    data-original-status="${currentStatus}">
                ${statusOptions.map(option => `
                    <option value="${option.value}" 
                            ${option.value === currentStatus ? 'selected' : ''}
                            data-class="${option.class}">
                        ${option.label}
                    </option>
                `).join('')}
            </select>
        </div>
    `;
}

// Handle status change with proper validation
async function handleStatusChange(orderId, selectElement) {
    const newStatus = selectElement.value;
    const originalStatus = selectElement.getAttribute('data-original-status');
    
    // If status didn't change, do nothing
    if (newStatus === originalStatus) {
        return;
    }

    // Get confirmation based on status
    let confirmMessage = `Are you sure you want to change this order status to "${newStatus}"?`;
    let additionalData = {};

    // Special handling for shipped status
    if (newStatus === 'shipped') {
        const trackingNumber = prompt('Enter tracking number (optional):');
        if (trackingNumber === null) { // User cancelled the prompt
            selectElement.value = originalStatus;
            return;
        }
        if (trackingNumber && trackingNumber.trim()) {
            additionalData.tracking_number = trackingNumber.trim();
        }
        confirmMessage = 'Mark this order as shipped?';
    }

    // Special handling for cancelled status
    if (newStatus === 'cancelled') {
        confirmMessage = 'Are you sure you want to cancel this order? Inventory will be restored.';
        const reason = prompt('Reason for cancellation (optional):', 'Cancelled by seller');
        if (reason === null) { // User cancelled the prompt
            selectElement.value = originalStatus;
            return;
        }
        if (reason && reason.trim()) {
            additionalData.notes = reason.trim();
        }
    }

    // Show confirmation
    if (!confirm(confirmMessage)) {
        selectElement.value = originalStatus;
        return;
    }

    // Update the status
    await updateOrderStatus(orderId, newStatus, selectElement, additionalData);
}

// Update order status
async function updateOrderStatus(orderId, newStatus, selectElement, additionalData = {}) {
    const originalStatus = selectElement.getAttribute('data-original-status');
    
    // Show loading state
    selectElement.disabled = true;
    const loadingHTML = selectElement.parentElement.innerHTML;

    try {
        console.log(`🔄 Updating order ${orderId} to status: ${newStatus}`);
        
        const requestBody = {
            status: newStatus,
            ...additionalData
        };

        console.log('📤 Request body:', requestBody);

        const response = await fetch(`${API_BASE_URL}/seller/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify(requestBody)
        });

        console.log('📡 Response status:', response.status);

        if (response.status === 401) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            window.location.href = '../logIn Pages/signin.html';
            return;
        }

        if (response.status === 403) {
            throw new Error('You do not have permission to update this order');
        }

        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ Error response:', errorData);
            throw new Error(errorData.detail || errorData.message || 'Failed to update order status');
        }

        const data = await response.json();
        console.log('✅ Status updated successfully:', data);

        // Update the select class based on new status
        const statusClasses = {
            'pending': 'status-pending-orange',
            'processing': 'status-pending-orange',
            'shipped': 'status-shipped-blue',
            'delivered': 'status-delivered-green',
            'cancelled': 'status-cancelled-red'
        };

        selectElement.className = `status-select ${statusClasses[newStatus]}`;
        selectElement.setAttribute('data-original-status', newStatus);
        selectElement.disabled = false;

        showSuccess(data.message || `Order status updated to "${newStatus}"`);
        
        // Reload stats to update badge count
        await loadOrderStats();

        // If on a filtered view and status changed significantly, reload orders
        if (currentStatus !== 'all' && newStatus !== currentStatus) {
            setTimeout(() => loadOrders(), 1000);
        }

    } catch (error) {
        console.error('❌ Error updating status:', error);
        showError(error.message || 'Failed to update order status');
        
        // Restore original state
        selectElement.value = originalStatus;
        selectElement.disabled = false;
        
        // Update class back to original
        const statusClasses = {
            'pending': 'status-pending-orange',
            'processing': 'status-pending-orange',
            'shipped': 'status-shipped-blue',
            'delivered': 'status-delivered-green',
            'cancelled': 'status-cancelled-red'
        };
        selectElement.className = `status-select ${statusClasses[originalStatus]}`;
    }
}

// Format amount as Philippine Peso
function formatPeso(amount) {
    if (amount === null || amount === undefined) return '0.00';
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return numAmount.toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Get status badge HTML (kept for backward compatibility)
function getStatusBadge(status) {
    const statusClasses = {
        'pending': 'status-pending-orange',
        'processing': 'status-pending-orange',
        'shipped': 'status-shipped-blue',
        'delivered': 'status-delivered-green',
        'cancelled': 'status-cancelled-red'
    };

    const statusLabels = {
        'pending': 'Pending',
        'processing': 'Processing',
        'shipped': 'Shipped',
        'delivered': 'Delivered',
        'cancelled': 'Cancelled'
    };

    const cssClass = statusClasses[status] || 'status-pending-orange';
    const label = statusLabels[status] || status;

    return `<span class="status-pill ${cssClass}">${label}</span>`;
}

// Render pagination
function renderPagination(pagination) {
    const tableContainer = document.querySelector('.table-responsive');
    if (!tableContainer) {
        console.warn('Table container not found');
        return;
    }

    let paginationDiv = document.querySelector('.pagination-container');

    if (!paginationDiv) {
        paginationDiv = document.createElement('div');
        paginationDiv.className = 'pagination-container mt-4 d-flex justify-content-between align-items-center';
        tableContainer.after(paginationDiv);
    }

    if (!pagination || pagination.total_pages <= 1) {
        paginationDiv.innerHTML = '';
        return;
    }

    const startItem = (pagination.current_page - 1) * pagination.per_page + 1;
    const endItem = Math.min(pagination.current_page * pagination.per_page, pagination.total_items);

    paginationDiv.innerHTML = `
        <div class="text-muted small">
            Showing ${startItem}-${endItem} of ${pagination.total_items} orders
        </div>
        <div class="pagination-buttons">
            <button class="btn btn-sm btn-outline-secondary" 
                    onclick="changePage(${pagination.current_page - 1})"
                    ${pagination.current_page === 1 ? 'disabled' : ''}>
                <i class="fa-solid fa-chevron-left"></i> Previous
            </button>
            <span class="mx-3">Page ${pagination.current_page} of ${pagination.total_pages}</span>
            <button class="btn btn-sm btn-outline-secondary"
                    onclick="changePage(${pagination.current_page + 1})"
                    ${pagination.current_page === pagination.total_pages ? 'disabled' : ''}>
                Next <i class="fa-solid fa-chevron-right"></i>
            </button>
        </div>
    `;
}

// Change page
function changePage(page) {
    currentPage = page;
    loadOrders();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Load order statistics
async function loadOrderStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/seller/orders/stats/summary`, {
            headers: getAuthHeaders()
        });

        if (response.status === 401) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            window.location.href = '../logIn Pages/signin.html';
            return;
        }

        if (!response.ok) {
            throw new Error('Failed to fetch stats');
        }

        const data = await response.json();
        if (data.success && data.stats) {
            updateOrderBadge(data.stats);
        }

    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Update order badge count
function updateOrderBadge(stats) {
    const badge = document.querySelector('.dash-link.active .nav-badge');
    if (badge && stats) {
        const pendingCount = stats.pending_count || stats.pending || 0;
        badge.textContent = pendingCount;
        badge.style.display = pendingCount > 0 ? 'inline-block' : 'none';
    }
}

// View order details
function viewOrder(orderId) {
    window.location.href = `seller_order_details.html?id=${orderId}`;
}

// Format date
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return 'Today';
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else {
            const options = { month: 'short', day: 'numeric', year: 'numeric' };
            return date.toLocaleDateString('en-US', options);
        }
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'N/A';
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

// Show error message
function showError(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification error';
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #dc3545;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 10px;
        transform: translateX(400px);
        transition: transform 0.3s ease;
    `;
    toast.innerHTML = `
        <i class="fa-solid fa-circle-exclamation"></i>
        <span>${escapeHtml(message)}</span>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 100);

    setTimeout(() => {
        toast.style.transform = 'translateX(400px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Show success message
function showSuccess(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification success';
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 10px;
        transform: translateX(400px);
        transition: transform 0.3s ease;
    `;
    toast.innerHTML = `
        <i class="fa-solid fa-circle-check"></i>
        <span>${escapeHtml(message)}</span>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 100);

    setTimeout(() => {
        toast.style.transform = 'translateX(400px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}